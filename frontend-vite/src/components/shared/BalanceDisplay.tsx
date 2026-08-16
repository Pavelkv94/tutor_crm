import { cn } from '@/lib/utils'
import { formatMoney, getCurrencyFlag } from '@/constants/currency'

interface BalanceDisplayProps {
  balance: number
  currency: string | null | undefined
  className?: string
}

export const BalanceDisplay = ({ balance, currency, className }: BalanceDisplayProps) => {
  if (balance === 0) {
    return <span className={cn('text-muted-foreground', className)}>—</span>
  }

  const flag = getCurrencyFlag(currency)

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold',
        balance > 0
          ? 'border-green-200 bg-green-50 text-green-700'
          : 'border-red-200 bg-red-50 text-red-600',
        className,
      )}
    >
      {formatMoney(balance, currency)}
      {flag && <span aria-hidden="true">{flag}</span>}
    </span>
  )
}
