import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { endOfDay, endOfMonth, parseISO, startOfDay, startOfMonth } from "date-fns";
import { Currency } from "@/shared/enums/currency.enum";
import { PaymentLinkItem, StripeService } from "@/infrastructure/stripe/stripe.service";
import { PlanService } from "@/modules/plan/application/plan.service";
import { TelegramService } from "@/modules/telegram/application/telegram.service";
import { BalanceService } from "@/modules/balance/application/balance.service";
import { BalanceRepositoryPort } from "@/modules/balance/application/ports/balance.repository.port";
import { PaymentEntity } from "@/modules/balance/domain/payment.entity";
import { PaymentStatusEnum } from "@/modules/balance/domain/payment-status.enum";
import { PaymentTypeEnum } from "@/modules/balance/domain/payment-type.enum";
import {
	BillableLesson,
	InvoiceStudent,
	PaymentListItem,
	PaymentsFilter,
	PaymentsRepositoryPort,
} from "@/modules/payments/application/ports/payments.repository.port";
import { buildInvoiceMessage, currencySymbol } from "@/modules/payments/application/invoice-message.builder";
import { AdjustBalanceDto } from "@/modules/payments/interface/dto/requests/adjust-balance.dto";
import { AdjustBalanceResultDto, BalanceDto, InvoiceDto } from "@/modules/payments/interface/dto/responses/invoice.dto";
import { PaymentsMetrics } from "@/modules/payments/application/payments.metrics";
import { applyDiscount } from "@/shared/utils/discount.util";

/** Валюты, по которым выставляется ссылка Stripe. BYN оплачивается вне системы. */
const STRIPE_CURRENCIES: Currency[] = [Currency.PLN, Currency.EUR];

/** Ограничение Stripe на количество позиций в Payment Link. */
const MAX_LINE_ITEMS = 20;

export type InvoiceResult = InvoiceDto | null;

@Injectable()
export class PaymentsService {
	private readonly logger = new Logger(PaymentsService.name);

	constructor(
		private readonly paymentsRepository: PaymentsRepositoryPort,
		private readonly balanceRepository: BalanceRepositoryPort,
		private readonly balanceService: BalanceService,
		private readonly stripeService: StripeService,
		private readonly planService: PlanService,
		private readonly telegramService: TelegramService,
		private readonly metrics: PaymentsMetrics,
	) {}

