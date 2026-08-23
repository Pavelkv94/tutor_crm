/**
 * Как ученик оплачивает занятия. Только это поле решает, выставлять ли ссылку Stripe:
 * валюта занятий отвечает лишь за то, в чём считается счёт.
 *
 * Зеркало Prisma-энума PaymentMethod. NULL в БД — способ не выбран, ведёт себя как BYN_ACCOUNT.
 */
export enum PaymentMethod {
	STRIPE = "STRIPE",
	BYN_ACCOUNT = "BYN_ACCOUNT",
}
