/**
 * Способ оплаты ученика. Именно он решает, будет ли в счёте ссылка на оплату картой:
 * валюта занятий отвечает только за то, в чём счёт считается.
 *
 * «Не задан» — отдельное значение, а не пустая строка: shadcn Select не принимает пустой
 * `value`. Ведёт себя так же, как «На счёт BYN» — ссылка не выставляется.
 */
export type PaymentMethod = 'STRIPE' | 'BYN_ACCOUNT'

export type PaymentMethodValue = PaymentMethod | 'unset'

export const PAYMENT_METHOD_OPTIONS: { value: PaymentMethodValue; label: string }[] = [
  { value: 'STRIPE', label: 'Stripe' },
  { value: 'BYN_ACCOUNT', label: 'На счёт BYN' },
  { value: 'unset', label: 'Не задан' },
]

const LABELS: Record<PaymentMethod, string> = {
  STRIPE: 'Stripe',
  BYN_ACCOUNT: 'На счёт BYN',
}

export const toPaymentMethodValue = (student: { payment_method: PaymentMethod | null }): PaymentMethodValue =>
  student.payment_method ?? 'unset'

export const fromPaymentMethodValue = (value: PaymentMethodValue): PaymentMethod | null =>
  value === 'unset' ? null : value

/** Подпись для таблицы. «—» вместо «Не задан»: в колонке важна краткость. */
export const getPaymentMethodLabel = (method: PaymentMethod | null): string => (method ? LABELS[method] : '—')
