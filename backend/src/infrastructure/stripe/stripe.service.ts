import { Inject, Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import Stripe = require("stripe");

import { Currency } from "@/shared/enums/currency.enum";
import { STRIPE_CLIENT } from "./stripe.constants";

export type CreateProductWithPriceParams = {
	planId: number;
	name: string;
	priceMajor: number;
	currency: Currency;
};

export type CreateProductWithPriceResult = {
	productId: string;
	priceId: string;
};

export type PaymentLinkItem = {
	priceId: string;
	quantity: number;
};

/**
 * Какие согласия страница оплаты должна собрать у плательщика. Признаки независимы:
 * ученик мог принять условия и при этом ещё не ответить про фото/видео.
 */
export type PaymentLinkConsents = {
	collectTermsOfService: boolean;
	collectMarketingConsent: boolean;
};

export type CreatePaymentLinkParams = {
	items: PaymentLinkItem[];
	metadata?: Record<string, string>;
	idempotencyKey?: string;
	/** Не задано — ссылка без согласий: ученик уже на всё ответил. */
	consents?: PaymentLinkConsents;
};

/**
 * Поля, которые плательщик заполняет на странице оплаты. Значения приходят в
 * `checkout.session.custom_fields` и видны в дашборде Stripe: платит обычно родитель,
 * и по одному имени плательщика непонятно, за какого ученика пришли деньги.
 *
 * `key` по требованию Stripe — только буквы и цифры. Оба поля обязательные
 * (`optional` по умолчанию false).
 */
const PAYMENT_LINK_CUSTOM_FIELDS: Stripe.PaymentLinkCreateParams.CustomField[] = [
	{
		key: "payerName",
		type: "text",
		label: { type: "custom", custom: "Имя и фамилия плательщика" },
	},
	{
		key: "studentName",
		type: "text",
		label: { type: "custom", custom: "Имя и фамилия ученика" },
	},
];

/** Ключ дропдауна согласия. По нему вебхук находит ответ в `session.custom_fields`. */
export const MARKETING_CONSENT_FIELD_KEY = "marketingConsent";
export const MARKETING_CONSENT_YES = "yes";
export const MARKETING_CONSENT_NO = "no";

/**
 * Согласие на фото/видео спрашивается только у тех, кто ещё не отвечал.
 *
 * Лимиты Stripe, которые тут выбраны почти целиком: подпись поля ≤ 50 символов,
 * подпись варианта ≤ 100, `value` — только буквы и цифры. Поле обязательное
 * (`optional` не задан), поэтому ответ приходит по каждой завершённой сессии.
 */
const MARKETING_CONSENT_FIELD: Stripe.PaymentLinkCreateParams.CustomField = {
	key: MARKETING_CONSENT_FIELD_KEY,
	type: "dropdown",
	label: { type: "custom", custom: "Использование фото/видео в маркетинговых целях" },
	dropdown: {
		options: [
			{
				label: "Да, даю согласие на использование фото и видео моего ребёнка в маркетинговых целях школы.",
				value: MARKETING_CONSENT_YES,
			},
			{
				label: "Нет, не даю согласие на использование фото и видео моего ребёнка в маркетинговых целях школы.",
				value: MARKETING_CONSENT_NO,
			},
		],
	},
};

/** Экран после успешной оплаты. Редиректа нет: своей страницы «спасибо» у нас пока не существует. */
const PAYMENT_LINK_AFTER_COMPLETION: Stripe.PaymentLinkCreateParams.AfterCompletion = {
	type: "hosted_confirmation",
	hosted_confirmation: { custom_message: "Благодарим за оплату! До встречи на занятиях!" },
};

/** Ссылка одноразовая, поэтому открывший её повторно должен понять, что это не сбой. */
const PAYMENT_LINK_INACTIVE_MESSAGE = "Ссылка уже оплачена или устарела. Запросите новую у администратора.";

export type CreatePaymentLinkResult = {
	id: string;
	url: string;
};

@Injectable()
export class StripeService {
	private readonly logger = new Logger(StripeService.name);

	constructor(@Inject(STRIPE_CLIENT) private readonly stripe: Stripe) {}

	async createProductWithPrice(params: CreateProductWithPriceParams): Promise<CreateProductWithPriceResult> {
		try {
			const product = await this.stripe.products.create(
				{
					name: params.name,
					metadata: { plan_id: String(params.planId) },
				},
				{ idempotencyKey: `plan-${params.planId}-product` },
			);

			const price = await this.stripe.prices.create(
				{
					product: product.id,
					unit_amount: Math.round(params.priceMajor * 100),
					currency: params.currency.toLowerCase(),
				},
				{ idempotencyKey: `plan-${params.planId}-price` },
			);

			return { productId: product.id, priceId: price.id };
		} catch (error) {
			this.handleStripeError("createProductWithPrice", error);
		}
	}

	async archiveProduct(productId: string): Promise<void> {
		try {
			await this.stripe.products.update(productId, { active: false });
		} catch (error) {
			this.handleStripeError("archiveProduct", error);
		}
	}

	async createPaymentLink(params: CreatePaymentLinkParams): Promise<CreatePaymentLinkResult> {
		try {
			const paymentLink = await this.stripe.paymentLinks.create(
				{
					line_items: params.items.map((item) => ({
						price: item.priceId,
						quantity: item.quantity,
					})),
					metadata: params.metadata,
					restrictions: {
						completed_sessions: { limit: 1 },
					},
					custom_fields: params.consents?.collectMarketingConsent ? [...PAYMENT_LINK_CUSTOM_FIELDS, MARKETING_CONSENT_FIELD] : PAYMENT_LINK_CUSTOM_FIELDS,
					// Условный спред, а не `undefined`: лишний ключ в теле запроса Stripe не нужен.
					...(params.consents?.collectTermsOfService ? { consent_collection: { terms_of_service: "required" as const } } : {}),
					after_completion: PAYMENT_LINK_AFTER_COMPLETION,
					inactive_message: PAYMENT_LINK_INACTIVE_MESSAGE,
					// Надпись на кнопке. Stripe сам переводит её по локали плательщика:
					// «Оплатить» / «Pay» / «Zapłać» — отдельной настройки на регион не требуется.
					submit_type: "pay",
				},
				params.idempotencyKey ? { idempotencyKey: params.idempotencyKey } : undefined,
			);

			return { id: paymentLink.id, url: paymentLink.url };
		} catch (error) {
			this.handleStripeError("createPaymentLink", error);
		}
	}

	async deactivatePaymentLink(id: string): Promise<void> {
		try {
			await this.stripe.paymentLinks.update(id, { active: false });
		} catch (error) {
			this.handleStripeError("deactivatePaymentLink", error);
		}
	}

	/**
	 * Синхронная проверка подписи вебхука. Ошибку не оборачиваем: контроллер
	 * должен отличить `StripeSignatureVerificationError` (→ 400) от прочих сбоев.
	 */
	constructWebhookEvent(rawBody: Buffer, signature: string, webhookSecret: string): Stripe.Event {
		try {
			return this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
		} catch (error) {
			this.logger.warn(`Webhook signature verification failed: ${(error as Error).message}`);
			throw error;
		}
	}

	private handleStripeError(operation: string, error: unknown): never {
		const stripeError = error as Stripe.errors.StripeError;
		this.logger.error(`Stripe ${operation} failed: type=${stripeError?.type} code=${stripeError?.code} message=${stripeError?.message}`);
		throw new ServiceUnavailableException("Сервис оплаты временно недоступен");
	}
}
