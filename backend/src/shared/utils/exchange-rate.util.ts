/**
 * Конвертация счёта в евро по внутреннему курсу школы.
 *
 * Stripe не обслуживает BYN, поэтому ученику с белорусским планом, который платит картой,
 * счёт предъявляется в евро. Учёт при этом остаётся в BYN — конвертация нужна только для
 * ссылки на оплату.
 *
 * Курс хранится в сотых долях BYN за евро (500 = 1 € = 5.00 BYN), сумма ссылки — в
 * евроцентах. И то и другое целое: плавающая точка в денежных расчётах в проекте
 * не используется нигде.
 */

/** Множитель хранения курса: 500 в БД означает 5.00. */
export const EUR_RATE_SCALE = 100;

/** Минорных единиц в евро. */
export const EUR_MINOR_UNITS = 100;

/**
 * Минимальная сумма списания Stripe для евро — 0.50 €. Ссылку на меньшую сумму платёжка
 * просто отклонит, поэтому проверяем до обращения к ней: иначе отказ пришёл бы под общим
 * текстом «платёжный сервис недоступен» и диагностика была бы ложной.
 * https://docs.stripe.com/currencies — «Minimum charge amount by currency».
 */
export const MIN_EUR_CHARGE_MINOR = 50;

/**
 * BYN в целых единицах → евроценты. Округление до копейки по правилу «половина вверх»,
 * как у applyDiscount, и по каждой позиции отдельно: итог ссылки — это сумма позиций,
 * а не округлённый итог счёта, и в Telegram печатается ровно то же число.
 *
 * Деление одно, промежуточных дробей нет: 20 BYN при курсе 500 → 400 (4.00 €).
 */
export const bynToEurMinor = (amountBynMajor: number, rateHundredths: number): number =>
	Math.round((amountBynMajor * EUR_MINOR_UNITS * EUR_RATE_SCALE) / rateHundredths);

/** «5.00» из 500 — для текста счёта. */
export const formatEurRate = (rateHundredths: number): string => (rateHundredths / EUR_RATE_SCALE).toFixed(2);

/** «16.00» из 1600 — для текста счёта. */
export const formatEurMinor = (amountMinor: number): string => (amountMinor / EUR_MINOR_UNITS).toFixed(2);
