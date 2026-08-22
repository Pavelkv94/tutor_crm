import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { endOfMonth, startOfMonth } from "date-fns";
import { Prisma } from "@/infrastructure/prisma/generated/client";
import { Currency } from "@/shared/enums/currency.enum";
import { LessonStatusEnum } from "@/modules/lesson/interface/dto/lesson-status.enum";
import { PaymentEntity } from "@/modules/balance/domain/payment.entity";
import { PaymentStatusEnum } from "@/modules/balance/domain/payment-status.enum";
import { BalanceRepositoryPort, CreatePaymentData, UpdatePaymentData } from "@/modules/balance/application/ports/balance.repository.port";
import { applyDiscount } from "@/shared/utils/discount.util";

/** Как поступить со строкой Payment в рамках операции. */
export type ReconcilePaymentRef =
	/** Деньги не двигаются — только разложить существующий баланс по занятиям (delta = 0). */
	| { kind: "none" }
	/** Новая денежная операция: ручная корректировка, возврат, opening balance. */
	| { kind: "create"; data: Omit<CreatePaymentData, "student_id" | "status"> }
	/** Существующий PENDING-счёт закрывается фактической оплатой. */
	| { kind: "settle"; paymentId: number; amount: number; patch?: UpdatePaymentData };

export type ReconcileInput = {
	studentId: number;
	/** Знаковое изменение баланса в целых единицах валюты. 0 — просто переразложить остаток. */
	delta: number;
	/** Валюта delta. Обязательна при delta ≠ 0. */
	currency: Currency | null;
	/** С какой даты закрывать занятия. По умолчанию — начало текущего месяца. */
	allocateFrom?: Date;
	/**
	 * Скидка, по которой закрывать занятия. По умолчанию берётся текущая скидка ученика.
	 * Оплата счёта передаёт сюда снимок со счёта: иначе изменение скидки между выставлением
	 * и оплатой развело бы сумму платежа с суммой списаний, и занятие осталось бы неоплаченным.
	 */
	discountPercent?: number;
	reason: string;
	payment: ReconcilePaymentRef;
	/** Разрешить балансу уйти в минус. Только для возвратов: деньги в Stripe уже отданы. */
	allowNegativeBalance?: boolean;
	/**
	 * Зачислить деньги на баланс, но не раскладывать их по занятиям. Нужно вызывающему,
	 * который в той же транзакции меняет условия аллокации (например, цены занятий) и сам
	 * вызовет reconcile после — иначе деньги легли бы по устаревшим ценам.
	 */
	skipAllocation?: boolean;
};

export type AllocationChange = {
	lesson_id: number;
	amount: number;
	new_status: LessonStatusEnum;
};

export type ReconcileOutcome = "APPLIED" | "CURRENCY_CONFLICT";

export type ReconcileResult = {
	outcome: ReconcileOutcome;
	balance: number;
	balance_currency: Currency | null;
	allocated: AllocationChange[];
	reverted: AllocationChange[];
	payment_id: number | null;
	/** Заполняется при CURRENCY_CONFLICT — для текста алерта админу. */
	conflict?: { balance: number; balance_currency: Currency; payment_currency: Currency };
};

const UNPAID_FOR_PAID: Record<string, LessonStatusEnum> = {
	[LessonStatusEnum.PENDING_PAID]: LessonStatusEnum.PENDING_UNPAID,
	[LessonStatusEnum.COMPLETED_PAID]: LessonStatusEnum.COMPLETED_UNPAID,
};

const PAID_FOR_UNPAID: Record<string, LessonStatusEnum> = {
	[LessonStatusEnum.PENDING_UNPAID]: LessonStatusEnum.PENDING_PAID,
	[LessonStatusEnum.COMPLETED_UNPAID]: LessonStatusEnum.COMPLETED_PAID,
};

/**
 * Единственная точка изменения баланса ученика и статусов оплаты занятий.
 *
 * Инварианты, которые обязаны выполняться после каждой операции:
 *  1. balance = Σ payment.amount (SUCCEEDED) − Σ lesson_payment.amount (reverted_at IS NULL)
 *  2. (balance = 0 ∧ balance_currency IS NULL) ∨ (balance ≠ 0 ∧ balance_currency IS NOT NULL)
 *  3. все активные аллокации ученика — в валюте balance_currency
 */
@Injectable()
export class BalanceService {
	private readonly logger = new Logger(BalanceService.name);

	constructor(private readonly balanceRepository: BalanceRepositoryPort) {}

	/**
	 * Выполняет операцию под advisory-локом ученика. Используется снаружи, когда изменение
	 * баланса нужно совершить атомарно вместе с записями в других таблицах (например,
	 * создать перенесённое занятие и сразу перенести на него аллокацию).
	 */
	async withStudentTransaction<T>(studentId: number, fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
		return this.balanceRepository.withStudentLock(studentId, fn);
	}

