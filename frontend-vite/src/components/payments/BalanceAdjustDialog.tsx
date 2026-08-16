import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { MoneyAmount } from '@/components/shared/MoneyAmount'
import { PaymentStatusBadge, PaymentTypeBadge } from '@/components/payments/PaymentBadges'
import { paymentsApi } from '@/api/payments'
import { CURRENCIES, formatMoney, type Currency } from '@/constants/currency'
import { invalidateMoneyQueries } from '@/lib/invalidate-money'
import { showSuccessToast } from '@/lib/toast'
import { cn } from '@/lib/utils'
import type { AdjustBalanceInput, AdjustBalanceResult } from '@/types'

const COMMENT_MIN_LENGTH = 3
const COMMENT_MAX_LENGTH = 500

interface BalanceAdjustDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  studentId: number | null
  studentName?: string
}

const buildAffectedLessonsSummary = (result: AdjustBalanceResult): string[] => {
  const paid = result.affected_lessons.filter((lesson) => lesson.new_status.endsWith('_PAID'))
  const unpaid = result.affected_lessons.filter((lesson) => lesson.new_status.endsWith('_UNPAID'))
  const summary: string[] = []

  if (paid.length > 0) {
    summary.push(`Оплачено занятий: ${paid.length}`)
  }
  if (unpaid.length > 0) {
    summary.push(`Снята оплата с занятий: ${unpaid.length}`)
  }
  if (summary.length === 0) {
    summary.push('Статусы занятий не изменились')
  }

  return summary
}

