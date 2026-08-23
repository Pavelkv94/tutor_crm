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
	PaymentCharge,
	PaymentListItem,
	PaymentsFilter,
	PaymentsRepositoryPort,
} from "@/modules/payments/application/ports/payments.repository.port";
import { InvoiceCharge, buildInvoiceMessage, currencySymbol } from "@/modules/payments/application/invoice-message.builder";
import { AdjustBalanceDto } from "@/modules/payments/interface/dto/requests/adjust-balance.dto";
import { AdjustBalanceResultDto, BalanceDto, InvoiceDto } from "@/modules/payments/interface/dto/responses/invoice.dto";
import { PaymentsMetrics } from "@/modules/payments/application/payments.metrics";
import { applyDiscount } from "@/shared/utils/discount.util";
import { EUR_MINOR_UNITS, MIN_EUR_CHARGE_MINOR, bynToEurMinor, formatEurMinor } from "@/shared/utils/exchange-rate.util";
import { PaymentMethod } from "@/shared/enums/payment-method.enum";
import { SettingsService } from "@/modules/settings/application/settings.service";

/** Валюты, которые Stripe обслуживает напрямую: счёт в них уходит как есть, без пересчёта. */
const STRIPE_DIRECT_CURRENCIES: Currency[] = [Currency.PLN, Currency.EUR];

/**
 * Как счёт предъявляется к оплате.
 * - `direct` — в своей валюте, готовыми ценами плана (прежнее поведение);
 * - `converted` — пересчитан в евро по курсу школы: Stripe не обслуживает BYN;
 * - `blocked` — предъявить нельзя, причина уходит в отчёт администратору.
 */