	async reconcile(input: ReconcileInput): Promise<ReconcileResult> {
		return this.balanceRepository.withStudentLock(input.studentId, (tx) => this.reconcileInTx(tx, input));
	}

	async reconcileInTx(tx: Prisma.TransactionClient, input: ReconcileInput): Promise<ReconcileResult> {
		const { studentId, delta, reason } = input;

		if (delta !== 0 && !input.currency) {
			throw new BadRequestException("Не указана валюта операции");
		}

		const student = await this.balanceRepository.getStudentForUpdate(tx, studentId);
		if (!student) {
			throw new NotFoundException("Студент не найден");
		}
		if (student.deleted_at) {
			throw new BadRequestException("Студент удален");
		}

		// Конфликт валют: на балансе лежит остаток в другой валюте. Деньги уже получены,
		// отказаться нельзя, но и смешивать валюты в одном числе тоже — откладываем до разбора.
		// Проверка касается только входящих денег: внутреннее перераспределение (kind: "none")
		// откладывать нельзя, иначе аллокация уже снята, а баланс не поднят — поедет инвариант.
		if (input.payment.kind !== "none" && student.balance !== 0 && input.currency && student.balance_currency && student.balance_currency !== input.currency) {
			return this.parkOnCurrencyConflict(tx, input, student.balance, student.balance_currency, input.currency);
		}

		const operationCurrency = input.currency ?? student.balance_currency;
		const payment = await this.persistPayment(tx, input);

		let available = student.balance + delta;
		const reverted: AllocationChange[] = [];
		const allocated: AllocationChange[] = [];

		if (available < 0) {
			available = await this.revertAllocations(tx, studentId, available, reverted);
			if (available < 0 && !input.allowNegativeBalance) {
				throw new BadRequestException(`Недостаточно средств: не хватает ${-available}`);
			}
			if (available < 0) {
				this.logger.error(`Баланс ученика ${studentId} ушёл в минус: ${available}. Причина: ${reason}`);
			}
		}

		if (available > 0 && operationCurrency && !input.skipAllocation) {
			available = await this.allocate(tx, {
				studentId,
				available,
				currency: operationCurrency,
				paymentId: payment?.id ?? null,
				from: input.allocateFrom ?? startOfMonth(new Date()),
				discountPercent: input.discountPercent ?? student.discount,
				allocated,
			});
		}

		const balanceCurrency = available === 0 ? null : operationCurrency;
		await this.balanceRepository.updateStudentBalance(tx, studentId, available, balanceCurrency);

		this.logger.log(
			`reconcile student=${studentId} reason=${reason} delta=${delta}${input.currency ?? ""} ` +
				`balance=${available}${balanceCurrency ?? ""} allocated=[${allocated.map((a) => `${a.lesson_id}:${a.amount}`).join(",")}] ` +
				`reverted=[${reverted.map((a) => `${a.lesson_id}:${a.amount}`).join(",")}]`,
		);

		return {
			outcome: "APPLIED",
			balance: available,
			balance_currency: balanceCurrency,
			allocated,
			reverted,
			payment_id: payment?.id ?? null,
		};
	}

	/** Активная (не откаченная) аллокация занятия — признак того, что занятие оплачено. */
	async getActiveAllocationInTx(tx: Prisma.TransactionClient, lessonId: number) {
		return this.balanceRepository.getActiveAllocationForLesson(tx, lessonId);
	}

	/**
	 * Переносит оплату с одного занятия на другое, не трогая баланс. Используется при переносе
	 * занятия: деньги остаются за учеником, просто «переезжают» на новую дату.
	 * Возвращает false, если у исходного занятия не было активной аллокации.
	 */
	async transferAllocationInTx(tx: Prisma.TransactionClient, studentId: number, fromLessonId: number, toLessonId: number): Promise<boolean> {
		const allocation = await this.balanceRepository.getActiveAllocationForLesson(tx, fromLessonId);
		if (!allocation) {
			return false;
		}

		await this.balanceRepository.transferAllocation(tx, {
			fromLessonPaymentId: allocation.lesson_payment_id,
			toLessonId,
			studentId,
			amount: allocation.amount,
			currency: allocation.currency,
			paymentId: null,
		});
		this.logger.log(`transferAllocation student=${studentId} ${fromLessonId} -> ${toLessonId} amount=${allocation.amount}${allocation.currency}`);
		return true;
	}

