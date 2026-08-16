import { Inject, Injectable, Logger } from "@nestjs/common";
import { startOfMonth } from "date-fns";
import Stripe = require("stripe");
import { stripeConfig, StripeConfig } from "@/config/namespaces/stripe.config";
import { MARKETING_CONSENT_FIELD_KEY, MARKETING_CONSENT_NO, MARKETING_CONSENT_YES, StripeService } from "@/infrastructure/stripe/stripe.service";
import { StudentService } from "@/modules/student/application/student.service";
import { Currency } from "@/shared/enums/currency.enum";
import { BalanceService } from "@/modules/balance/application/balance.service";
import { PaymentEntity } from "@/modules/balance/domain/payment.entity";
import { PaymentStatusEnum } from "@/modules/balance/domain/payment-status.enum";
import { PaymentTypeEnum } from "@/modules/balance/domain/payment-type.enum";
import { TelegramService } from "@/modules/telegram/application/telegram.service";
import { PaymentsRepositoryPort } from "@/modules/payments/application/ports/payments.repository.port";
import { PaymentsMetrics } from "@/modules/payments/application/payments.metrics";

/**
 * Результат обработки события.
 * - handled: всё в порядке;
 * - ignored: событие нас не касается либо уже обработано;
 * - business_error: разбираться должен человек, Stripe ретраить не нужно (отвечаем 200);
 * транзиентные ошибки не попадают сюда — они пробрасываются наружу и превращаются в 500.
 */
export type WebhookOutcome = "handled" | "ignored" | "business_error";

const MINOR_UNITS_IN_MAJOR = 100;

@Injectable()
export class StripeWebhookService {
	private readonly logger = new Logger(StripeWebhookService.name);

	constructor(
		@Inject(stripeConfig.KEY) private readonly config: StripeConfig,
		private readonly stripeService: StripeService,
		private readonly paymentsRepository: PaymentsRepositoryPort,
		private readonly balanceService: BalanceService,
		private readonly telegramService: TelegramService,
		private readonly studentService: StudentService,
		private readonly metrics: PaymentsMetrics,
	) {}

	/** Проверяет подпись. Бросает ошибку Stripe — контроллер превращает её в 400. */
	constructEvent(rawBody: Buffer, signature: string): Stripe.Event {
		return this.stripeService.constructWebhookEvent(rawBody, signature, this.config.stripeWebhookSecret);
	}

	async handleEvent(event: Stripe.Event): Promise<WebhookOutcome> {
		const claimed = await this.paymentsRepository.claimWebhookEvent(event.id, event.type);
		if (!claimed) {
			this.logger.log(`Событие ${event.id} (${event.type}) уже обработано — пропуск`);
			return "ignored";
		}

		try {
			const outcome = await this.dispatch(event);
			await this.paymentsRepository.markWebhookEventProcessed(event.id);
			this.metrics.webhookEvent(event.type, outcome);
			return outcome;
		} catch (error) {
			if (error instanceof WebhookBusinessError) {
				this.logger.error(`Событие ${event.id} (${event.type}): ${error.message}`);
				await this.paymentsRepository.markWebhookEventProcessed(event.id, error.message);
				await this.notifyAdmin(`⚠️ Проблема с платежом Stripe: ${error.message}`);
				this.metrics.webhookEvent(event.type, "business_error");
				return "business_error";
			}
			// Транзиентная ошибка: processed_at остаётся пустым, Stripe повторит доставку.
			this.logger.error(`Событие ${event.id} (${event.type}) упало: ${(error as Error).message}`);
			this.metrics.webhookEvent(event.type, "error");
			throw error;
		}
	}

	private async dispatch(event: Stripe.Event): Promise<WebhookOutcome> {
		switch (event.type) {
			case "checkout.session.completed": {
				const session = event.data.object as Stripe.Checkout.Session;
				// Отложенные способы оплаты (BLIK, P24) сначала присылают unpaid —
				// деньги ещё не пришли, ждём async_payment_succeeded.
				if (session.payment_status !== "paid") {
					this.logger.log(`Сессия ${session.id}: payment_status=${session.payment_status}, ждём асинхронного подтверждения`);
					return "ignored";
				}
				return this.settleCheckoutSession(session, event.type);
			}
			case "checkout.session.async_payment_succeeded":
				return this.settleCheckoutSession(event.data.object as Stripe.Checkout.Session, event.type);
			case "checkout.session.async_payment_failed":
				return this.failCheckoutSession(event.data.object as Stripe.Checkout.Session);
			case "refund.created":
				return this.handleRefund(event.data.object as Stripe.Refund);
			default:
				this.logger.log(`Событие ${event.type} не обрабатывается`);
				return "ignored";
		}
	}