type ChargeMode = { kind: "direct" } | { kind: "converted"; rate: number; currency: Currency } | { kind: "blocked"; issue: string };

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
		private readonly settingsService: SettingsService,
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

		const { link, issue, charge } = await this.createPaymentLink(payment, student, paidLessons, currency);
		// Ссылки не ждали — оплата принимается вне системы. Отличать это от сбоя важно:
		// в первом случае в счёте просто просим прислать чек, во втором предупреждаем админа.
		const expectsReceipt = student.payment_method !== PaymentMethod.STRIPE;

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
				expectsReceipt,
				charge,
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
			link_issue: issue ?? null,
			charge_amount_minor: charge?.amountMinor ?? null,
			charge_currency: charge?.currency ?? null,
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
	 *
	 * Ссылка создаётся только ученикам со способом оплаты STRIPE. Валюта занятий решает не
	 * «выставлять ли ссылку», а «нужен ли пересчёт»: BYN Stripe не обслуживает, поэтому такой
	 * счёт предъявляется в евро по внутреннему курсу школы.
	 */
	private async createPaymentLink(
		payment: PaymentEntity,
		student: InvoiceStudent,
		lessons: BillableLesson[],
		currency: Currency,
	): Promise<{ link: string | null; issue?: string; charge?: InvoiceCharge }> {
		if (student.payment_method !== PaymentMethod.STRIPE) {
			return { link: null };
		}

		const mode = await this.resolveChargeMode(currency);
		if (mode.kind === "blocked") {
			this.logger.error(`Счёт ${payment.id}: ${mode.issue}`);
			return { link: null, issue: mode.issue };
		}

		try {
			const { items, chargeAmountMinor } = await this.buildLineItems(lessons, student.discount, currency, mode);
			if (items.length > MAX_LINE_ITEMS) {
				const issue = `в счёте ${items.length} позиций, Stripe допускает не больше ${MAX_LINE_ITEMS}`;
				this.logger.error(`Счёт ${payment.id}: ${issue}`);
				return { link: null, issue };
			}
			// Порог Stripe проверяем сами: иначе отказ платёжки пришёл бы под общим текстом
			// «сервис недоступен», и админ искал бы проблему не там.
			if (chargeAmountMinor !== null && chargeAmountMinor < MIN_EUR_CHARGE_MINOR) {
				const issue = `сумма к оплате ${formatEurMinor(chargeAmountMinor)}${currencySymbol(mode.kind === "converted" ? mode.currency : currency)} меньше минимальной для оплаты картой`;
				this.logger.error(`Счёт ${payment.id}: ${issue}`);
				return { link: null, issue };
			}

			const created = await this.stripeService.createPaymentLink({
				items,
				idempotencyKey: `invoice-${payment.id}`,
				consents: {
					// Условия обслуживания собираются на каждой оплате: плательщик принимает их
					// применительно к конкретному счёту, а не один раз навсегда, поэтому в профиле
					// ученика факт принятия не хранится.
					collectTermsOfService: true,
					// Про фото/видео спрашиваем только тех, кто ещё не отвечал.
					collectMarketingConsent: !student.marketing_answered,
				},
				metadata: {
					student_id: String(student.id),
					payment_id: String(payment.id),
					period_start: payment.period_start?.toISOString() ?? "",
					period_end: payment.period_end?.toISOString() ?? "",
				},
			});

			const charge: PaymentCharge | undefined =
				mode.kind === "converted" && chargeAmountMinor !== null ? { amount_minor: chargeAmountMinor, currency: mode.currency, rate: mode.rate } : undefined;

			await this.paymentsRepository.setPaymentLink(payment.id, created.id, charge);
			return {
				link: created.url,
				charge: charge ? { amountMinor: charge.amount_minor, currency: charge.currency, rate: charge.rate } : undefined,
			};
		} catch (error) {
			this.logger.error(`Не удалось создать ссылку для счёта ${payment.id}: ${(error as Error).message}`);
			return { link: null, issue: "платёжный сервис недоступен" };
		}
	}

	/** Нужен ли счёту пересчёт и можно ли его вообще предъявить к оплате картой. */
	private async resolveChargeMode(currency: Currency): Promise<ChargeMode> {
		if (STRIPE_DIRECT_CURRENCIES.includes(currency)) {
			return { kind: "direct" };
		}

		const rate = await this.settingsService.getEurRate();
		if (rate <= 0) {
			return { kind: "blocked", issue: "не задан курс евро — задайте его в панели администратора" };
		}
		return { kind: "converted", rate, currency: Currency.EUR };
	}

	/**
	 * Группирует занятия по плану: одна позиция на план с количеством занятий.
	 *
	 * `chargeAmountMinor` — итог ссылки в минорных единицах валюты списания, накопленный по
	 * позициям. Именно он, а не пересчёт итога счёта, попадает и в Stripe, и в отчёт админу:
	 * округление идёт по каждой позиции, и пересчитанный заново итог разошёлся бы с суммой
	 * позиций на копейки. Для счёта без пересчёта — null.
	 */
	private async buildLineItems(
		lessons: BillableLesson[],
		discountPercent: number,
		currency: Currency,
		mode: Exclude<ChargeMode, { kind: "blocked" }>,
	): Promise<{ items: PaymentLinkItem[]; chargeAmountMinor: number | null }> {
		const countByPlan = new Map<number, number>();
		for (const lesson of lessons) {
			countByPlan.set(lesson.plan_id, (countByPlan.get(lesson.plan_id) ?? 0) + 1);
		}

		const items: PaymentLinkItem[] = [];
		let chargeAmountMinor = 0;

		for (const [planId, quantity] of countByPlan) {
			if (mode.kind === "converted") {
				// У плана в BYN нет и не может быть цены в Stripe, поэтому быстрый путь через
				// priceId здесь недоступен принципиально — нужен только продукт.
				const plan = await this.planService.ensureStripeProduct(planId);
				if (!plan.stripe_product_id) {
					throw new Error(`У плана ${planId} нет продукта в Stripe`);
				}

				// Скидка применяется до конверсии: она целочисленная и определена только
				// в валюте плана.
				const unitMinor = bynToEurMinor(applyDiscount(plan.plan_price, discountPercent), mode.rate);
				items.push({
					productId: plan.stripe_product_id,
					// toLineItem умножит обратно на 100 с Math.round — исходные центы вернутся ровно.
					unitAmountMajor: unitMinor / EUR_MINOR_UNITS,
					currency: mode.currency,
					quantity,
				});
				chargeAmountMinor += unitMinor * quantity;
				continue;
			}

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

		return { items, chargeAmountMinor: mode.kind === "converted" ? chargeAmountMinor : null };
	}

	private async notifyAdmin(message: string): Promise<void> {
		try {
			await this.telegramService.sendMessageToAdmin(message);
		} catch (error) {
			this.logger.error(`Не удалось отправить сообщение администратору: ${(error as Error).message}`);
		}
	}
}