	/**
	 * Выставляет счёт за период и отправляет отчёт администратору.
	 *
	 * Возвращает null, если выставлять нечего или счёт заблокирован несогласованностью валют —
	 * в обоих случаях администратор уже получил уведомление, а крон не должен падать.
	 */
	async createInvoice(params: { studentId: number; from: Date; to: Date; createdById: number | null; throwOnSkip?: boolean }): Promise<InvoiceResult> {
		const student = await this.paymentsRepository.getStudentById(params.studentId);
		if (!student) {
			throw new NotFoundException("Студент не найден");
		}
		if (student.deleted_at) {
			throw new BadRequestException("Студент удален");
		}

		// Сначала тратим остаток: иначе ученик заплатит второй раз за уже покрытые балансом занятия.
		await this.balanceService.reconcile({
			studentId: student.id,
			delta: 0,
			currency: null,
			allocateFrom: startOfMonth(params.from),
			reason: "invoice:pre-reconcile",
			payment: { kind: "none" },
		});

		const lessons = await this.paymentsRepository.getBillableLessons(student.id, params.from, params.to);
		const paidLessons = lessons.filter((lesson) => !lesson.is_free && lesson.plan_price > 0);

		if (paidLessons.length === 0) {
			return this.skip(params.throwOnSkip, "По заданному периоду нет ожидающих оплату уроков");
		}

		const currency = this.resolveInvoiceCurrency(paidLessons);
		if (!currency) {
			const currencies = [...new Set(paidLessons.map((lesson) => lesson.plan_currency))].join(", ");
			const message = `У ученика ${student.name} занятия в разных валютах (${currencies}) — счёт не выставлен`;
			this.logger.error(message);
			await this.notifyAdmin(`⚠️ ${message}`);
			return this.skip(params.throwOnSkip, message);
		}

		// Свежий срез: pre-reconcile выше мог изменить и баланс, и его валюту.
		const actualStudent = (await this.paymentsRepository.getStudentById(student.id)) ?? student;
		if (actualStudent.balance !== 0 && actualStudent.balance_currency && actualStudent.balance_currency !== currency) {
			const message =
				`У ученика ${student.name} на балансе ${actualStudent.balance}${currencySymbol(actualStudent.balance_currency)}, ` +
				`а занятия периода в ${currency} — счёт не выставлен. Сначала израсходуйте или скорректируйте остаток.`;
			this.logger.error(message);
			await this.notifyAdmin(`⚠️ ${message}`);
			return this.skip(params.throwOnSkip, message);
		}

		// Скидка применяется к каждому занятию, а не к итогу: баланс закрывает занятия поштучно,
		// и округлённая на итоге скидка оставила бы последнее занятие без денег.
		const total = paidLessons.reduce((sum, lesson) => sum + applyDiscount(lesson.plan_price, student.discount), 0);
		const periodStart = startOfDay(params.from);
		const periodEnd = endOfDay(params.to);

		await this.cancelPendingInvoice(student.id, periodStart, periodEnd);

		const payment = await this.paymentsRepository.createInvoice({
			student_id: student.id,
			amount: total,
			currency,
			period_start: periodStart,
			period_end: periodEnd,
			lessons_count: paidLessons.length,
			discount_percent: student.discount,
			created_by_id: params.createdById,
		});

		const { link, issue } = await this.createPaymentLink(payment, student, paidLessons, currency);

		await this.notifyAdmin(
			buildInvoiceMessage({
				studentName: student.name,
				periodStart,
				lessons,
				currency,
				total,
				discountPercent: student.discount,
				paymentLink: link,
				linkIssue: issue,
			}),
		);

		this.metrics.payment(PaymentTypeEnum.STRIPE_PAYMENT, PaymentStatusEnum.PENDING);
		this.logger.log(`Счёт ${payment.id} ученику ${student.id}: ${total}${currency}, занятий ${paidLessons.length}, ссылка ${link ? "создана" : "нет"}`);

		return {
			payment_id: payment.id,
			student_id: student.id,
			amount: total,
			currency,
			lessons_count: paidLessons.length,
			link,
		};
	}

	async cancelInvoice(paymentId: number): Promise<void> {
		const payment = await this.paymentsRepository.findById(paymentId);
		if (!payment) {
			throw new NotFoundException("Счёт не найден");
		}
		if (payment.status !== PaymentStatusEnum.PENDING) {
			throw new BadRequestException("Отменить можно только неоплаченный счёт");
		}
		await this.deactivateLink(payment);
		await this.paymentsRepository.setStatus(paymentId, PaymentStatusEnum.CANCELED);
		this.logger.log(`Счёт ${paymentId} отменён`);
	}

	async list(filter: PaymentsFilter): Promise<PaymentListItem[]> {
		return this.paymentsRepository.list(filter);
	}

	async getBalance(studentId: number): Promise<BalanceDto> {
		const student = await this.paymentsRepository.getStudentById(studentId);
		if (!student) {
			throw new NotFoundException("Студент не найден");
		}
		const allocations = await this.balanceRepository.withStudentLock(studentId, (tx) => this.balanceRepository.getActiveAllocationsDesc(tx, studentId));
		return {
			student_id: student.id,
			balance: student.balance,
			balance_currency: student.balance_currency,
			allocations: allocations.map((allocation) => ({
				lesson_id: allocation.lesson_id,
				lesson_date: allocation.lesson_date,
				amount: allocation.amount,
				currency: allocation.currency,
			})),
		};
	}

