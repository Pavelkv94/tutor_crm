import { bynToEurMinor, formatEurMinor, formatEurRate } from "../../../src/shared/utils/exchange-rate.util";

describe("exchange-rate.util", () => {
	describe("bynToEurMinor", () => {
		it("converts a whole rate exactly", () => {
			// 4 занятия по 20,00 BYN при курсе 5.00 дают ссылку на 16.00 €.
			expect(bynToEurMinor(2000, 500)).toBe(400);
			expect(bynToEurMinor(2000, 500) * 4).toBe(1600);
		});

		it("rounds half up to the cent", () => {
			// 20 / 3.30 = 6.0606…
			expect(bynToEurMinor(2000, 330)).toBe(606);
			// 25 / 3.30 = 7.5757…
			expect(bynToEurMinor(2500, 330)).toBe(758);
		});

		it("keeps the sum of items equal to the invoice charge", () => {
			// Округление идёт поштучно, поэтому итог ссылки — сумма позиций, а не пересчёт итога.
			const perLesson = bynToEurMinor(2500, 330);
			expect(perLesson * 3).toBe(2274);
		});

		it("returns zero for a free lesson", () => {
			expect(bynToEurMinor(0, 500)).toBe(0);
		});
	});

	describe("formatters", () => {
		it("prints the rate with two decimals", () => {
			expect(formatEurRate(500)).toBe("5,00");
			expect(formatEurRate(0)).toBe("0,00");
			expect(formatEurRate(333)).toBe("3,33");
		});

		it("prints the amount with two decimals", () => {
			expect(formatEurMinor(1600)).toBe("16,00");
			expect(formatEurMinor(606)).toBe("6,06");
		});
	});
});
