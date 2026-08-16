import { Currency } from "@/shared/enums/currency.enum";
import { BillableLesson } from "@/modules/payments/application/ports/payments.repository.port";

const MONTHS_UPPER = ["ЯНВАРЬ", "ФЕВРАЛЬ", "МАРТ", "АПРЕЛЬ", "МАЙ", "ИЮНЬ", "ИЮЛЬ", "АВГУСТ", "СЕНТЯБРЬ", "ОКТЯБРЬ", "НОЯБРЬ", "ДЕКАБРЬ"];

/** Время в отчёте админу показывается по МСК — так исторически привык читать администратор. */
const REPORT_TIMEZONE = "Europe/Minsk";

const CURRENCY_SYMBOLS: Record<Currency, string> = {
	[Currency.EUR]: "€",
	[Currency.PLN]: "zł",
	[Currency.BYN]: "р",
};

export type InvoiceMessageParams = {
	studentName: string;
	periodStart: Date;
	lessons: BillableLesson[];
	currency: Currency;
	total: number;
	paymentLink: string | null;
	/** Сообщение о причине, по которой ссылка не сгенерирована. */
	linkIssue?: string;
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

	const monthLabel = MONTHS_UPPER[params.periodStart.getMonth()];

	let paymentNote: string;
	if (params.currency === Currency.BYN) {
		paymentNote = "💳 Просьба внести оплату до 10-го числа текущего месяца (включительно) и прислать чек для подтверждения 😊";
	} else if (params.paymentLink) {
		paymentNote = `💳 Просьба внести оплату до 10-го числа текущего месяца (включительно) 😊\n🔗 ССЫЛКА НА ОПЛАТУ:\n${params.paymentLink}`;
	} else {
		paymentNote = `💳 Просьба внести оплату до 10-го числа текущего месяца (включительно) 😊\n⚠️ Ссылка на оплату не сгенерирована${params.linkIssue ? `: ${params.linkIssue}` : ""}`;
	}

	return `
📅 РАСПИСАНИЕ НА ${monthLabel} (${params.studentName})

<i>⏰ Время указано по МСК (UTC+3)</i>

${scheduleLines.join("\n")}

${planLines.join("\n")}
📌 Итого: ${params.total}${symbol}

${paymentNote}
`;
};
