import { formatMoneyMinor } from "@/shared/utils/money.util";

/**
 * Конвертация счёта в евро по внутреннему курсу школы.
 *
 * Stripe не обслуживает BYN, поэтому ученику с белорусским планом, который платит картой,
 * счёт предъявляется в евро. Учёт при этом остаётся в BYN — конвертация нужна только для
 * ссылки на оплату.
 *
 * Курс хранится в сотых долях BYN за евро (500 = 1 € = 5.00 BYN), суммы — в минорных
 * единицах, как и везде в проекте. И то и другое целое: плавающая точка в денежных
 * расчётах не используется нигде.
 */

/** Множитель хранения курса: 500 в БД означает 5.00. */
export const EUR_RATE_SCALE = 100;

/**
 * Минимальная сумма списания Stripe для евро — 0.50 €. Ссылку на меньшую сумму платёжка
 * просто отклонит, поэтому проверяем до обращения к ней: иначе отказ пришёл бы под общим
 * текстом «платёжный сервис недоступен» и диагностика была бы ложной.
 * https://docs.stripe.com/currencies — «Minimum charge amount by currency».
 */
export const MIN_EUR_CHARGE_MINOR = 50;

/**
 * Копейки BYN → евроценты. Округление до копейки по правилу «половина вверх»,
 * как у applyDiscount, и по каждой позиции отдельно: итог ссылки — это сумма позиций,
 * а не округлённый итог счёта, и в Telegram печатается ровно то же число.
 *
 * Деление одно, промежуточных дробей нет: 2000 копеек BYN при курсе 500 → 400 (4.00 €).
 */
export const bynToEurMinor = (amountBynMinor: number, rateHundredths: number): number => Math.round((amountBynMinor * EUR_RATE_SCALE) / rateHundredths);

/** «5,00» из 500 — для текста счёта. */
export const formatEurRate = (rateHundredths: number): string => formatMoneyMinor(rateHundredths);

/** «16,00» из 1600 — для текста счёта. */
export const formatEurMinor = (amountMinor: number): string => formatMoneyMinor(amountMinor);
