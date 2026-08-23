import { Currency } from "@/shared/enums/currency.enum";
import { BillableLesson } from "@/modules/payments/application/ports/payments.repository.port";
import { formatEurMinor, formatEurRate } from "@/shared/utils/exchange-rate.util";

const MONTHS_UPPER = ["ЯНВАРЬ", "ФЕВРАЛЬ", "МАРТ", "АПРЕЛЬ", "МАЙ", "ИЮНЬ", "ИЮЛЬ", "АВГУСТ", "СЕНТЯБРЬ", "ОКТЯБРЬ", "НОЯБРЬ", "ДЕКАБРЬ"];

/** Время в отчёте админу показывается по МСК — так исторически привык читать администратор. */
const REPORT_TIMEZONE = "Europe/Minsk";

const CURRENCY_SYMBOLS: Record<Currency, string> = {
	[Currency.EUR]: "€",
	[Currency.PLN]: "zł",
	[Currency.BYN]: "р",
};

/**
 * Сумма, предъявленная к оплате, когда счёт выставлен не в своей валюте: BYN-занятия
 * оплачиваются картой в евро по внутреннему курсу школы.
 */
export type InvoiceCharge = {
	/** В минорных единицах `currency` (евроцентах). */
	amountMinor: number;
	currency: Currency;
	/** Курс в сотых долях валюты счёта за единицу `currency`: 500 = 1 € = 5.00 BYN. */
	rate: number;
};

export type InvoiceMessageParams = {
	studentName: string;
	periodStart: Date;
	lessons: BillableLesson[];
	currency: Currency;
	/** Сумма к оплате: уже со скидкой, если она есть. */
	total: number;
	/** Персональная скидка ученика в процентах. 0 — строки про скидку в отчёте не будет. */
	discountPercent: number;
	paymentLink: string | null;
	/** Сообщение о причине, по которой ссылка не сгенерирована. */
	linkIssue?: string;
	/**
	 * Ссылки не ждали: оплата принимается вне системы. Отличать это от сбоя обязательно —
	 * иначе штатный счёт выглядел бы как авария.
	 *
	 * Признак, а не сам способ оплаты: билдер остаётся чистым форматированием и, как и
	 * раньше, ничего не знает про Stripe — он получает уже готовую ссылку.
	 */
	expectsReceipt: boolean;
	/** Сумма ссылки, когда счёт предъявлен не в своей валюте. */
	charge?: InvoiceCharge;
};

export const currencySymbol = (currency: Currency): string => CURRENCY_SYMBOLS[currency];

const formatLessonLine = (lesson: BillableLesson): string => {
	const day = lesson.date.toLocaleDateString("ru-RU", { day: "2-digit", timeZone: REPORT_TIMEZONE });
	const month = lesson.date.toLocaleDateString("ru-RU", { month: "long", timeZone: REPORT_TIMEZONE });
	const weekday = lesson.date.toLocaleDateString("ru-RU", { weekday: "long", timeZone: REPORT_TIMEZONE });
	const time = lesson.date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", timeZone: REPORT_TIMEZONE });
	return `${day} ${month} (${weekday}) ${time}${lesson.is_free ? " (бесплатно)" : ""}`;
};

/**
 * Собирает текст ежемесячного отчёта администратору.
 *
 * Бесплатные занятия показываются в расписании, но не участвуют ни в построчных суммах,
 * ни в итоге — раньше их цена ошибочно попадала в сумму к оплате.
 *
 * Построчные суммы по планам остаются в полных ценах, а скидка выносится отдельной строкой:
 * так администратору видно и базу, и размер уступки. Сама скидка считается как разница
 * между полной суммой и итогом — иначе она разошлась бы с поштучным округлением цен.
 */
export const buildInvoiceMessage = (params: InvoiceMessageParams): string => {
	const symbol = currencySymbol(params.currency);
	const paidLessons = params.lessons.filter((lesson) => !lesson.is_free && lesson.plan_price > 0);

	const scheduleLines = params.lessons.map(formatLessonLine);

	const byPlan = new Map<number, BillableLesson[]>();
	for (const lesson of paidLessons) {
		const group = byPlan.get(lesson.plan_id);
		if (group) {
			group.push(lesson);
		} else {
			byPlan.set(lesson.plan_id, [lesson]);
		}
	}

	const planLines = [...byPlan.values()].map((lessons) => {
		const plan = lessons[0];
		const planLabel = plan.plan_type === "INDIVIDUAL" ? "индивидуально" : "в паре";
		return `🔸${lessons.length} урок(ов) ${planLabel} × ${plan.plan_price}${symbol} = ${lessons.length * plan.plan_price}${symbol}`;
	});

	const fullTotal = paidLessons.reduce((sum, lesson) => sum + lesson.plan_price, 0);
	const discountLine = params.discountPercent > 0 ? `\n💰 Скидка ${params.discountPercent}%: −${fullTotal - params.total}${symbol}` : "";

	const monthLabel = MONTHS_UPPER[params.periodStart.getMonth()];

	let paymentNote: string;
	if (params.expectsReceipt) {
		paymentNote = "💳 Просьба внести оплату до 10-го числа текущего месяца (включительно) и прислать чек для подтверждения 😊";
	} else if (params.paymentLink) {
		// Сумма в евро берётся из позиций ссылки, а не пересчитывается от итога: округление
		// идёт поштучно, и пересчитанный заново итог разошёлся бы со списанием на копейки.
		const chargeLine = params.charge
			? `\n💶 К оплате картой: ${formatEurMinor(params.charge.amountMinor)}${currencySymbol(params.charge.currency)} ` +
				`(по курсу 1${currencySymbol(params.charge.currency)} = ${formatEurRate(params.charge.rate)}${symbol})`
			: "";
		paymentNote = `💳 Просьба внести оплату до 10-го числа текущего месяца (включительно) 😊${chargeLine}\n🔗 ССЫЛКА НА ОПЛАТУ:\n${params.paymentLink}`;
	} else {
		paymentNote = `💳 Просьба внести оплату до 10-го числа текущего месяца (включительно) 😊\n⚠️ Ссылка на оплату не сгенерирована${params.linkIssue ? `: ${params.linkIssue}` : ""}`;
	}

	return `
📅 РАСПИСАНИЕ НА ${monthLabel} (${params.studentName})

<i>⏰ Время указано по МСК (UTC+3)</i>

${scheduleLines.join("\n")}

${planLines.join("\n")}${discountLine}
📌 Итого: ${params.total}${symbol}

${paymentNote}
`;
};