	private async settleCheckoutSession(session: Stripe.Checkout.Session, eventType: string): Promise<WebhookOutcome> {
		const payment = await this.findInvoiceForSession(session);

		// До раннего выхода по SUCCEEDED и до reconcile. Порядок важен: если запись согласия
		// упадёт, деньги ещё не тронуты и ретрай Stripe пройдёт весь путь заново; в обратном
		// порядке ретрай упёрся бы в SUCCEEDED, и ответ родителя потерялся бы навсегда.
		await this.recordConsents(session, payment.student_id);

		if (payment.status === PaymentStatusEnum.SUCCEEDED) {
			this.logger.log(`Счёт ${payment.id} уже оплачен — повторное событие пропущено`);
			return "ignored";
		}

		const sessionCurrency = session.currency?.toUpperCase();
		if (sessionCurrency && sessionCurrency !== payment.currency) {
			throw new WebhookBusinessError(`валюта оплаты ${sessionCurrency} не совпадает с валютой счёта ${payment.currency} (счёт ${payment.id})`);
		}

		const amountMajor = this.toMajorUnits(session.amount_total ?? 0, payment.id);

		const result = await this.balanceService.reconcile({
			studentId: payment.student_id,
			delta: amountMajor,
			currency: payment.currency as Currency,
			allocateFrom: payment.period_start ? startOfMonth(payment.period_start) : undefined,
			reason: `stripe:${eventType}`,
			payment: {
				kind: "settle",
				paymentId: payment.id,
				amount: amountMajor,
				patch: {
					paid_at: new Date(),
					stripe_checkout_session_id: session.id,
					stripe_payment_intent_id: typeof session.payment_intent === "string" ? session.payment_intent : (session.payment_intent?.id ?? null),
				},
			},
		});

		if (result.outcome === "CURRENCY_CONFLICT") {
			this.metrics.payment(PaymentTypeEnum.STRIPE_PAYMENT, PaymentStatusEnum.REQUIRES_ATTENTION);
			await this.notifyAdmin(
				`⚠️ Платёж ${amountMajor} ${payment.currency} по счёту ${payment.id} отложен: ` +
					`на балансе ученика ${payment.student_id} лежит ${result.conflict?.balance} ${result.conflict?.balance_currency}. ` +
					`Обнулите остаток и примените платёж вручную.`,
			);
			return "business_error";
		}

		this.metrics.payment(PaymentTypeEnum.STRIPE_PAYMENT, PaymentStatusEnum.SUCCEEDED);
		this.logger.log(`Счёт ${payment.id} оплачен: ${amountMajor} ${payment.currency}, занятий закрыто ${result.allocated.length}`);
		return "handled";
	}

	private async failCheckoutSession(session: Stripe.Checkout.Session): Promise<WebhookOutcome> {
		const payment = await this.findInvoiceForSession(session);
		await this.paymentsRepository.setStatus(payment.id, PaymentStatusEnum.FAILED);
		await this.notifyAdmin(`⚠️ Оплата по счёту ${payment.id} (ученик ${payment.student_id}) не прошла`);
		return "handled";
	}

	/**
	 * Возврат обрабатывается по refund.created, а не по charge.refunded: у последнего в объекте
	 * лежит накопительная сумма amount_refunded, и второй частичный возврат списал бы деньги дважды.
	 */
	private async handleRefund(refund: Stripe.Refund): Promise<WebhookOutcome> {
		if (refund.status !== "succeeded") {
			this.logger.log(`Возврат ${refund.id} в статусе ${refund.status} — пропуск`);
			return "ignored";
		}

		const existing = await this.paymentsRepository.findByRefundId(refund.id);
		if (existing) {
			this.logger.log(`Возврат ${refund.id} уже учтён (payment ${existing.id})`);
			return "ignored";
		}

		const paymentIntentId = typeof refund.payment_intent === "string" ? refund.payment_intent : refund.payment_intent?.id;
		if (!paymentIntentId) {
			throw new WebhookBusinessError(`у возврата ${refund.id} нет payment_intent`);
		}

		const original = await this.paymentsRepository.findSucceededByPaymentIntentId(paymentIntentId);
		if (!original) {
			throw new WebhookBusinessError(`не найден исходный платёж по payment_intent ${paymentIntentId} (возврат ${refund.id})`);
		}

		const amountMajor = this.toMajorUnits(refund.amount, original.id);

		const result = await this.balanceService.reconcile({
			studentId: original.student_id,
			delta: -amountMajor,
			currency: original.currency as Currency,
			reason: `stripe:refund.created:${refund.id}`,
			// Деньги в Stripe уже вернулись — отказать нельзя. Если откатывать нечего
			// (занятия прошли и деньги сгорели), баланс уходит в минус, и это честный долг.
			allowNegativeBalance: true,
			payment: {
				kind: "create",
				data: {
					type: PaymentTypeEnum.STRIPE_REFUND,
					amount: -amountMajor,
					currency: original.currency,
					comment: `Возврат по платежу ${original.id}`,
					stripe_refund_id: refund.id,
					paid_at: new Date(),
				},
			},
		});

		if (result.outcome === "CURRENCY_CONFLICT") {
			await this.notifyAdmin(`⚠️ Возврат ${refund.id} не применён: конфликт валют у ученика ${original.student_id}`);
			return "business_error";
		}

		if (result.balance < 0) {
			await this.notifyAdmin(`⚠️ После возврата ${amountMajor} ${original.currency} баланс ученика ${original.student_id} ушёл в минус: ${result.balance}`);
		}

		this.metrics.payment(PaymentTypeEnum.STRIPE_REFUND, PaymentStatusEnum.SUCCEEDED);
		this.logger.log(`Возврат ${refund.id}: -${amountMajor} ${original.currency}, откачено занятий ${result.reverted.length}`);
		return "handled";
	}

