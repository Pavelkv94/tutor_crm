/**
 * Константы бланка счёта (rachunek), который преподаватель выставляет школе.
 *
 * Формулировки двуязычные (польский / русский) — так устроен утверждённый бланк.
 * Реквизиты школы меняются редко, поэтому живут в коде, а не в конфиге.
 */

/** Заказчик (NABYWCA) — школа. */
export const SALARY_INVOICE_BUYER = {
	name: "Anna Mintel English Stars School",
	nip: "6793364526",
	address: "ul. Koszykarska 24E/1, Kraków, Polska",
	email: "englishstars2026@outlook.com",
} as const;

/** Валюта счёта. Пока школа рассчитывается с преподавателями только в BYN. */
export const SALARY_INVOICE_CURRENCY = "BYN";

/** Срок оплаты счёта. */
export const SALARY_INVOICE_PAYMENT_TERM = {
	pl: "10 dni",
	ru: "10 дней",
} as const;

/** Строка счёта за проведённые занятия. */
export const SALARY_INVOICE_LESSONS_SERVICE = {
	pl: "Usługi edukacyjne — prowadzenie lekcji języka angielskiego online",
	ru: "Образовательные услуги — проведение уроков английского языка онлайн",
} as const;

/** Строка счёта за дополнительные услуги. Администратор задаёт только сумму. */
export const SALARY_INVOICE_EXTRA_SERVICE = {
	pl: "Wynagrodzenie za prace dodatkowe (§4.4 umowy)",
	ru: "Вознаграждение за дополнительные работы (§4.4 договора)",
} as const;

/** Подписи и сноски бланка. */
export const SALARY_INVOICE_LABELS = {
	vatNote: {
		pl: "Podatek VAT nie dotyczy — wystawca nie jest podatnikiem VAT",
		ru: "НДС не применяется — исполнитель не является плательщиком НДС",
	},
	signatureNote: {
		pl: "Podpis nie jest wymagany",
		ru: "Подпись не требуется",
	},
} as const;
