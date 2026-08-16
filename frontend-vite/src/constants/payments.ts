import type { PaymentStatus, PaymentType } from '@/types'

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING: 'Ожидает оплаты',
  SUCCEEDED: 'Оплачен',
  CANCELED: 'Отменён',
  FAILED: 'Ошибка оплаты',
  REQUIRES_ATTENTION: 'Требует внимания',
}

export const PAYMENT_STATUS_PILL_CLASS: Record<PaymentStatus, string> = {
  PENDING: 'border-amber-200 bg-amber-50 text-amber-700',
  SUCCEEDED: 'border-green-200 bg-green-50 text-green-700',
  CANCELED: 'border-gray-200 bg-gray-50 text-gray-600',
  FAILED: 'border-red-200 bg-red-50 text-red-600',
  REQUIRES_ATTENTION: 'border-orange-300 bg-orange-100 text-orange-800',
}

export const PAYMENT_TYPE_LABELS: Record<PaymentType, string> = {
  STRIPE_PAYMENT: 'Оплата',
  STRIPE_REFUND: 'Возврат',
  MANUAL_ADJUSTMENT: 'Корректировка',
  LEGACY_OPENING_BALANCE: 'Начальный баланс',
}

export const PAYMENT_STATUS_OPTIONS = Object.keys(PAYMENT_STATUS_LABELS) as PaymentStatus[]
export const PAYMENT_TYPE_OPTIONS = Object.keys(PAYMENT_TYPE_LABELS) as PaymentType[]