	async adjustBalance(studentId: number, dto: AdjustBalanceDto, createdById: number | null): Promise<AdjustBalanceResultDto> {
		const student = await this.paymentsRepository.getStudentById(studentId);
		if (!student) {
			throw new NotFoundException("Студент не найден");
		}

		const currency = dto.currency ?? student.balance_currency;
		if (!currency) {
			throw new BadRequestException("Баланс пуст — укажите валюту операции");
		}
		if (student.balance !== 0 && student.balance_currency && student.balance_currency !== currency) {
			throw new BadRequestException(`На балансе ${student.balance} ${student.balance_currency} — корректировка возможна только в этой валюте`);
		}

		const result = await this.balanceService.reconcile({
			studentId,
			delta: dto.amount,
			currency,
			reason: "manual-adjustment",
			payment: {
				kind: "create",
				data: {
					type: PaymentTypeEnum.MANUAL_ADJUSTMENT,
					amount: dto.amount,
					currency,
					comment: dto.comment,
					created_by_id: createdById,
					paid_at: new Date(),
				},
			},
		});

		this.metrics.payment(PaymentTypeEnum.MANUAL_ADJUSTMENT, PaymentStatusEnum.SUCCEEDED);

		return {
			balance: result.balance,
			balance_currency: result.balance_currency,
			affected_lessons: [...result.allocated, ...result.reverted].map((change) => ({
				lesson_id: change.lesson_id,
				amount: change.amount,
				new_status: change.new_status,
			})),
		};
	}

	/** Применяет отложенный из-за конфликта валют платёж после того, как админ разрулил конфликт. */
	async applyParkedPayment(paymentId: number): Promise<AdjustBalanceResultDto> {
		const payment = await this.paymentsRepository.findById(paymentId);
		if (!payment) {
			throw new NotFoundException("Платёж не найден");
		}
		if (payment.status !== PaymentStatusEnum.REQUIRES_ATTENTION) {
			throw new BadRequestException("Применять можно только платежи в статусе REQUIRES_ATTENTION");
		}

		const result = await this.balanceService.reconcile({
			studentId: payment.student_id,
			delta: payment.amount,
			currency: payment.currency,
			allocateFrom: payment.period_start ? startOfMonth(payment.period_start) : undefined,
			discountPercent: payment.discount_percent,
			reason: `apply-parked-payment:${paymentId}`,
			payment: { kind: "settle", paymentId, amount: payment.amount, patch: { paid_at: payment.paid_at ?? new Date() } },
		});

		if (result.outcome === "CURRENCY_CONFLICT") {
			throw new BadRequestException(
				`Конфликт не разрешён: на балансе ${result.conflict?.balance} ${result.conflict?.balance_currency}, платёж в ${payment.currency}`,
			);
		}

		return {
			balance: result.balance,
			balance_currency: result.balance_currency,
			affected_lessons: [...result.allocated, ...result.reverted].map((change) => ({
				lesson_id: change.lesson_id,
				amount: change.amount,
				new_status: change.new_status,
			})),
		};
	}

	/** Ежемесячный прогон: последовательно по каждому ученику, ошибка одного не роняет остальных. */
	async issueMonthlyInvoices(now: Date): Promise<void> {
		const from = startOfMonth(now);
		const to = endOfMonth(now);
		const students = await this.paymentsRepository.getActiveStudents();

		this.logger.log(`Ежемесячное выставление счетов: ${students.length} учеников, период ${from.toISOString()} — ${to.toISOString()}`);

		for (const student of students) {
			try {
				await this.createInvoice({ studentId: student.id, from, to, createdById: null });
			} catch (error) {
				this.logger.error(`Не удалось выставить счёт ученику ${student.id}: ${(error as Error).message}`);
			}
		}
	}

