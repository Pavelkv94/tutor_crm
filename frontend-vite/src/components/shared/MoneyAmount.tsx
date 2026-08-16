import { cn } from '@/lib/utils'
import { formatMoney } from '@/constants/currency'

interface MoneyAmountProps {
  /** Знаковая сумма: отрицательная — списание или возврат. */
  amount: number
  currency: string | null | undefined
  className?: string
}

export const MoneyAmount = ({ amount, currency, className }: MoneyAmountProps) => {
  const sign = amount > 0 ? '+' : ''

  return (
    <span
      className={cn(
        'font-semibold tabular-nums',
        amount < 0 && 'text-red-600',
        amount === 0 && 'text-muted-foreground',
        className,
      )}
    >
      {sign}
      {formatMoney(amount, currency)}
    </span>
  )
}