export const BalanceAdjustDialog = ({
  open,
  onOpenChange,
  studentId,
  studentName,
}: BalanceAdjustDialogProps) => {
  const queryClient = useQueryClient()
  const [direction, setDirection] = useState<'in' | 'out'>('in')
  const [amountInput, setAmountInput] = useState('')
  const [currency, setCurrency] = useState<Currency | ''>('')
  const [comment, setComment] = useState('')
  const [result, setResult] = useState<AdjustBalanceResult | null>(null)

  const { data: balance, isLoading: isBalanceLoading } = useQuery({
    queryKey: ['payments', 'balance', studentId],
    queryFn: () => paymentsApi.getStudentBalance(studentId!),
    enabled: open && studentId !== null,
    refetchOnMount: true,
  })

  const { data: history = [], isLoading: isHistoryLoading } = useQuery({
    queryKey: ['payments', 'list', { student_id: studentId }],
    queryFn: () => paymentsApi.list({ student_id: studentId! }),
    enabled: open && studentId !== null,
  })

  const adjustMutation = useMutation({
    mutationFn: (data: AdjustBalanceInput) => paymentsApi.adjustBalance(studentId!, data),
    onSuccess: (data) => {
      setResult(data)
      showSuccessToast('Баланс скорректирован')
      invalidateMoneyQueries(queryClient, studentId)
    },
  })

  const resetForm = () => {
    setDirection('in')
    setAmountInput('')
    setCurrency('')
    setComment('')
    setResult(null)
    adjustMutation.reset()
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetForm()
    }
    onOpenChange(nextOpen)
  }

  if (studentId === null) return null

  const currentBalance = balance?.balance ?? 0
  const balanceCurrency = balance?.balance_currency ?? null
  // Валюта выбирается только когда остаток пуст: при ненулевом балансе бэкенд принимает
  // корректировку исключительно в валюте остатка.
  const isCurrencyEditable = currentBalance === 0

  const absAmount = Number.parseInt(amountInput, 10)
  const trimmedComment = comment.trim()
  const isAmountValid = Number.isInteger(absAmount) && absAmount > 0
  const isCommentValid =
    trimmedComment.length >= COMMENT_MIN_LENGTH && trimmedComment.length <= COMMENT_MAX_LENGTH
  const isCurrencyValid = !isCurrencyEditable || currency !== ''
  const isFormValid = isAmountValid && isCommentValid && isCurrencyValid

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!isFormValid) return

    const payload: AdjustBalanceInput = {
      amount: direction === 'out' ? -absAmount : absAmount,
      comment: trimmedComment,
    }
    if (isCurrencyEditable && currency) {
      payload.currency = currency
    }

    adjustMutation.mutate(payload)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[720px]">
        <DialogHeader>
          <DialogTitle>Баланс{studentName ? `: ${studentName}` : ''}</DialogTitle>
          <DialogDescription>
            Остаток на балансе и ручная корректировка. Деньги распределяются по занятиям
            автоматически.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="rounded-2xl border border-border bg-secondary/50 px-5 py-4">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Текущий баланс
            </p>
            <p className="mt-1 text-2xl font-extrabold">
              {isBalanceLoading ? '...' : formatMoney(currentBalance, balanceCurrency)}
            </p>
            {!isBalanceLoading && currentBalance === 0 && (
              <p className="mt-1 text-xs text-muted-foreground">
                Валюта не задана — её определит первое пополнение.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold">
              На что потрачен баланс: {balance?.allocations.length ?? 0}
            </h3>
            {balance && balance.allocations.length > 0 ? (
              <ul className="divide-y divide-border rounded-xl border border-border">
                {balance.allocations.map((allocation) => (
                  <li
                    key={allocation.lesson_id}
                    className="flex items-center justify-between px-4 py-2 text-sm"
                  >
                    <span>{format(new Date(allocation.lesson_date), 'dd.MM.yyyy HH:mm')}</span>
                    <span className="font-semibold">
                      {formatMoney(allocation.amount, allocation.currency)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Оплаченных с баланса занятий нет</p>
            )}
          </div>

          {result ? (
            <div className="space-y-3 rounded-lg border border-green-200 bg-green-50 p-4">
              <p className="text-sm font-semibold text-green-700">
                Новый баланс: {formatMoney(result.balance, result.balance_currency)}
              </p>
              {buildAffectedLessonsSummary(result).map((line) => (
                <p key={line} className="text-sm text-green-700">
                  {line}
                </p>
              ))}
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Ещё корректировка
                </Button>
                <Button type="button" onClick={() => handleOpenChange(false)}>
                  Готово
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-border p-4">
              <h3 className="text-sm font-semibold">Ручная корректировка</h3>

              <div className="grid gap-2">
                <Label>Операция</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={direction === 'in' ? 'default' : 'outline'}
                    className="flex-1"
                    aria-pressed={direction === 'in'}
                    onClick={() => setDirection('in')}
                  >
                    Пополнить
                  </Button>
                  <Button
                    type="button"
                    variant={direction === 'out' ? 'default' : 'outline'}
                    className="flex-1"
                    aria-pressed={direction === 'out'}
                    onClick={() => setDirection('out')}
                  >
                    Списать
                  </Button>
                </div>
              </div>

              <div className={cn('grid gap-4', isCurrencyEditable && 'sm:grid-cols-2')}>
                <div className="grid gap-2">
                  <Label htmlFor="balance-amount">Сумма</Label>
                  <Input
                    id="balance-amount"
                    type="number"
                    min="1"
                    step="1"
                    inputMode="numeric"
                    value={amountInput}
                    onChange={(e) => setAmountInput(e.target.value)}
                    placeholder="Например, 40"
                  />
                </div>

                {isCurrencyEditable ? (
                  <div className="grid gap-2">
                    <Label htmlFor="balance-currency">Валюта</Label>
                    <Select
                      value={currency}
                      onValueChange={(value) => setCurrency(value as Currency)}
                    >
                      <SelectTrigger id="balance-currency" aria-label="Валюта корректировки">
                        <SelectValue placeholder="Выберите валюту" />
                      </SelectTrigger>
                      <SelectContent>
                        {CURRENCIES.map((item) => (
                          <SelectItem key={item.code} value={item.code}>
                            {item.code} {item.flag}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Валюта операции — {balanceCurrency}: пока на балансе есть деньги, сменить её
                    нельзя.
                  </p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="balance-comment">Комментарий</Label>
                <Textarea
                  id="balance-comment"
                  value={comment}
                  maxLength={COMMENT_MAX_LENGTH}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Например: оплата наличными за август"
                  rows={2}
                />
                <p className="text-xs text-muted-foreground">
                  Обязателен, минимум {COMMENT_MIN_LENGTH} символа — {trimmedComment.length}/
                  {COMMENT_MAX_LENGTH}
                </p>
              </div>

              <Button type="submit" disabled={!isFormValid || adjustMutation.isPending}>
                {adjustMutation.isPending ? 'Сохранение...' : 'Применить корректировку'}
              </Button>
            </form>
          )}

          <div className="space-y-2">
            <h3 className="text-sm font-semibold">История операций</h3>
            {isHistoryLoading ? (
              <p className="text-sm text-muted-foreground">Загрузка...</p>
            ) : history.length === 0 ? (
              <p className="text-sm text-muted-foreground">Операций пока нет</p>
            ) : (
              <ul className="divide-y divide-border rounded-xl border border-border">
                {history.map((payment) => (
                  <li
                    key={payment.id}
                    className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm"
                  >
                    <span className="text-muted-foreground">
                      {format(new Date(payment.created_at), 'dd.MM.yyyy')}
                    </span>
                    <PaymentTypeBadge type={payment.type} />
                    <PaymentStatusBadge status={payment.status} />
                    <MoneyAmount amount={payment.amount} currency={payment.currency} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
