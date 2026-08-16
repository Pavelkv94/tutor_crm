import { Test, TestingModule } from "@nestjs/testing";
import { ServiceUnavailableException } from "@nestjs/common";
import { StripeService } from "../../../src/infrastructure/stripe/stripe.service";
import { STRIPE_CLIENT } from "../../../src/infrastructure/stripe/stripe.constants";
import { Currency } from "../../../src/shared/enums/currency.enum";

/**
 * Оформление страницы оплаты задаётся кодом и глазами не проверяется — тесты фиксируют
 * его, чтобы правка не уехала молча. Клиент Stripe подменён моком: сеть здесь не нужна.
 */
describe("StripeService", () => {
	let service: StripeService;
	let stripe: {
		products: { create: jest.Mock; update: jest.Mock };
		prices: { create: jest.Mock };
		paymentLinks: { create: jest.Mock; update: jest.Mock };
	};

	beforeEach(async () => {
		stripe = {
			products: { create: jest.fn().mockResolvedValue({ id: "prod_1" }), update: jest.fn().mockResolvedValue({}) },
			prices: { create: jest.fn().mockResolvedValue({ id: "price_1" }) },
			paymentLinks: {
				create: jest.fn().mockResolvedValue({ id: "plink_1", url: "https://buy.stripe.com/test_1" }),
				update: jest.fn().mockResolvedValue({}),
			},
		};

		const module: TestingModule = await Test.createTestingModule({
			providers: [StripeService, { provide: STRIPE_CLIENT, useValue: stripe }],
		}).compile();
		service = module.get<StripeService>(StripeService);
	});

	describe("createPaymentLink", () => {
		const call = async (consents?: { collectTermsOfService: boolean; collectMarketingConsent: boolean }) => {
			await service.createPaymentLink({
				items: [{ priceId: "price_1", quantity: 4 }],
				metadata: { payment_id: "11" },
				idempotencyKey: "invoice-11",
				consents,
			});
			return stripe.paymentLinks.create.mock.calls[0];
		};

		it("collects the payer and the student name", async () => {
			const [params] = await call();

			expect(params.custom_fields).toEqual([
				{ key: "payerName", type: "text", label: { type: "custom", custom: "Имя и фамилия плательщика" } },
				{ key: "studentName", type: "text", label: { type: "custom", custom: "Имя и фамилия ученика" } },
			]);
			// optional не указан — Stripe считает такое поле обязательным.
			for (const field of params.custom_fields) {
				expect(field.optional).toBeUndefined();
			}
		});

		it("shows a thank-you screen instead of redirecting anywhere", async () => {
			const [params] = await call();

			expect(params.after_completion).toEqual({
				type: "hosted_confirmation",
				hosted_confirmation: { custom_message: "Благодарим за оплату! До встречи на занятиях!" },
			});
		});

		it("explains itself on a spent link and labels the button as a payment", async () => {
			const [params] = await call();

			expect(params.inactive_message).toContain("уже оплачена");
			expect(params.submit_type).toBe("pay");
		});

		it("keeps the link single-use and passes metadata with the idempotency key", async () => {
			const [params, options] = await call();

			expect(params.restrictions).toEqual({ completed_sessions: { limit: 1 } });
			expect(params.line_items).toEqual([{ price: "price_1", quantity: 4 }]);
			expect(params.metadata).toEqual({ payment_id: "11" });
			expect(options).toEqual({ idempotencyKey: "invoice-11" });
		});

		it("does not leak payment methods into the request: they come from the account settings", async () => {
			const [params] = await call();

			// Список методов намеренно не задан — Stripe сам отфильтрует их по валюте счёта
			// (BLIK только для PLN, Revolut Pay для EUR и т.д.).
			expect(params.payment_method_types).toBeUndefined();
		});

		it("asks for nothing extra from a student who already answered", async () => {
			const [params] = await call({ collectTermsOfService: false, collectMarketingConsent: false });

			expect(params.custom_fields.map((f: { key: string }) => f.key)).toEqual(["payerName", "studentName"]);
			expect(params.consent_collection).toBeUndefined();
		});

		it("adds the terms checkbox on its own", async () => {
			const [params] = await call({ collectTermsOfService: true, collectMarketingConsent: false });

			expect(params.consent_collection).toEqual({ terms_of_service: "required" });
			expect(params.custom_fields).toHaveLength(2);
		});

		it("adds the marketing dropdown on its own", async () => {
			const [params] = await call({ collectTermsOfService: false, collectMarketingConsent: true });

			expect(params.consent_collection).toBeUndefined();
			expect(params.custom_fields).toHaveLength(3);
			expect(params.custom_fields[2]).toEqual({
				key: "marketingConsent",
				type: "dropdown",
				label: { type: "custom", custom: "Использование фото/видео в маркетинговых целях" },
				dropdown: {
					options: [
						{
							label: "Да, даю согласие на использование фото и видео моего ребёнка в маркетинговых целях школы.",
							value: "yes",
						},
						{
							label: "Нет, не даю согласие на использование фото и видео моего ребёнка в маркетинговых целях школы.",
							value: "no",
						},
					],
				},
			});
		});

		it("stays inside the Stripe limits when both consents are collected", async () => {
			const [params] = await call({ collectTermsOfService: true, collectMarketingConsent: true });

			// Stripe разрешает не больше трёх кастомных полей — мы ровно на потолке,
			// поэтому следующее поле потребует убрать существующее.
			expect(params.custom_fields).toHaveLength(3);
			for (const field of params.custom_fields) {
				expect(field.label.custom.length).toBeLessThanOrEqual(50);
				expect(field.key).toMatch(/^[a-zA-Z0-9]+$/);
			}
			for (const option of params.custom_fields[2].dropdown.options) {
				expect(option.label.length).toBeLessThanOrEqual(100);
				expect(option.value).toMatch(/^[a-zA-Z0-9]+$/);
			}
		});

		it("does not mutate the shared base fields between calls", async () => {
			await call({ collectTermsOfService: false, collectMarketingConsent: true });
			await call({ collectTermsOfService: false, collectMarketingConsent: false });

			expect(stripe.paymentLinks.create.mock.calls[1][0].custom_fields).toHaveLength(2);
		});

		it("turns a Stripe failure into 503", async () => {
			stripe.paymentLinks.create.mockRejectedValue(new Error("stripe down"));

			await expect(service.createPaymentLink({ items: [{ priceId: "price_1", quantity: 1 }] })).rejects.toThrow(ServiceUnavailableException);
		});
	});

	describe("createProductWithPrice", () => {
		it("sends the price in minor units and a lowercase currency", async () => {
			await service.createProductWithPrice({ planId: 7, name: "Индивидуально 45 мин", priceMajor: 50, currency: Currency.EUR });

			expect(stripe.prices.create).toHaveBeenCalledWith({ product: "prod_1", unit_amount: 5000, currency: "eur" }, { idempotencyKey: "plan-7-price" });
			expect(stripe.products.create).toHaveBeenCalledWith({ name: "Индивидуально 45 мин", metadata: { plan_id: "7" } }, { idempotencyKey: "plan-7-product" });
		});
	});
});