	/**
	 * Снимает оплату с занятия и возвращает деньги на баланс, после чего сразу пытается
	 * разложить их по другим неоплаченным занятиям.
	 *
	 * `redistribute = false` — деньги только возвращаются на баланс. Нужно, когда вызывающий
	 * в той же транзакции меняет цены занятий: разложить их сразу означало бы создать аллокацию
	 * по старой цене, которая после смены плана разошлась бы с новой.
	 */
	async releaseLessonInTx(
		tx: Prisma.TransactionClient,
		params: { studentId: number; lessonId: number; reason: string; revertLessonStatus?: boolean; redistribute?: boolean },
	): Promise<ReconcileResult | null> {
		const allocation = await this.balanceRepository.getActiveAllocationForLesson(tx, params.lessonId);
		if (!allocation) {
			return null;
		}

		await this.balanceRepository.revertAllocation(tx, allocation.lesson_payment_id);
		if (params.revertLessonStatus !== false) {
			const unpaidStatus = UNPAID_FOR_PAID[allocation.lesson_status];
			if (unpaidStatus) {
				await this.balanceRepository.setLessonStatus(tx, params.lessonId, unpaidStatus);
			}
		}

		this.logger.log(
			`releaseLesson student=${params.studentId} lesson=${params.lessonId} amount=${allocation.amount}${allocation.currency} reason=${params.reason}`,
		);

		// Аллокация уже снята, поэтому reconcile увидит освободившиеся деньги через сам баланс:
		// его нужно поднять на сумму снятой аллокации.
		return this.reconcileInTx(tx, {
			studentId: params.studentId,
			delta: allocation.amount,
			currency: allocation.currency,
			reason: params.reason,
			payment: { kind: "none" },
			skipAllocation: params.redistribute === false,
		});
	}

	/**
	 * Запрещает назначать занятие по плану в валюте, конфликтующей с деньгами ученика.
	 *
	 * Конфликтом считается:
	 *  - ненулевой остаток на балансе в другой валюте — это самое сильное ограничение,
	 *    оно действует в любом месяце;
	 *  - платные занятия того же календарного месяца в другой валюте, включая уже оплаченные.
	 *    Оплаченные учитываются намеренно: иначе после отмены такого занятия деньги вернулись бы
	 *    на баланс, и в одном месяце оказались бы две валюты.
	 *
	 * Прошлые месяцы не проверяются — они уже не биллятся, и исторические расхождения
	 * не должны блокировать работу с учеником.
	 */
	async assertLessonCurrencyAllowed(params: {
		studentId: number;
		planCurrency: Currency;
		lessonDate: Date;
		planPrice: number;
		isFree?: boolean;
		isTrial?: boolean;
	}): Promise<void> {
		if (params.planPrice <= 0 || params.isFree || params.isTrial) {
			return;
		}
		const monthStart = startOfMonth(params.lessonDate);
		if (monthStart < startOfMonth(new Date())) {
			return;
		}

		const student = await this.balanceRepository.getStudentSnapshot(params.studentId);
		if (!student) {
			throw new NotFoundException("Студент не найден");
		}

		if (student.balance !== 0 && student.balance_currency && student.balance_currency !== params.planCurrency) {
			throw new BadRequestException(
				`На балансе ученика ${student.balance} ${student.balance_currency} — нельзя назначить занятие по плану в ${params.planCurrency}. ` +
					`Сначала израсходуйте или скорректируйте остаток.`,
			);
		}

		const currencies = await this.balanceRepository.getBillableLessonCurrencies(params.studentId, monthStart, endOfMonth(params.lessonDate));
		const conflicting = currencies.filter((currency) => currency !== params.planCurrency);
		if (conflicting.length > 0) {
			throw new BadRequestException(
				`В этом месяце у ученика уже есть занятия в ${conflicting.join(", ")} — нельзя добавить занятие в ${params.planCurrency}. ` +
					`Смените планы существующих занятий или назначьте это занятие на следующий месяц.`,
			);
		}
	}

	/** Проверка инварианта №1. Используется тестами и диагностикой. */
	async assertInvariant(studentId: number): Promise<{ balance: number; expected: number; ok: boolean }> {
		const [payments, allocations] = await Promise.all([
			this.balanceRepository.sumSucceededPayments(studentId),
			this.balanceRepository.sumActiveAllocations(studentId),
		]);
		const expected = payments - allocations;
		const student = await this.balanceRepository.withStudentLock(studentId, (tx) => this.balanceRepository.getStudentForUpdate(tx, studentId));
		const balance = student?.balance ?? 0;
		return { balance, expected, ok: balance === expected };
	}

	private async persistPayment(tx: Prisma.TransactionClient, input: ReconcileInput): Promise<PaymentEntity | null> {
		if (input.payment.kind === "none") {
			return null;
		}
		if (input.payment.kind === "create") {
			return this.balanceRepository.createPayment(tx, {
				...input.payment.data,
				student_id: input.studentId,
				status: PaymentStatusEnum.SUCCEEDED,
			});
		}
		return this.balanceRepository.updatePayment(tx, input.payment.paymentId, {
			...input.payment.patch,
			amount: input.payment.amount,
			status: PaymentStatusEnum.SUCCEEDED,
		});
	}

