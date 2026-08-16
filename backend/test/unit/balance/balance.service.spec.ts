import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException } from "@nestjs/common";
import { BalanceService } from "../../../src/modules/balance/application/balance.service";
import { BalanceRepositoryPort } from "../../../src/modules/balance/application/ports/balance.repository.port";
import { PaymentStatusEnum } from "../../../src/modules/balance/domain/payment-status.enum";
import { PaymentTypeEnum } from "../../../src/modules/balance/domain/payment-type.enum";
import { LessonStatusEnum } from "../../../src/modules/lesson/interface/dto/lesson-status.enum";
import { Currency } from "../../../src/shared/enums/currency.enum";

/**
 * Тесты ядра баланса. Репозиторий подменён in-memory реализацией: она держит ученика,
 * занятия и аллокации в обычных массивах, поэтому проверяется именно логика распределения
 * денег, а не запросы Prisma.
 */
describe("BalanceService", () => {
	let service: BalanceService;
	let repository: FakeBalanceRepository;

	type FakeLesson = {
		id: number;
		date: Date;
		status: LessonStatusEnum;
		plan_id: number;
		plan_price: number;
		plan_currency: Currency;
	};

	type FakeAllocation = {
		lesson_payment_id: number;
		lesson_id: number;
		amount: number;
		currency: Currency;
		reverted: boolean;
	};

	class FakeBalanceRepository {
		student = { id: 1, balance: 0, balance_currency: null as Currency | null, deleted_at: null as Date | null };
		lessons: FakeLesson[] = [];
		allocations: FakeAllocation[] = [];
		payments: Array<{ id: number; amount: number; status: PaymentStatusEnum; type: PaymentTypeEnum; currency: Currency }> = [];
		private nextAllocationId = 1;
		private nextPaymentId = 1;

		async withStudentLock<T>(_studentId: number, fn: (tx: any) => Promise<T>): Promise<T> {
			return fn({});
		}

		async getStudentForUpdate() {
			return { ...this.student };
		}

		async getStudentSnapshot() {
			return { ...this.student };
		}

		async updateStudentBalance(_tx: any, _studentId: number, balance: number, currency: Currency | null) {
			this.student.balance = balance;
			this.student.balance_currency = currency;
		}

		async createPayment(_tx: any, data: any) {
			const payment = { ...data, id: this.nextPaymentId++ };
			this.payments.push(payment);
			return payment;
		}

		async updatePayment(_tx: any, paymentId: number, data: any) {
			const payment = this.payments.find((item) => item.id === paymentId);
			Object.assign(payment as object, data);
			return payment;
		}

		async getPaymentById(_tx: any, paymentId: number) {
			return this.payments.find((item) => item.id === paymentId) ?? null;
		}

		async getAllocatableLessons(_tx: any, _studentId: number, fromDate: Date) {
			const allocatedLessonIds = new Set(this.allocations.filter((a) => !a.reverted).map((a) => a.lesson_id));
			return this.lessons
				.filter(
					(lesson) =>
						[LessonStatusEnum.PENDING_UNPAID, LessonStatusEnum.COMPLETED_UNPAID].includes(lesson.status) &&
						lesson.date >= fromDate &&
						!allocatedLessonIds.has(lesson.id),
				)
				.sort((a, b) => a.date.getTime() - b.date.getTime() || a.id - b.id);
		}

		async allocate(_tx: any, params: any) {
			this.allocations.push({
				lesson_payment_id: this.nextAllocationId++,
				lesson_id: params.lessonId,
				amount: params.amount,
				currency: params.currency,
				reverted: false,
			});
			const lesson = this.lessons.find((item) => item.id === params.lessonId);
			if (lesson) {
				lesson.status = params.newStatus;
			}
		}

		async getActiveAllocationsDesc() {
			return this.allocations
				.filter((allocation) => !allocation.reverted)
				.map((allocation) => {
					const lesson = this.lessons.find((item) => item.id === allocation.lesson_id);
					return { ...allocation, lesson_date: lesson?.date as Date, lesson_status: lesson?.status as LessonStatusEnum };
				})
				.filter((allocation) => [LessonStatusEnum.PENDING_PAID, LessonStatusEnum.COMPLETED_PAID].includes(allocation.lesson_status))
				.sort((a, b) => b.lesson_date.getTime() - a.lesson_date.getTime() || b.lesson_payment_id - a.lesson_payment_id);
		}

		async getActiveAllocationForLesson(_tx: any, lessonId: number) {
			const allocation = this.allocations.find((item) => item.lesson_id === lessonId && !item.reverted);
			if (!allocation) {
				return null;
			}
			const lesson = this.lessons.find((item) => item.id === lessonId);
			return { ...allocation, lesson_date: lesson?.date as Date, lesson_status: lesson?.status as LessonStatusEnum };
		}

		async revertAllocation(_tx: any, lessonPaymentId: number) {
			const allocation = this.allocations.find((item) => item.lesson_payment_id === lessonPaymentId);
			if (allocation) {
				allocation.reverted = true;
			}
		}

		async setLessonStatus(_tx: any, lessonId: number, status: LessonStatusEnum) {
			const lesson = this.lessons.find((item) => item.id === lessonId);
			if (lesson) {
				lesson.status = status;
			}
		}

		async transferAllocation(_tx: any, params: any) {
			await this.revertAllocation(null, params.fromLessonPaymentId);
			this.allocations.push({
				lesson_payment_id: this.nextAllocationId++,
				lesson_id: params.toLessonId,
				amount: params.amount,
				currency: params.currency,
				reverted: false,
			});
		}

		async getBillableLessonCurrencies(_studentId: number, from: Date, to: Date) {
			return [...new Set(this.lessons.filter((lesson) => lesson.date >= from && lesson.date <= to).map((lesson) => lesson.plan_currency))];
		}

		async sumSucceededPayments() {
			return this.payments.filter((payment) => payment.status === PaymentStatusEnum.SUCCEEDED).reduce((sum, payment) => sum + payment.amount, 0);
		}

		async sumActiveAllocations() {
			return this.allocations.filter((allocation) => !allocation.reverted).reduce((sum, allocation) => sum + allocation.amount, 0);
		}

		/** Инвариант №1: баланс равен разнице учтённых платежей и активных аллокаций. */
		async invariantHolds(): Promise<boolean> {
			return this.student.balance === (await this.sumSucceededPayments()) - (await this.sumActiveAllocations());
		}
	}

	const lesson = (id: number, day: number, price: number, currency = Currency.PLN, status = LessonStatusEnum.PENDING_UNPAID): FakeLesson => ({
		id,
		date: new Date(Date.UTC(2026, 7, day, 10, 0, 0)),
		status,
		plan_id: 1,
		plan_price: price,
		plan_currency: currency,
	});

	const topUp = (amount: number, currency = Currency.PLN) => ({
		studentId: 1,
		delta: amount,
		currency,
		allocateFrom: new Date(Date.UTC(2026, 7, 1)),
		reason: "test",
		payment: {
			kind: "create" as const,
			data: { type: PaymentTypeEnum.MANUAL_ADJUSTMENT, amount, currency },
		},
	});

	beforeEach(async () => {
		repository = new FakeBalanceRepository();
		const module: TestingModule = await Test.createTestingModule({
			providers: [BalanceService, { provide: BalanceRepositoryPort, useValue: repository }],
		}).compile();
		service = module.get<BalanceService>(BalanceService);
	});

	describe("allocate", () => {
		it("closes lessons in chronological order and leaves the remainder on the balance", async () => {
			repository.lessons = [lesson(1, 5, 30), lesson(2, 10, 30), lesson(3, 15, 30), lesson(4, 20, 30)];

			const result = await service.reconcile(topUp(150));

			expect(result.allocated.map((change) => change.lesson_id)).toEqual([1, 2, 3, 4]);
			expect(result.balance).toBe(30);
			expect(result.balance_currency).toBe(Currency.PLN);
			expect(await repository.invariantHolds()).toBe(true);
		});

		it("stops at the first lesson it cannot afford instead of skipping ahead", async () => {
			repository.lessons = [lesson(1, 5, 100), lesson(2, 10, 30)];

			const result = await service.reconcile(topUp(50));

			// Строгая хронология: позднее дешёвое занятие не оплачивается «через голову» раннего.
			expect(result.allocated).toHaveLength(0);
			expect(result.balance).toBe(50);
		});

		it("moves completed lessons to COMPLETED_PAID", async () => {
			repository.lessons = [lesson(1, 5, 30, Currency.PLN, LessonStatusEnum.COMPLETED_UNPAID)];

			const result = await service.reconcile(topUp(30));

			expect(result.allocated[0].new_status).toBe(LessonStatusEnum.COMPLETED_PAID);
			expect(result.balance).toBe(0);
			expect(result.balance_currency).toBeNull();
		});

		it("ignores lessons before the allocation window", async () => {
			repository.lessons = [{ ...lesson(1, 5, 30), date: new Date(Date.UTC(2026, 6, 20, 10, 0, 0)) }, lesson(2, 5, 30)];

			const result = await service.reconcile(topUp(60));

			// Долги прошлых месяцев автоматически не гасятся.
			expect(result.allocated.map((change) => change.lesson_id)).toEqual([2]);
			expect(result.balance).toBe(30);
		});

		it("skips lessons whose plan currency differs from the balance currency", async () => {
			repository.lessons = [lesson(1, 5, 30, Currency.EUR), lesson(2, 10, 30, Currency.PLN)];

			const result = await service.reconcile(topUp(60, Currency.PLN));

			expect(result.allocated.map((change) => change.lesson_id)).toEqual([2]);
			expect(result.balance).toBe(30);
		});

		it("skips zero-price lessons", async () => {
			repository.lessons = [lesson(1, 5, 0), lesson(2, 10, 30)];

			const result = await service.reconcile(topUp(30));

			expect(result.allocated.map((change) => change.lesson_id)).toEqual([2]);
		});

		it("is idempotent: a second run with no money changes nothing", async () => {
			repository.lessons = [lesson(1, 5, 30)];
			await service.reconcile(topUp(30));

			const second = await service.reconcile({
				studentId: 1,
				delta: 0,
				currency: null,
				allocateFrom: new Date(Date.UTC(2026, 7, 1)),
				reason: "test",
				payment: { kind: "none" },
			});

			expect(second.allocated).toHaveLength(0);
			expect(second.balance).toBe(0);
			expect(await repository.invariantHolds()).toBe(true);
		});
	});

	describe("revert", () => {
		it("reverts allocations starting from the latest lesson", async () => {
			repository.lessons = [lesson(1, 5, 30), lesson(2, 10, 30), lesson(3, 15, 30)];
			await service.reconcile(topUp(90));

			const result = await service.reconcile({
				...topUp(-30),
				payment: { kind: "create", data: { type: PaymentTypeEnum.MANUAL_ADJUSTMENT, amount: -30, currency: Currency.PLN } },
			});

			expect(result.reverted.map((change) => change.lesson_id)).toEqual([3]);
			expect(result.balance).toBe(0);
			expect(await repository.invariantHolds()).toBe(true);
		});

		it("refuses to go negative on a manual adjustment", async () => {
			repository.lessons = [lesson(1, 5, 30)];
			await service.reconcile(topUp(30));

			await expect(
				service.reconcile({
					...topUp(-100),
					payment: { kind: "create", data: { type: PaymentTypeEnum.MANUAL_ADJUSTMENT, amount: -100, currency: Currency.PLN } },
				}),
			).rejects.toThrow(BadRequestException);
		});

		it("allows a negative balance for refunds", async () => {
			const result = await service.reconcile({
				...topUp(-40),
				allowNegativeBalance: true,
				payment: { kind: "create", data: { type: PaymentTypeEnum.STRIPE_REFUND, amount: -40, currency: Currency.PLN } },
			});

			// Деньги в Stripe уже вернулись — отказать нельзя, минус отражает реальный долг.
			expect(result.balance).toBe(-40);
			expect(result.balance_currency).toBe(Currency.PLN);
			expect(await repository.invariantHolds()).toBe(true);
		});

		it("never reverts allocations of missed lessons", async () => {
			repository.lessons = [lesson(1, 5, 30)];
			await service.reconcile(topUp(30));
			repository.lessons[0].status = LessonStatusEnum.MISSED;

			await expect(
				service.reconcile({
					...topUp(-30),
					payment: { kind: "create", data: { type: PaymentTypeEnum.MANUAL_ADJUSTMENT, amount: -30, currency: Currency.PLN } },
				}),
			).rejects.toThrow(BadRequestException);
		});
	});

	describe("balance currency", () => {
		it("sets the currency on the first payment and clears it once the balance is spent", async () => {
			repository.lessons = [lesson(1, 5, 40, Currency.EUR)];

			const topUpResult = await service.reconcile(topUp(80, Currency.EUR));
			expect(topUpResult.balance).toBe(40);
			expect(topUpResult.balance_currency).toBe(Currency.EUR);

			repository.lessons.push(lesson(2, 10, 40, Currency.EUR));
			const spendResult = await service.reconcile({
				studentId: 1,
				delta: 0,
				currency: null,
				allocateFrom: new Date(Date.UTC(2026, 7, 1)),
				reason: "test",
				payment: { kind: "none" },
			});

			expect(spendResult.balance).toBe(0);
			expect(spendResult.balance_currency).toBeNull();
		});

		it("accepts a payment in another currency once the balance is empty", async () => {
			repository.lessons = [lesson(1, 5, 40, Currency.EUR)];
			await service.reconcile(topUp(40, Currency.EUR));
			expect(repository.student.balance_currency).toBeNull();

			repository.lessons.push(lesson(2, 10, 30, Currency.PLN));
			const result = await service.reconcile(topUp(30, Currency.PLN));

			expect(result.outcome).toBe("APPLIED");
			expect(result.allocated.map((change) => change.lesson_id)).toEqual([2]);
		});

		it("parks a payment that conflicts with a non-empty balance", async () => {
			await service.reconcile(topUp(40, Currency.EUR));

			const result = await service.reconcile(topUp(30, Currency.PLN));

			expect(result.outcome).toBe("CURRENCY_CONFLICT");
			expect(result.conflict).toEqual({ balance: 40, balance_currency: Currency.EUR, payment_currency: Currency.PLN });
			// Баланс не тронут, а платёж ждёт разбора администратором.
			expect(repository.student.balance).toBe(40);
			expect(repository.student.balance_currency).toBe(Currency.EUR);
			expect(repository.payments.at(-1)?.status).toBe(PaymentStatusEnum.REQUIRES_ATTENTION);
			expect(await repository.invariantHolds()).toBe(true);
		});
	});

	describe("settle", () => {
		it("updates the existing invoice instead of creating a second payment row", async () => {
			repository.payments.push({ id: 1, amount: 120, status: PaymentStatusEnum.PENDING, type: PaymentTypeEnum.STRIPE_PAYMENT, currency: Currency.PLN });
			repository.lessons = [lesson(1, 5, 30), lesson(2, 10, 30)];

			const result = await service.reconcile({
				studentId: 1,
				delta: 150,
				currency: Currency.PLN,
				allocateFrom: new Date(Date.UTC(2026, 7, 1)),
				reason: "stripe",
				payment: { kind: "settle", paymentId: 1, amount: 150 },
			});

			expect(repository.payments).toHaveLength(1);
			expect(repository.payments[0].amount).toBe(150);
			expect(repository.payments[0].status).toBe(PaymentStatusEnum.SUCCEEDED);
			expect(result.balance).toBe(90);
			expect(await repository.invariantHolds()).toBe(true);
		});
	});

	describe("transferAllocation", () => {
		it("moves the payment to the new lesson without touching the balance", async () => {
			repository.lessons = [lesson(1, 5, 30)];
			await service.reconcile(topUp(30));
			repository.lessons.push(lesson(2, 25, 30, Currency.PLN, LessonStatusEnum.PENDING_PAID));

			const moved = await service.transferAllocationInTx({} as any, 1, 1, 2);

			expect(moved).toBe(true);
			expect(repository.student.balance).toBe(0);
			expect(await repository.getActiveAllocationForLesson(null, 2)).not.toBeNull();
			expect(await repository.getActiveAllocationForLesson(null, 1)).toBeNull();
			expect(await repository.invariantHolds()).toBe(true);
		});

		it("reports that there was nothing to transfer for an unpaid lesson", async () => {
			repository.lessons = [lesson(1, 5, 30)];

			expect(await service.transferAllocationInTx({} as any, 1, 1, 2)).toBe(false);
		});
	});

	describe("releaseLesson", () => {
		it("moves the money to the next unpaid lesson when the released one leaves the schedule", async () => {
			repository.lessons = [lesson(1, 5, 30), lesson(2, 10, 30)];
			await service.reconcile(topUp(30));
			// Отмена уже перевела занятие в CANCELLED, поэтому его статус трогать не нужно
			// и в выборку для аллокации оно больше не попадает.
			repository.lessons[0].status = LessonStatusEnum.CANCELLED;

			const result = await service.releaseLessonInTx({} as any, {
				studentId: 1,
				lessonId: 1,
				reason: "lesson:cancelled",
				revertLessonStatus: false,
			});

			expect(result?.allocated.map((change) => change.lesson_id)).toEqual([2]);
			expect(repository.student.balance).toBe(0);
			expect(await repository.invariantHolds()).toBe(true);
		});

		it("re-pays the same lesson when it stays in the schedule", async () => {
			repository.lessons = [lesson(1, 5, 30), lesson(2, 10, 30)];
			await service.reconcile(topUp(30));

			// Занятие снова стало платным (снят is_free): аллокация снимается, занятие становится
			// неоплаченным и тут же закрывается заново по актуальной цене.
			const result = await service.releaseLessonInTx({} as any, { studentId: 1, lessonId: 1, reason: "lesson:free-status-changed" });

			expect(result?.allocated.map((change) => change.lesson_id)).toEqual([1]);
			expect(repository.lessons[0].status).toBe(LessonStatusEnum.PENDING_PAID);
			expect(await repository.invariantHolds()).toBe(true);
		});

		it("only returns the money to the balance when redistribution is postponed", async () => {
			repository.lessons = [lesson(1, 5, 30), lesson(2, 10, 30)];
			await service.reconcile(topUp(30));

			// Сценарий смены плана: цены занятий поменяются следующим запросом той же транзакции,
			// поэтому раскладывать деньги сейчас нельзя — аллокация легла бы на старую цену.
			const result = await service.releaseLessonInTx({} as any, {
				studentId: 1,
				lessonId: 1,
				reason: "lesson:plan-changed",
				redistribute: false,
			});

			expect(result?.allocated).toEqual([]);
			expect(repository.student.balance).toBe(30);
			expect(repository.student.balance_currency).toBe(Currency.PLN);
			expect(repository.lessons[0].status).toBe(LessonStatusEnum.PENDING_UNPAID);
			expect(await repository.invariantHolds()).toBe(true);
		});

		it("does nothing for a lesson that was never paid", async () => {
			repository.lessons = [lesson(1, 5, 30)];

			expect(await service.releaseLessonInTx({} as any, { studentId: 1, lessonId: 1, reason: "lesson:cancelled" })).toBeNull();
		});
	});

	describe("assertLessonCurrencyAllowed", () => {
		const futureDate = new Date(Date.UTC(2026, 7, 20));

		beforeEach(() => {
			jest.useFakeTimers().setSystemTime(new Date(Date.UTC(2026, 7, 7)));
		});

		afterEach(() => {
			jest.useRealTimers();
		});

		it("blocks a lesson in another currency while money sits on the balance", async () => {
			repository.student.balance = 40;
			repository.student.balance_currency = Currency.EUR;

			await expect(service.assertLessonCurrencyAllowed({ studentId: 1, planCurrency: Currency.PLN, planPrice: 30, lessonDate: futureDate })).rejects.toThrow(
				BadRequestException,
			);
		});

		it("blocks a lesson conflicting with paid lessons of the same month", async () => {
			repository.lessons = [lesson(1, 5, 40, Currency.EUR, LessonStatusEnum.PENDING_PAID)];

			await expect(service.assertLessonCurrencyAllowed({ studentId: 1, planCurrency: Currency.PLN, planPrice: 30, lessonDate: futureDate })).rejects.toThrow(
				BadRequestException,
			);
		});

		it("allows the same lesson in the next month when the balance is empty", async () => {
			repository.lessons = [lesson(1, 5, 40, Currency.EUR, LessonStatusEnum.PENDING_PAID)];

			await expect(
				service.assertLessonCurrencyAllowed({ studentId: 1, planCurrency: Currency.PLN, planPrice: 30, lessonDate: new Date(Date.UTC(2026, 8, 3)) }),
			).resolves.toBeUndefined();
		});

		it("ignores past months", async () => {
			repository.lessons = [lesson(1, 5, 40, Currency.EUR)];

			await expect(
				service.assertLessonCurrencyAllowed({ studentId: 1, planCurrency: Currency.PLN, planPrice: 30, lessonDate: new Date(Date.UTC(2026, 5, 3)) }),
			).resolves.toBeUndefined();
		});

		it("ignores free, trial and zero-price lessons", async () => {
			repository.student.balance = 40;
			repository.student.balance_currency = Currency.EUR;

			await expect(
				service.assertLessonCurrencyAllowed({ studentId: 1, planCurrency: Currency.PLN, planPrice: 0, lessonDate: futureDate }),
			).resolves.toBeUndefined();
			await expect(
				service.assertLessonCurrencyAllowed({ studentId: 1, planCurrency: Currency.PLN, planPrice: 30, lessonDate: futureDate, isFree: true }),
			).resolves.toBeUndefined();
			await expect(
				service.assertLessonCurrencyAllowed({ studentId: 1, planCurrency: Currency.PLN, planPrice: 30, lessonDate: futureDate, isTrial: true }),
			).resolves.toBeUndefined();
		});
	});

	describe("invariant", () => {
		it("holds across a long random sequence of operations", async () => {
			repository.lessons = Array.from({ length: 12 }, (_, index) => lesson(index + 1, index + 2, 30));

			// Псевдослучайная, но детерминированная последовательность — тест обязан быть воспроизводимым.
			let seed = 42;
			const random = () => {
				seed = (seed * 1103515245 + 12345) % 2147483648;
				return seed / 2147483648;
			};

			for (let step = 0; step < 100; step++) {
				const dice = random();
				try {
					if (dice < 0.4) {
						await service.reconcile(topUp(30 * (1 + Math.floor(random() * 3))));
					} else if (dice < 0.55) {
						const amount = -30 * (1 + Math.floor(random() * 2));
						await service.reconcile({
							...topUp(amount),
							payment: { kind: "create", data: { type: PaymentTypeEnum.MANUAL_ADJUSTMENT, amount, currency: Currency.PLN } },
						});
					} else if (dice < 0.7) {
						const target = repository.lessons[Math.floor(random() * repository.lessons.length)];
						await service.releaseLessonInTx({} as any, { studentId: 1, lessonId: target.id, reason: "test" });
					} else if (dice < 0.85) {
						const target = repository.lessons[Math.floor(random() * repository.lessons.length)];
						target.status = LessonStatusEnum.MISSED;
					} else {
						await service.reconcile({
							studentId: 1,
							delta: 0,
							currency: null,
							allocateFrom: new Date(Date.UTC(2026, 7, 1)),
							reason: "test",
							payment: { kind: "none" },
						});
					}
				} catch (error) {
					// Отказ «недостаточно средств» — легальный исход, инвариант обязан пережить и его.
					if (!(error instanceof BadRequestException)) {
						throw error;
					}
				}

				expect(await repository.invariantHolds()).toBe(true);
				const currencyInvariant =
					(repository.student.balance === 0 && repository.student.balance_currency === null) ||
					(repository.student.balance !== 0 && repository.student.balance_currency !== null);
				expect(currencyInvariant).toBe(true);
			}
		});
	});
});
