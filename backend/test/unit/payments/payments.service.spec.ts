import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { PaymentsService } from "../../../src/modules/payments/application/payments.service";
import { PaymentsRepositoryPort } from "../../../src/modules/payments/application/ports/payments.repository.port";
import { PaymentsMetrics } from "../../../src/modules/payments/application/payments.metrics";
import { BalanceService } from "../../../src/modules/balance/application/balance.service";
import { BalanceRepositoryPort } from "../../../src/modules/balance/application/ports/balance.repository.port";
import { PaymentStatusEnum } from "../../../src/modules/balance/domain/payment-status.enum";
import { PaymentTypeEnum } from "../../../src/modules/balance/domain/payment-type.enum";
import { StripeService } from "../../../src/infrastructure/stripe/stripe.service";
import { PlanService } from "../../../src/modules/plan/application/plan.service";
import { TelegramService } from "../../../src/modules/telegram/application/telegram.service";
import { Currency } from "../../../src/shared/enums/currency.enum";

describe("PaymentsService", () => {
	let service: PaymentsService;
	let paymentsRepository: jest.Mocked<PaymentsRepositoryPort>;
	let balanceService: jest.Mocked<BalanceService>;
	let stripeService: jest.Mocked<StripeService>;
	let planService: jest.Mocked<PlanService>;
	let telegramService: jest.Mocked<TelegramService>;

	const from = new Date(Date.UTC(2026, 7, 1));
	const to = new Date(Date.UTC(2026, 7, 31, 23, 59, 59, 999));

	const student = {
		id: 1,
		name: "Тестовый Ученик",
		class: 5,
		balance: 0,
		balance_currency: null as Currency | null,
		discount: 0,
		deleted_at: null as Date | null,
		marketing_answered: false,
	};

	const billableLesson = (id: number, day: number, price: number, currency = Currency.PLN, planId = 1, isFree = false) => ({
		id,
		date: new Date(Date.UTC(2026, 7, day, 10, 0, 0)),
		plan_id: planId,
		plan_name: "Индивидуально 60 мин",
		plan_type: "INDIVIDUAL",
		plan_price: price,
		plan_currency: currency,
		stripe_price_id: `price_${planId}`,
		is_free: isFree,
	});

	const invoiceRow = { id: 7, student_id: 1, period_start: from, period_end: to, stripe_payment_link_id: null, status: PaymentStatusEnum.PENDING };

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				PaymentsService,
				{
					provide: PaymentsRepositoryPort,
					useValue: {
						getActiveStudents: jest.fn().mockResolvedValue([student]),
						getStudentById: jest.fn().mockResolvedValue({ ...student }),
						getBillableLessons: jest.fn().mockResolvedValue([]),
						findPendingInvoice: jest.fn().mockResolvedValue(null),
						findById: jest.fn(),
						findByPaymentLinkId: jest.fn(),
						findByCheckoutSessionId: jest.fn(),
						findSucceededByPaymentIntentId: jest.fn(),
						findByRefundId: jest.fn(),
						createInvoice: jest.fn().mockResolvedValue({ ...invoiceRow }),
						setPaymentLink: jest.fn(),
						setStatus: jest.fn(),
						list: jest.fn().mockResolvedValue([]),
						claimWebhookEvent: jest.fn(),
						markWebhookEventProcessed: jest.fn(),
					},
				},
				{
					provide: BalanceRepositoryPort,
					useValue: { withStudentLock: jest.fn(async (_id: number, fn: any) => fn({})), getActiveAllocationsDesc: jest.fn().mockResolvedValue([]) },
				},
				{
					provide: BalanceService,
					useValue: {
						reconcile: jest.fn().mockResolvedValue({ outcome: "APPLIED", balance: 0, balance_currency: null, allocated: [], reverted: [], payment_id: null }),
					},
				},
				{
					provide: StripeService,
					useValue: {
						createPaymentLink: jest.fn().mockResolvedValue({ id: "plink_1", url: "https://buy.stripe.com/test_1" }),
						deactivatePaymentLink: jest.fn(),
					},
				},
				{
					provide: PlanService,
					useValue: {
						ensureStripeIds: jest.fn(async (id: number) => ({ id, plan_price: 40 * id, stripe_price_id: `price_${id}`, stripe_product_id: `prod_${id}` })),
					},
				},
				{ provide: TelegramService, useValue: { sendMessageToAdmin: jest.fn() } },
				{ provide: PaymentsMetrics, useValue: { payment: jest.fn(), webhookEvent: jest.fn() } },
			],
		}).compile();

		service = module.get(PaymentsService);
		paymentsRepository = module.get(PaymentsRepositoryPort);
		balanceService = module.get(BalanceService);
		stripeService = module.get(StripeService);
		planService = module.get(PlanService);
		telegramService = module.get(TelegramService);
	});

	const createInvoice = (throwOnSkip = false) => service.createInvoice({ studentId: 1, from, to, createdById: 1, throwOnSkip });

	describe("createInvoice", () => {
		it("spends the balance before calculating the invoice", async () => {
			paymentsRepository.getBillableLessons.mockResolvedValue([billableLesson(1, 5, 40)]);

			await createInvoice();

			// Иначе ученик заплатил бы второй раз за занятия, уже покрытые остатком.
			expect(balanceService.reconcile).toHaveBeenCalledWith(expect.objectContaining({ delta: 0, reason: "invoice:pre-reconcile" }));
			expect(balanceService.reconcile.mock.invocationCallOrder[0]).toBeLessThan(paymentsRepository.createInvoice.mock.invocationCallOrder[0]);
		});

		it("creates a payment link for PLN lessons", async () => {
			paymentsRepository.getBillableLessons.mockResolvedValue([billableLesson(1, 5, 40), billableLesson(2, 12, 40), billableLesson(3, 19, 40)]);

			const result = await createInvoice();

			expect(result).toEqual({ payment_id: 7, student_id: 1, amount: 120, currency: Currency.PLN, lessons_count: 3, link: "https://buy.stripe.com/test_1" });
			expect(paymentsRepository.setPaymentLink).toHaveBeenCalledWith(7, "plink_1");
			expect(telegramService.sendMessageToAdmin).toHaveBeenCalled();
		});

		it("groups line items by plan", async () => {
			paymentsRepository.getBillableLessons.mockResolvedValue([
				billableLesson(1, 5, 40, Currency.PLN, 1),
				billableLesson(2, 12, 40, Currency.PLN, 1),
				billableLesson(3, 19, 60, Currency.PLN, 2),
			]);

			await createInvoice();

			expect(stripeService.createPaymentLink).toHaveBeenCalledWith(
				expect.objectContaining({
					items: [
						{ priceId: "price_1", quantity: 2 },
						{ priceId: "price_2", quantity: 1 },
					],
					idempotencyKey: "invoice-7",
				}),
			);
		});

		it("discounts every lesson and stores the discount on the invoice", async () => {
			paymentsRepository.getStudentById.mockResolvedValue({ ...student, discount: 10 });
			paymentsRepository.getBillableLessons.mockResolvedValue([billableLesson(1, 5, 100), billableLesson(2, 12, 100)]);

			const result = await createInvoice();

			// 2 × round(100 × 0.9), а не round(200 × 0.9) — иначе итог разошёлся бы со списаниями.
			expect(result?.amount).toBe(180);
			expect(paymentsRepository.createInvoice).toHaveBeenCalledWith(expect.objectContaining({ amount: 180, discount_percent: 10 }));
		});

		it("sends an ad-hoc price instead of the plan price when the student has a discount", async () => {
			paymentsRepository.getStudentById.mockResolvedValue({ ...student, discount: 10 });
			paymentsRepository.getBillableLessons.mockResolvedValue([billableLesson(1, 5, 40, Currency.PLN, 1), billableLesson(2, 12, 40, Currency.PLN, 1)]);

			await createInvoice();

			expect(stripeService.createPaymentLink).toHaveBeenCalledWith(
				expect.objectContaining({
					items: [{ productId: "prod_1", unitAmountMajor: 36, currency: Currency.PLN, quantity: 2 }],
				}),
			);
		});

		it("asks a first-time payer for both consents", async () => {
			paymentsRepository.getBillableLessons.mockResolvedValue([billableLesson(1, 5, 40)]);

			await createInvoice();

			expect(stripeService.createPaymentLink).toHaveBeenCalledWith(
				expect.objectContaining({ consents: { collectTermsOfService: true, collectMarketingConsent: true } }),
			);
		});

		it("asks a returning payer to accept the terms again, but not about the photos", async () => {
			// Условия принимаются к каждому счёту, поэтому прошлый ответ ссылку не сокращает.
			paymentsRepository.getStudentById.mockResolvedValue({ ...student, marketing_answered: true });
			paymentsRepository.getBillableLessons.mockResolvedValue([billableLesson(1, 5, 40)]);

			await createInvoice();

			expect(stripeService.createPaymentLink).toHaveBeenCalledWith(
				expect.objectContaining({ consents: { collectTermsOfService: true, collectMarketingConsent: false } }),
			);
		});

		it("creates Stripe prices lazily for legacy plans", async () => {
			paymentsRepository.getBillableLessons.mockResolvedValue([billableLesson(1, 5, 40)]);

			await createInvoice();

			expect(planService.ensureStripeIds).toHaveBeenCalledWith(1);
		});

		it("issues a BYN invoice without a payment link", async () => {
			paymentsRepository.getBillableLessons.mockResolvedValue([billableLesson(1, 5, 25, Currency.BYN)]);

			const result = await createInvoice();

			expect(result?.link).toBeNull();
			expect(stripeService.createPaymentLink).not.toHaveBeenCalled();
			expect(telegramService.sendMessageToAdmin).toHaveBeenCalled();
		});

		it("still sends the report when Stripe is down", async () => {
			paymentsRepository.getBillableLessons.mockResolvedValue([billableLesson(1, 5, 40)]);
			stripeService.createPaymentLink.mockRejectedValue(new Error("stripe down"));

			const result = await createInvoice();

			// Недоступность платёжки не должна лишать администратора отчёта.
			expect(result?.link).toBeNull();
			expect(telegramService.sendMessageToAdmin).toHaveBeenCalled();
		});

		it("excludes free lessons from the total", async () => {
			paymentsRepository.getBillableLessons.mockResolvedValue([billableLesson(1, 5, 40), billableLesson(2, 12, 40, Currency.PLN, 1, true)]);

			const result = await createInvoice();

			expect(result?.amount).toBe(40);
			expect(result?.lessons_count).toBe(1);
		});

		it("skips a student without lessons", async () => {
			paymentsRepository.getBillableLessons.mockResolvedValue([]);

			expect(await createInvoice()).toBeNull();
			expect(paymentsRepository.createInvoice).not.toHaveBeenCalled();
		});

		it("reports an error for a manual invoice with no lessons", async () => {
			paymentsRepository.getBillableLessons.mockResolvedValue([]);

			await expect(createInvoice(true)).rejects.toThrow(BadRequestException);
		});

		it("refuses to invoice lessons in mixed currencies", async () => {
			paymentsRepository.getBillableLessons.mockResolvedValue([billableLesson(1, 5, 40, Currency.PLN), billableLesson(2, 12, 40, Currency.EUR)]);

			expect(await createInvoice()).toBeNull();
			expect(paymentsRepository.createInvoice).not.toHaveBeenCalled();
			expect(telegramService.sendMessageToAdmin).toHaveBeenCalledWith(expect.stringContaining("в разных валютах"));
		});

		it("refuses to invoice when the balance is in another currency", async () => {
			paymentsRepository.getStudentById.mockResolvedValue({ ...student, balance: 40, balance_currency: Currency.EUR });
			paymentsRepository.getBillableLessons.mockResolvedValue([billableLesson(1, 5, 40, Currency.PLN)]);

			expect(await createInvoice()).toBeNull();
			expect(stripeService.createPaymentLink).not.toHaveBeenCalled();
			expect(telegramService.sendMessageToAdmin).toHaveBeenCalledWith(expect.stringContaining("на балансе"));
		});

		it("cancels the previous invoice for the same period", async () => {
			paymentsRepository.getBillableLessons.mockResolvedValue([billableLesson(1, 5, 40)]);
			paymentsRepository.findPendingInvoice.mockResolvedValue({ ...invoiceRow, id: 5, stripe_payment_link_id: "plink_old" } as any);

			await createInvoice();

			expect(stripeService.deactivatePaymentLink).toHaveBeenCalledWith("plink_old");
			expect(paymentsRepository.setStatus).toHaveBeenCalledWith(5, PaymentStatusEnum.CANCELED);
		});

		it("omits the link when the invoice exceeds the Stripe line item limit", async () => {
			paymentsRepository.getBillableLessons.mockResolvedValue(
				Array.from({ length: 21 }, (_, index) => billableLesson(index + 1, 1, 40, Currency.PLN, index + 1)),
			);

			const result = await createInvoice();

			expect(result?.link).toBeNull();
			expect(stripeService.createPaymentLink).not.toHaveBeenCalled();
		});

		it("rejects a deleted student", async () => {
			paymentsRepository.getStudentById.mockResolvedValue({ ...student, deleted_at: new Date() });

			await expect(createInvoice()).rejects.toThrow(BadRequestException);
		});

		it("rejects an unknown student", async () => {
			paymentsRepository.getStudentById.mockResolvedValue(null);

			await expect(createInvoice()).rejects.toThrow(NotFoundException);
		});
	});

	describe("issueMonthlyInvoices", () => {
		it("keeps going when one student fails", async () => {
			paymentsRepository.getActiveStudents.mockResolvedValue([student, { ...student, id: 2 }, { ...student, id: 3 }]);
			paymentsRepository.getStudentById
				.mockResolvedValueOnce({ ...student })
				.mockRejectedValueOnce(new Error("db hiccup"))
				.mockResolvedValueOnce({ ...student, id: 3 });
			paymentsRepository.getBillableLessons.mockResolvedValue([billableLesson(1, 5, 40)]);

			await service.issueMonthlyInvoices(new Date(Date.UTC(2026, 7, 1, 10, 0, 0)));

			// Ошибка одного ученика не должна прерывать рассылку остальным.
			expect(paymentsRepository.createInvoice).toHaveBeenCalledTimes(2);
		});
	});

	describe("adjustBalance", () => {
		it("requires a currency when the balance is empty", async () => {
			await expect(service.adjustBalance(1, { amount: 100, comment: "оплата наличными" }, 1)).rejects.toThrow(BadRequestException);
		});

		it("rejects a currency that differs from a non-empty balance", async () => {
			paymentsRepository.getStudentById.mockResolvedValue({ ...student, balance: 40, balance_currency: Currency.EUR });

			await expect(service.adjustBalance(1, { amount: 100, currency: Currency.PLN, comment: "оплата" }, 1)).rejects.toThrow(BadRequestException);
		});

		it("records a manual adjustment", async () => {
			balanceService.reconcile.mockResolvedValue({
				outcome: "APPLIED",
				balance: 70,
				balance_currency: Currency.PLN,
				allocated: [{ lesson_id: 1, amount: 30, new_status: "PENDING_PAID" as any }],
				reverted: [],
				payment_id: 3,
			});

			const result = await service.adjustBalance(1, { amount: 100, currency: Currency.PLN, comment: "оплата наличными" }, 1);

			expect(balanceService.reconcile).toHaveBeenCalledWith(
				expect.objectContaining({
					delta: 100,
					currency: Currency.PLN,
					payment: expect.objectContaining({ kind: "create", data: expect.objectContaining({ type: PaymentTypeEnum.MANUAL_ADJUSTMENT }) }),
				}),
			);
			expect(result).toEqual({ balance: 70, balance_currency: Currency.PLN, affected_lessons: [{ lesson_id: 1, amount: 30, new_status: "PENDING_PAID" }] });
		});
	});

	describe("applyParkedPayment", () => {
		it("rejects a payment that is not parked", async () => {
			paymentsRepository.findById.mockResolvedValue({ ...invoiceRow, status: PaymentStatusEnum.SUCCEEDED } as any);

			await expect(service.applyParkedPayment(7)).rejects.toThrow(BadRequestException);
		});

		it("reports an unresolved conflict", async () => {
			paymentsRepository.findById.mockResolvedValue({
				...invoiceRow,
				status: PaymentStatusEnum.REQUIRES_ATTENTION,
				amount: 30,
				currency: Currency.PLN,
			} as any);
			balanceService.reconcile.mockResolvedValue({
				outcome: "CURRENCY_CONFLICT",
				balance: 40,
				balance_currency: Currency.EUR,
				allocated: [],
				reverted: [],
				payment_id: 7,
				conflict: { balance: 40, balance_currency: Currency.EUR, payment_currency: Currency.PLN },
			});

			await expect(service.applyParkedPayment(7)).rejects.toThrow(BadRequestException);
		});
	});

	describe("cancelInvoice", () => {
		it("deactivates the link and cancels the invoice", async () => {
			paymentsRepository.findById.mockResolvedValue({ ...invoiceRow, stripe_payment_link_id: "plink_1" } as any);

			await service.cancelInvoice(7);

			expect(stripeService.deactivatePaymentLink).toHaveBeenCalledWith("plink_1");
			expect(paymentsRepository.setStatus).toHaveBeenCalledWith(7, PaymentStatusEnum.CANCELED);
		});

		it("refuses to cancel an already paid invoice", async () => {
			paymentsRepository.findById.mockResolvedValue({ ...invoiceRow, status: PaymentStatusEnum.SUCCEEDED } as any);

			await expect(service.cancelInvoice(7)).rejects.toThrow(BadRequestException);
		});
	});

	describe("parsePeriod", () => {
		it("rejects a reversed period", () => {
			expect(() => service.parsePeriod("2026-08-31", "2026-08-01")).toThrow(BadRequestException);
		});
	});
});
