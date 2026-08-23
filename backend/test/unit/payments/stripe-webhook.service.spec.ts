import { Test, TestingModule } from "@nestjs/testing";
import Stripe = require("stripe");
import { StripeWebhookService } from "../../../src/modules/payments/application/stripe-webhook.service";
import { PaymentsRepositoryPort } from "../../../src/modules/payments/application/ports/payments.repository.port";
import { PaymentsMetrics } from "../../../src/modules/payments/application/payments.metrics";
import { BalanceService } from "../../../src/modules/balance/application/balance.service";
import { PaymentStatusEnum } from "../../../src/modules/balance/domain/payment-status.enum";
import { PaymentTypeEnum } from "../../../src/modules/balance/domain/payment-type.enum";
import { StripeService } from "../../../src/infrastructure/stripe/stripe.service";
import { TelegramService } from "../../../src/modules/telegram/application/telegram.service";
import { StudentService } from "../../../src/modules/student/application/student.service";
import { stripeConfig } from "../../../src/config/namespaces/stripe.config";
import { Currency } from "../../../src/shared/enums/currency.enum";

describe("StripeWebhookService", () => {
	let service: StripeWebhookService;
	let paymentsRepository: jest.Mocked<PaymentsRepositoryPort>;
	let balanceService: jest.Mocked<BalanceService>;
	let telegramService: jest.Mocked<TelegramService>;
	let studentService: jest.Mocked<StudentService>;

	const invoice = {
		id: 7,
		student_id: 1,
		type: PaymentTypeEnum.STRIPE_PAYMENT,
		status: PaymentStatusEnum.PENDING,
		amount: 120,
		currency: Currency.PLN,
		discount_percent: 0,
		period_start: new Date(Date.UTC(2026, 7, 1)),
		period_end: new Date(Date.UTC(2026, 7, 31)),
	};

	const appliedResult = {
		outcome: "APPLIED" as const,
		balance: 30,
		balance_currency: Currency.PLN,
		allocated: [{ lesson_id: 1, amount: 40, new_status: "PENDING_PAID" as any }],
		reverted: [],
		payment_id: 7,
	};

	const session = (overrides: Partial<Stripe.Checkout.Session> = {}): Stripe.Checkout.Session =>
		({
			id: "cs_test_1",
			payment_status: "paid",
			currency: "pln",
			amount_total: 15000,
			payment_link: "plink_1",
			payment_intent: "pi_1",
			metadata: {},
			...overrides,
		}) as Stripe.Checkout.Session;

	const event = (type: string, object: unknown, id = "evt_1"): Stripe.Event => ({ id, type, data: { object } }) as Stripe.Event;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				StripeWebhookService,
				{ provide: stripeConfig.KEY, useValue: { stripeSecretKey: "sk_test", stripeWebhookSecret: "whsec_test" } },
				{ provide: StripeService, useValue: { constructWebhookEvent: jest.fn() } },
				{
					provide: PaymentsRepositoryPort,
					useValue: {
						claimWebhookEvent: jest.fn().mockResolvedValue(true),
						markWebhookEventProcessed: jest.fn(),
						findByPaymentLinkId: jest.fn().mockResolvedValue({ ...invoice }),
						findById: jest.fn(),
						findByCheckoutSessionId: jest.fn().mockResolvedValue(null),
						findByRefundId: jest.fn().mockResolvedValue(null),
						findSucceededByPaymentIntentId: jest.fn().mockResolvedValue({ ...invoice, status: PaymentStatusEnum.SUCCEEDED, amount: 150 }),
						setStatus: jest.fn(),
					},
				},
				{ provide: BalanceService, useValue: { reconcile: jest.fn().mockResolvedValue(appliedResult) } },
				{ provide: TelegramService, useValue: { sendMessageToAdmin: jest.fn() } },
				{ provide: StudentService, useValue: { recordConsentsFromCheckout: jest.fn() } },
				{ provide: PaymentsMetrics, useValue: { payment: jest.fn(), webhookEvent: jest.fn() } },
			],
		}).compile();

		service = module.get(StripeWebhookService);
		paymentsRepository = module.get(PaymentsRepositoryPort);
		balanceService = module.get(BalanceService);
		telegramService = module.get(TelegramService);
		studentService = module.get(StudentService);
	});

	describe("ответ про фото/видео со страницы оплаты", () => {
		const withConsents = (marketing?: string) =>
			session({
				// Принятие условий страница собирает на каждой оплате, но нигде не сохраняется.
				consent: { terms_of_service: "accepted", promotions: null },
				custom_fields: marketing ? ([{ key: "marketingConsent", type: "dropdown", dropdown: { value: marketing } }] as any) : ([] as any),
			});

		it("records the marketing answer", async () => {
			await service.handleEvent(event("checkout.session.completed", withConsents("yes")));

			expect(studentService.recordConsentsFromCheckout).toHaveBeenCalledWith(1, { marketingConsent: true });
		});

		it("records a refusal as a real answer", async () => {
			await service.handleEvent(event("checkout.session.completed", withConsents("no")));

			expect(studentService.recordConsentsFromCheckout).toHaveBeenCalledWith(1, { marketingConsent: false });
		});

		it("stays quiet for a session that carries no answer at all", async () => {
			// Так выглядит оплата ученика, который уже ответил, и ссылок, созданных до фичи.
			const result = await service.handleEvent(event("checkout.session.completed", session()));

			expect(studentService.recordConsentsFromCheckout).not.toHaveBeenCalled();
			expect(result).toBe("handled");
		});

		it("does not fail on an unknown dropdown value", async () => {
			// Значение не разобрано — записывать нечего, но платёж должен пройти.
			const result = await service.handleEvent(event("checkout.session.completed", withConsents("maybe")));

			expect(studentService.recordConsentsFromCheckout).not.toHaveBeenCalled();
			expect(result).toBe("handled");
		});

		it("writes the answer before touching the money", async () => {
			await service.handleEvent(event("checkout.session.completed", withConsents("yes")));

			// Если запись согласия упадёт, деньги ещё не тронуты и ретрай Stripe пройдёт заново.
			expect((studentService.recordConsentsFromCheckout as jest.Mock).mock.invocationCallOrder[0]).toBeLessThan(
				(balanceService.reconcile as jest.Mock).mock.invocationCallOrder[0],
			);
		});

		it("still records the answer when the invoice was already paid", async () => {
			paymentsRepository.findByPaymentLinkId.mockResolvedValue({ ...invoice, status: PaymentStatusEnum.SUCCEEDED } as any);

			const result = await service.handleEvent(event("checkout.session.completed", withConsents("yes")));

			expect(studentService.recordConsentsFromCheckout).toHaveBeenCalled();
			expect(result).toBe("ignored");
			expect(balanceService.reconcile).not.toHaveBeenCalled();
		});

		it("lets a storage failure through so Stripe retries", async () => {
			studentService.recordConsentsFromCheckout.mockRejectedValue(new Error("db down"));

			await expect(service.handleEvent(event("checkout.session.completed", withConsents("yes")))).rejects.toThrow("db down");
			expect(balanceService.reconcile).not.toHaveBeenCalled();
			expect(paymentsRepository.markWebhookEventProcessed).not.toHaveBeenCalled();
		});
	});

	describe("idempotency", () => {
		it("skips an event that was already processed", async () => {
			paymentsRepository.claimWebhookEvent.mockResolvedValue(false);

			expect(await service.handleEvent(event("checkout.session.completed", session()))).toBe("ignored");
			expect(balanceService.reconcile).not.toHaveBeenCalled();
		});

		it("reprocesses an event whose previous attempt failed", async () => {
			// claimWebhookEvent возвращает true, когда processed_at пуст: Stripe ретраит именно такие.
			paymentsRepository.claimWebhookEvent.mockResolvedValue(true);

			expect(await service.handleEvent(event("checkout.session.completed", session()))).toBe("handled");
			expect(balanceService.reconcile).toHaveBeenCalled();
		});

		it("leaves processed_at empty on a transient failure so Stripe retries", async () => {
			balanceService.reconcile.mockRejectedValue(new Error("db down"));

			await expect(service.handleEvent(event("checkout.session.completed", session()))).rejects.toThrow("db down");
			expect(paymentsRepository.markWebhookEventProcessed).not.toHaveBeenCalled();
		});
	});

	describe("checkout.session.completed", () => {
		it("credits the actual amount paid", async () => {
			await service.handleEvent(event("checkout.session.completed", session()));

			expect(balanceService.reconcile).toHaveBeenCalledWith(
				expect.objectContaining({
					studentId: 1,
					delta: 150,
					currency: Currency.PLN,
					payment: expect.objectContaining({ kind: "settle", paymentId: 7, amount: 150 }),
				}),
			);
		});

		it("spreads the money by the discount stored on the invoice", async () => {
			// Скидку могли изменить после выставления — раскладывать надо по той, за которую заплатили.
			paymentsRepository.findByPaymentLinkId.mockResolvedValue({ ...invoice, discount_percent: 10 } as any);

			await service.handleEvent(event("checkout.session.completed", session()));

			expect(balanceService.reconcile).toHaveBeenCalledWith(expect.objectContaining({ discountPercent: 10 }));
		});

		it("waits for the async confirmation when the payment is not settled yet", async () => {
			const result = await service.handleEvent(event("checkout.session.completed", session({ payment_status: "unpaid" })));

			// Отложенные способы (BLIK, P24) досылают async_payment_succeeded.
			expect(result).toBe("ignored");
			expect(balanceService.reconcile).not.toHaveBeenCalled();
		});

		it("credits on async_payment_succeeded", async () => {
			expect(await service.handleEvent(event("checkout.session.async_payment_succeeded", session()))).toBe("handled");
			expect(balanceService.reconcile).toHaveBeenCalled();
		});

		it("marks the invoice failed on async_payment_failed", async () => {
			expect(await service.handleEvent(event("checkout.session.async_payment_failed", session()))).toBe("handled");
			expect(paymentsRepository.setStatus).toHaveBeenCalledWith(7, PaymentStatusEnum.FAILED);
			expect(telegramService.sendMessageToAdmin).toHaveBeenCalled();
		});

		it("ignores a repeated payment for an already settled invoice", async () => {
			paymentsRepository.findByPaymentLinkId.mockResolvedValue({ ...invoice, status: PaymentStatusEnum.SUCCEEDED } as any);

			expect(await service.handleEvent(event("checkout.session.completed", session()))).toBe("ignored");
			expect(balanceService.reconcile).not.toHaveBeenCalled();
		});

		it("reports a currency mismatch as a business error", async () => {
			const result = await service.handleEvent(event("checkout.session.completed", session({ currency: "eur" })));

			expect(result).toBe("business_error");
			expect(paymentsRepository.markWebhookEventProcessed).toHaveBeenCalledWith("evt_1", expect.stringContaining("валюта оплаты"));
			expect(balanceService.reconcile).not.toHaveBeenCalled();
		});

		it("reports an unknown invoice as a business error", async () => {
			paymentsRepository.findByPaymentLinkId.mockResolvedValue(null);

			expect(await service.handleEvent(event("checkout.session.completed", session()))).toBe("business_error");
			expect(telegramService.sendMessageToAdmin).toHaveBeenCalled();
		});

		it("falls back to metadata when the link is unknown", async () => {
			paymentsRepository.findByPaymentLinkId.mockResolvedValue(null);
			paymentsRepository.findById.mockResolvedValue({ ...invoice } as any);

			expect(await service.handleEvent(event("checkout.session.completed", session({ metadata: { payment_id: "7" } })))).toBe("handled");
			expect(paymentsRepository.findById).toHaveBeenCalledWith(7);
		});

		it("parks a payment that conflicts with the balance currency", async () => {
			balanceService.reconcile.mockResolvedValue({
				outcome: "CURRENCY_CONFLICT",
				balance: 40,
				balance_currency: Currency.EUR,
				allocated: [],
				reverted: [],
				payment_id: 7,
				conflict: { balance: 40, balance_currency: Currency.EUR, payment_currency: Currency.PLN },
			});

			expect(await service.handleEvent(event("checkout.session.completed", session()))).toBe("business_error");
			expect(telegramService.sendMessageToAdmin).toHaveBeenCalledWith(expect.stringContaining("отложен"));
		});
	});

	describe("refund.created", () => {
		const refund = (overrides: Partial<Stripe.Refund> = {}): Stripe.Refund =>
			({ id: "re_1", status: "succeeded", amount: 4000, payment_intent: "pi_1", ...overrides }) as Stripe.Refund;

		it("books a negative payment and allows the balance to go negative", async () => {
			await service.handleEvent(event("refund.created", refund()));

			expect(balanceService.reconcile).toHaveBeenCalledWith(
				expect.objectContaining({
					delta: -40,
					allowNegativeBalance: true,
					payment: expect.objectContaining({
						kind: "create",
						data: expect.objectContaining({ type: PaymentTypeEnum.STRIPE_REFUND, amount: -40, stripe_refund_id: "re_1" }),
					}),
				}),
			);
		});

		it("books each partial refund separately", async () => {
			// Каждый refund.created несёт сумму именно этого возврата, а не накопительную —
			// поэтому два частичных возврата не списывают деньги дважды.
			await service.handleEvent(event("refund.created", refund({ id: "re_1", amount: 4000 }), "evt_1"));
			await service.handleEvent(event("refund.created", refund({ id: "re_2", amount: 2000 }), "evt_2"));

			expect(balanceService.reconcile).toHaveBeenNthCalledWith(1, expect.objectContaining({ delta: -40 }));
			expect(balanceService.reconcile).toHaveBeenNthCalledWith(2, expect.objectContaining({ delta: -20 }));
		});

		it("ignores a refund that was already booked", async () => {
			paymentsRepository.findByRefundId.mockResolvedValue({ id: 9 } as any);

			expect(await service.handleEvent(event("refund.created", refund()))).toBe("ignored");
			expect(balanceService.reconcile).not.toHaveBeenCalled();
		});

		it("ignores a refund that has not succeeded", async () => {
			expect(await service.handleEvent(event("refund.created", refund({ status: "pending" })))).toBe("ignored");
		});

		it("reports a refund without a matching payment", async () => {
			paymentsRepository.findSucceededByPaymentIntentId.mockResolvedValue(null);

			expect(await service.handleEvent(event("refund.created", refund()))).toBe("business_error");
		});

		it("warns the admin when the balance goes negative", async () => {
			balanceService.reconcile.mockResolvedValue({ ...appliedResult, balance: -10 });

			await service.handleEvent(event("refund.created", refund()));

			expect(telegramService.sendMessageToAdmin).toHaveBeenCalledWith(expect.stringContaining("ушёл в минус"));
		});
	});

	it("ignores event types it does not handle", async () => {
		expect(await service.handleEvent(event("customer.created", {}))).toBe("ignored");
	});
});
