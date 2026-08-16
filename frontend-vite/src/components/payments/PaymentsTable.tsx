import { format } from 'date-fns'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { MoneyAmount } from '@/components/shared/MoneyAmount'
import { PaymentStatusBadge, PaymentTypeBadge } from '@/components/payments/PaymentBadges'
import { cn } from '@/lib/utils'
import type { Payment } from '@/types'

interface PaymentsTableProps {
  payments: Payment[]
  onCancelInvoice: (payment: Payment) => void
  onApply: (payment: Payment) => void
  onOpenBalance: (payment: Payment) => void
  isMutating: boolean
}

const headerCellClass =
  'h-auto px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-foreground'

const bodyCellClass = 'px-5 py-4 align-top'

const formatDate = (value: string | null): string => {
  if (!value) return '—'
  return format(new Date(value), 'dd.MM.yyyy')
}

const formatPeriod = (payment: Payment): string => {
  if (!payment.period_start && !payment.period_end) return '—'
  return `${formatDate(payment.period_start)} — ${formatDate(payment.period_end)}`
}

export const PaymentsTable = ({
  payments,
  onCancelInvoice,
  onApply,
  onOpenBalance,
  isMutating,
}: PaymentsTableProps) => {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-border bg-secondary hover:bg-secondary">
              <TableHead className={headerCellClass}>Дата</TableHead>
              <TableHead className={headerCellClass}>Ученик</TableHead>
              <TableHead className={headerCellClass}>Тип</TableHead>
              <TableHead className={headerCellClass}>Статус</TableHead>
              <TableHead className={headerCellClass}>Сумма</TableHead>
              <TableHead className={headerCellClass}>Период</TableHead>
              <TableHead className={headerCellClass}>Занятий</TableHead>
              <TableHead className={headerCellClass}>Комментарий</TableHead>
              <TableHead className={cn(headerCellClass, 'text-right')}>Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.length === 0 ? (
              <TableRow className="border-b-0 hover:bg-card">
                <TableCell colSpan={9} className="px-5 py-10 text-center text-muted-foreground">
                  Операции не найдены
                </TableCell>
              </TableRow>
            ) : (
              payments.map((payment) => {
                const needsAttention = payment.status === 'REQUIRES_ATTENTION'
                const isFailed = payment.status === 'FAILED'

                return (
                  <TableRow
                    key={payment.id}
                    className={cn(
                      'border-b border-border bg-card hover:bg-card',
                      needsAttention && 'bg-orange-50 hover:bg-orange-50',
                      isFailed && 'bg-red-50 hover:bg-red-50',
                    )}
                  >
                    <TableCell className={cn(bodyCellClass, 'text-muted-foreground')}>
                      {formatDate(payment.created_at)}
                    </TableCell>
                    <TableCell className={cn(bodyCellClass, 'font-extrabold text-foreground')}>
                      {payment.student_name}
                    </TableCell>
                    <TableCell className={bodyCellClass}>
                      <PaymentTypeBadge type={payment.type} />
                    </TableCell>
                    <TableCell className={bodyCellClass}>
                      <PaymentStatusBadge status={payment.status} />
                      {needsAttention && (
                        <p className="mt-1 max-w-[220px] text-xs text-orange-800">
                          Сначала обнулите остаток в другой валюте, затем примените платёж.
                        </p>
                      )}
                    </TableCell>
                    <TableCell className={bodyCellClass}>
                      <MoneyAmount amount={payment.amount} currency={payment.currency} />
                    </TableCell>
                    <TableCell className={cn(bodyCellClass, 'whitespace-nowrap text-muted-foreground')}>
                      {formatPeriod(payment)}
                    </TableCell>
                    <TableCell className={bodyCellClass}>{payment.lessons_count ?? '—'}</TableCell>
                    <TableCell className={cn(bodyCellClass, 'max-w-[240px] text-muted-foreground')}>
                      {payment.comment || '—'}
                    </TableCell>
                    <TableCell className={cn(bodyCellClass, 'text-right')}>
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        {needsAttention && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={isMutating}
                            onClick={() => onApply(payment)}
                            className="h-8 rounded-lg px-3 text-xs font-semibold"
                          >
                            Применить
                          </Button>
                        )}
                        {payment.status === 'PENDING' && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={isMutating}
                            onClick={() => onCancelInvoice(payment)}
                            className="h-8 rounded-lg border-red-200 px-3 text-xs font-semibold text-red-600 hover:bg-red-50 hover:text-red-700"
                          >
                            Отменить счёт
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onOpenBalance(payment)}
                          className="h-8 rounded-lg border-transparent bg-secondary px-3 text-xs font-semibold text-secondary-foreground hover:bg-secondary/80"
                        >
                          Баланс
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
