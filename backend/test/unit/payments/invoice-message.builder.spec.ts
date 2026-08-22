import { buildInvoiceMessage } from "../../../src/modules/payments/application/invoice-message.builder";
import { BillableLesson } from "../../../src/modules/payments/application/ports/payments.repository.port";
import { Currency } from "../../../src/shared/enums/currency.enum";

describe("buildInvoiceMessage", () => {
	const lesson = (id: number, day: number, price: number, isFree = false, planId = 1): BillableLesson => ({
		id,
		date: new Date(Date.UTC(2026, 7, day, 10, 0, 0)),
		plan_id: planId,
		plan_name: "Индивидуально 60 мин",
		plan_type: "INDIVIDUAL",
		plan_price: price,
		plan_currency: Currency.PLN,
		stripe_price_id: "price_1",
		is_free: isFree,
	});

	const params = {
		studentName: "Иван",
		periodStart: new Date(Date.UTC(2026, 7, 1)),
		currency: Currency.PLN,
		discountPercent: 0,
		paymentLink: null as string | null,
	};

	it("keeps free lessons in the schedule but out of the totals", () => {
		const lessons = [lesson(1, 5, 40), lesson(2, 12, 40, true), lesson(3, 19, 40)];

		const message = buildInvoiceMessage({ ...params, lessons, total: 80 });

		// Раньше цена бесплатного занятия ошибочно попадала в сумму к оплате.
		expect(message).toContain("(бесплатно)");
		expect(message).toContain("🔸2 урок(ов) индивидуально × 40zł = 80zł");
		expect(message).toContain("📌 Итого: 80zł");
	});

	it("groups lessons by plan", () => {
		const lessons = [lesson(1, 5, 40, false, 1), lesson(2, 12, 40, false, 1), lesson(3, 19, 60, false, 2)];

		const message = buildInvoiceMessage({ ...params, lessons, total: 140 });

		expect(message).toContain("🔸2 урок(ов) индивидуально × 40zł = 80zł");
		expect(message).toContain("🔸1 урок(ов) индивидуально × 60zł = 60zł");
	});

	it("uses the correct month name for November", () => {
		const message = buildInvoiceMessage({ ...params, periodStart: new Date(Date.UTC(2026, 10, 1)), lessons: [lesson(1, 5, 40)], total: 40 });

		// В прежней реализации здесь была опечатка «НОЯБРАТ».
		expect(message).toContain("НОЯБРЬ");
	});

	it("includes the payment link when there is one", () => {
		const message = buildInvoiceMessage({ ...params, lessons: [lesson(1, 5, 40)], total: 40, paymentLink: "https://buy.stripe.com/test_1" });

		expect(message).toContain("ССЫЛКА НА ОПЛАТУ");
		expect(message).toContain("https://buy.stripe.com/test_1");
	});

	it("asks for a receipt for BYN instead of a link", () => {
		const message = buildInvoiceMessage({
			...params,
			currency: Currency.BYN,
			lessons: [{ ...lesson(1, 5, 25), plan_currency: Currency.BYN }],
			total: 25,
		});

		expect(message).toContain("прислать чек");
		expect(message).not.toContain("ССЫЛКА НА ОПЛАТУ");
		expect(message).toContain("25р");
	});

	it("shows the discount as a separate line and a reduced total", () => {
		const lessons = [lesson(1, 5, 100), lesson(2, 12, 100)];

		// Итог приходит уже со скидкой: 2 × round(100 × 0.9).
		const message = buildInvoiceMessage({ ...params, lessons, total: 180, discountPercent: 10 });

		// Построчные суммы остаются полными — админ должен видеть базу, от которой считалась скидка.
		expect(message).toContain("🔸2 урок(ов) индивидуально × 100zł = 200zł");
		expect(message).toContain("💰 Скидка 10%: −20zł");
		expect(message).toContain("📌 Итого: 180zł");
	});

	it("omits the discount line when there is no discount", () => {
		const message = buildInvoiceMessage({ ...params, lessons: [lesson(1, 5, 40)], total: 40 });

		expect(message).not.toContain("Скидка");
	});

	it("explains why the link is missing", () => {
		const message = buildInvoiceMessage({ ...params, lessons: [lesson(1, 5, 40)], total: 40, linkIssue: "платёжный сервис недоступен" });

		expect(message).toContain("Ссылка на оплату не сгенерирована: платёжный сервис недоступен");
	});
});
