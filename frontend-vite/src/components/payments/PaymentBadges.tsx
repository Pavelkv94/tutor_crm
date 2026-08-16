import { cn } from '@/lib/utils'
import {
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_PILL_CLASS,
  PAYMENT_TYPE_LABELS,
} from '@/constants/payments'
import type { PaymentStatus, PaymentType } from '@/types'

const pillClass = 'inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold'

export const PaymentStatusBadge = ({ status }: { status: PaymentStatus }) => (
  <span className={cn(pillClass, PAYMENT_STATUS_PILL_CLASS[status])}>
    {PAYMENT_STATUS_LABELS[status] ?? status}
  </span>
)

export const PaymentTypeBadge = ({ type }: { type: PaymentType }) => (
  <span className={cn(pillClass, 'border-transparent bg-secondary text-secondary-foreground')}>
    {PAYMENT_TYPE_LABELS[type] ?? type}
  </span>
)