	parsePeriod(startDate: string, endDate: string): { from: Date; to: Date } {
		const from = startOfDay(parseISO(startDate));
		const to = endOfDay(parseISO(endDate));
		if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
			throw new BadRequestException("Некорректный период");
		}
		if (from > to) {
			throw new BadRequestException("Начало периода позже его конца");
		}
		return { from, to };
	}

	private skip(throwOnSkip: boolean | undefined, message: string): null {
		if (throwOnSkip) {
			throw new BadRequestException(message);
		}
		return null;
	}

	/** Валюта счёта выводится из планов занятий. null — валют больше одной. */
	private resolveInvoiceCurrency(lessons: BillableLesson[]): Currency | null {
		const currencies = new Set(lessons.map((lesson) => lesson.plan_currency));
		return currencies.size === 1 ? [...currencies][0] : null;
	}

	private async cancelPendingInvoice(studentId: number, periodStart: Date, periodEnd: Date): Promise<void> {
		const pending = await this.paymentsRepository.findPendingInvoice(studentId, periodStart, periodEnd);
		if (!pending) {
			return;
		}
		await this.deactivateLink(pending);
		await this.paymentsRepository.setStatus(pending.id, PaymentStatusEnum.CANCELED);
		this.logger.log(`Предыдущий счёт ${pending.id} за тот же период отменён`);
	}

	private async deactivateLink(payment: PaymentEntity): Promise<void> {
		if (!payment.stripe_payment_link_id) {
			return;
		}
		try {
			await this.stripeService.deactivatePaymentLink(payment.stripe_payment_link_id);
		} catch (error) {
			this.logger.error(`Не удалось деактивировать ссылку ${payment.stripe_payment_link_id}: ${(error as Error).message}`);
		}
	}

	/**
	 * Ошибка Stripe здесь не фатальна: отчёт администратору уходит в любом случае,
	 * просто без ссылки — иначе одна недоступность платёжки лишила бы всех учеников счетов.
	 */
	private async createPaymentLink(
		payment: PaymentEntity,
		student: InvoiceStudent,
		lessons: BillableLesson[],
		currency: Currency,
	): Promise<{ link: string | null; issue?: string }> {
		if (!STRIPE_CURRENCIES.includes(currency)) {
			return { link: null };
		}

		try {
			const items = await this.buildLineItems(lessons, student.discount, currency);
			if (items.length > MAX_LINE_ITEMS) {
				const issue = `в счёте ${items.length} позиций, Stripe допускает не больше ${MAX_LINE_ITEMS}`;
				this.logger.error(`Счёт ${payment.id}: ${issue}`);
				return { link: null, issue };
			}

			const created = await this.stripeService.createPaymentLink({
				items,
				idempotencyKey: `invoice-${payment.id}`,
				// Спрашиваем только то, на что ученик ещё не отвечал.
				consents: {
					collectTermsOfService: !student.terms_accepted,
					collectMarketingConsent: !student.marketing_answered,
				},
				metadata: {
					student_id: String(student.id),
					payment_id: String(payment.id),
					period_start: payment.period_start?.toISOString() ?? "",
					period_end: payment.period_end?.toISOString() ?? "",
				},
			});

			await this.paymentsRepository.setPaymentLink(payment.id, created.id);
			return { link: created.url };
		} catch (error) {
			this.logger.error(`Не удалось создать ссылку для счёта ${payment.id}: ${(error as Error).message}`);
			return { link: null, issue: "платёжный сервис недоступен" };
		}
	}

	/** Группирует занятия по плану: одна позиция на план с количеством занятий. */
	private async buildLineItems(lessons: BillableLesson[], discountPercent: number, currency: Currency): Promise<PaymentLinkItem[]> {
		const countByPlan = new Map<number, number>();
		for (const lesson of lessons) {
			countByPlan.set(lesson.plan_id, (countByPlan.get(lesson.plan_id) ?? 0) + 1);
		}

		const items: PaymentLinkItem[] = [];
		for (const [planId, quantity] of countByPlan) {
			// Планы, заведённые до появления оплат, приходят без цены в Stripe — создаём на лету.
			const plan = await this.planService.ensureStripeIds(planId);

			if (discountPercent > 0) {
				// Цена со скидкой принадлежит ученику, а не плану, поэтому готового Price для неё
				// нет и быть не должно: Stripe принимает разовую цену у того же продукта.
				if (!plan.stripe_product_id) {
					throw new Error(`У плана ${planId} нет продукта в Stripe`);
				}
				items.push({
					productId: plan.stripe_product_id,
					unitAmountMajor: applyDiscount(plan.plan_price, discountPercent),
					currency,
					quantity,
				});
				continue;
			}

			if (!plan.stripe_price_id) {
				throw new Error(`У плана ${planId} нет цены в Stripe`);
			}
			items.push({ priceId: plan.stripe_price_id, quantity });
		}
		return items;
	}

	private async notifyAdmin(message: string): Promise<void> {
		try {
			await this.telegramService.sendMessageToAdmin(message);
		} catch (error) {
			this.logger.error(`Не удалось отправить сообщение администратору: ${(error as Error).message}`);
		}
	}
}