	private async parkOnCurrencyConflict(
		tx: Prisma.TransactionClient,
		input: ReconcileInput,
		balance: number,
		balanceCurrency: Currency,
		paymentCurrency: Currency,
	): Promise<ReconcileResult> {
		let paymentId: number | null = null;

		if (input.payment.kind === "create") {
			const created = await this.balanceRepository.createPayment(tx, {
				...input.payment.data,
				student_id: input.studentId,
				status: PaymentStatusEnum.REQUIRES_ATTENTION,
			});
			paymentId = created.id;
		} else if (input.payment.kind === "settle") {
			await this.balanceRepository.updatePayment(tx, input.payment.paymentId, {
				...input.payment.patch,
				amount: input.payment.amount,
				status: PaymentStatusEnum.REQUIRES_ATTENTION,
			});
			paymentId = input.payment.paymentId;
		}

		this.logger.error(
			`Конфликт валют у ученика ${input.studentId}: на балансе ${balance} ${balanceCurrency}, ` +
				`платёж ${input.delta} ${paymentCurrency} отложен (payment_id=${paymentId}, reason=${input.reason})`,
		);

		return {
			outcome: "CURRENCY_CONFLICT",
			balance,
			balance_currency: balanceCurrency,
			allocated: [],
			reverted: [],
			payment_id: paymentId,
			conflict: { balance, balance_currency: balanceCurrency, payment_currency: paymentCurrency },
		};
	}

	/**
	 * Откатывает оплату с самых поздних занятий, пока не наберётся нужная сумма.
	 * Занятия в статусах MISSED и RESCHEDULED сюда не попадают: деньги за пропуск сгорели,
	 * а за перенос — ждут переезда на новое занятие.
	 */
	private async revertAllocations(tx: Prisma.TransactionClient, studentId: number, available: number, reverted: AllocationChange[]): Promise<number> {
		const allocations = await this.balanceRepository.getActiveAllocationsDesc(tx, studentId);

		let rest = available;
		for (const allocation of allocations) {
			if (rest >= 0) {
				break;
			}
			const unpaidStatus = UNPAID_FOR_PAID[allocation.lesson_status];
			if (!unpaidStatus) {
				continue;
			}
			await this.balanceRepository.revertAllocation(tx, allocation.lesson_payment_id);
			await this.balanceRepository.setLessonStatus(tx, allocation.lesson_id, unpaidStatus);
			rest += allocation.amount;
			reverted.push({ lesson_id: allocation.lesson_id, amount: allocation.amount, new_status: unpaidStatus });
		}
		return rest;
	}

	/**
	 * Закрывает неоплаченные занятия по возрастанию даты. Хронология строгая: если на очередное
	 * занятие денег не хватило — останавливаемся, а не перескакиваем на более позднее дешёвое.
	 *
	 * Занятие закрывается по цене со скидкой ученика — по той же, по которой посчитан счёт.
	 * Скидка обязана применяться здесь, а не только к итогу: списание идёт поштучно, и на
	 * уменьшенный платёж при полных ценах не хватило бы последнего занятия.
	 */
	private async allocate(
		tx: Prisma.TransactionClient,
		params: {
			studentId: number;
			available: number;
			currency: Currency;
			paymentId: number | null;
			from: Date;
			discountPercent: number;
			allocated: AllocationChange[];
		},
	): Promise<number> {
		const lessons = await this.balanceRepository.getAllocatableLessons(tx, params.studentId, params.from);

		let rest = params.available;
		for (const lesson of lessons) {
			if (lesson.plan_price <= 0) {
				continue;
			}
			if (lesson.plan_currency !== params.currency) {
				this.logger.warn(
					`Занятие ${lesson.id} ученика ${params.studentId} в валюте ${lesson.plan_currency}, ` + `а баланс в ${params.currency} — пропущено при аллокации`,
				);
				continue;
			}
			const price = applyDiscount(lesson.plan_price, params.discountPercent);
			if (rest < price) {
				break;
			}
			const paidStatus = PAID_FOR_UNPAID[lesson.status];
			if (!paidStatus) {
				continue;
			}

			await this.balanceRepository.allocate(tx, {
				lessonId: lesson.id,
				studentId: params.studentId,
				paymentId: params.paymentId,
				amount: price,
				currency: params.currency,
				newStatus: paidStatus,
			});
			rest -= price;
			params.allocated.push({ lesson_id: lesson.id, amount: price, new_status: paidStatus });
		}
		return rest;
	}
}