	/**
	 * Снимает с сессии согласия, которые собрала страница оплаты. Их может не быть вовсе:
	 * ученику, ответившему раньше, поля не показывались, а по ссылкам, созданным до появления
	 * этой фичи, их не будет никогда. Это штатная ситуация, а не ошибка.
	 */
	private async recordConsents(session: Stripe.Checkout.Session, studentId: number): Promise<void> {
		const termsAccepted = session.consent?.terms_of_service === "accepted";
		const marketingConsent = this.readMarketingConsent(session);

		if (!termsAccepted && marketingConsent === undefined) {
			return;
		}

		await this.studentService.recordConsentsFromCheckout(studentId, { termsAccepted, marketingConsent });
		this.logger.log(`Согласия ученика ${studentId} из сессии ${session.id}: условия=${termsAccepted}, маркетинг=${marketingConsent ?? "не отвечал"}`);
	}

	private readMarketingConsent(session: Stripe.Checkout.Session): boolean | undefined {
		const field = session.custom_fields?.find((item) => item.key === MARKETING_CONSENT_FIELD_KEY);
		const value = field?.dropdown?.value;

		if (value === MARKETING_CONSENT_YES) {
			return true;
		}
		if (value === MARKETING_CONSENT_NO) {
			return false;
		}
		if (value) {
			// Бросать нельзя: значение мы всё равно не исправим, а Stripe будет ретраить вечно.
			this.logger.warn(`Неизвестное значение согласия «${value}» в сессии ${session.id} — пропущено`);
		}
		return undefined;
	}

	private async findInvoiceForSession(session: Stripe.Checkout.Session): Promise<PaymentEntity> {
		const paymentLinkId = typeof session.payment_link === "string" ? session.payment_link : session.payment_link?.id;

		if (paymentLinkId) {
			const byLink = await this.paymentsRepository.findByPaymentLinkId(paymentLinkId);
			if (byLink) {
				return byLink;
			}
		}

		// Запасной путь: ссылку могли пересоздать, но metadata переносится в сессию.
		const metadataPaymentId = Number(session.metadata?.payment_id);
		if (Number.isInteger(metadataPaymentId) && metadataPaymentId > 0) {
			const byMetadata = await this.paymentsRepository.findById(metadataPaymentId);
			if (byMetadata) {
				return byMetadata;
			}
		}

		const bySession = await this.paymentsRepository.findByCheckoutSessionId(session.id);
		if (bySession) {
			return bySession;
		}

		throw new WebhookBusinessError(`не найден счёт для сессии ${session.id} (payment_link=${paymentLinkId ?? "нет"})`);
	}

	/**
	 * Баланс хранится в целых единицах валюты, поэтому дробный остаток представить нечем.
	 * При наших целых ценах это не должно происходить — но если произошло, лучше знать.
	 */
	private toMajorUnits(amountMinor: number, paymentId: number): number {
		if (amountMinor % MINOR_UNITS_IN_MAJOR !== 0) {
			this.logger.warn(`Сумма ${amountMinor} по счёту ${paymentId} не кратна ${MINOR_UNITS_IN_MAJOR} — остаток отброшен`);
		}
		return Math.floor(amountMinor / MINOR_UNITS_IN_MAJOR);
	}

	private async notifyAdmin(message: string): Promise<void> {
		try {
			await this.telegramService.sendMessageToAdmin(message);
		} catch (error) {
			this.logger.error(`Не удалось уведомить администратора: ${(error as Error).message}`);
		}
	}
}

/** Ошибка, при которой ретрай со стороны Stripe бессмысленен: нужен разбор человеком. */
export class WebhookBusinessError extends Error {}
