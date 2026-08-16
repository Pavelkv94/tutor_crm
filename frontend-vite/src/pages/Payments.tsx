import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PaymentsTable } from '@/components/payments/PaymentsTable'
import { BalanceAdjustDialog } from '@/components/payments/BalanceAdjustDialog'
import { paymentsApi } from '@/api/payments'
import { useStudentsDirectory } from '@/hooks/useStudentsDirectory'
import {
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_OPTIONS,
  PAYMENT_TYPE_LABELS,
  PAYMENT_TYPE_OPTIONS,
} from '@/constants/payments'
import { invalidateMoneyQueries } from '@/lib/invalidate-money'
import { showSuccessToast } from '@/lib/toast'
import { formatMoney } from '@/constants/currency'
import type { Payment, PaymentStatus, PaymentType, PaymentsFilter } from '@/types'

const ALL = 'all'

const getFirstDayOfCurrentMonth = (): string => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
}

export const Payments = () => {
  const queryClient = useQueryClient()
  const [studentFilter, setStudentFilter] = useState<string>(ALL)
  const [statusFilter, setStatusFilter] = useState<string>(ALL)
  const [typeFilter, setTypeFilter] = useState<string>(ALL)
  // История не пагинируется на бэкенде, поэтому по умолчанию показываем текущий месяц.
  const [fromDate, setFromDate] = useState(getFirstDayOfCurrentMonth())
  const [toDate, setToDate] = useState('')
  const [cancelTarget, setCancelTarget] = useState<Payment | null>(null)
  const [balanceStudent, setBalanceStudent] = useState<{ id: number; name: string } | null>(null)
  const [balanceDialogOpen, setBalanceDialogOpen] = useState(false)
  // Справочник учеников нужен только для выпадающего фильтра, поэтому грузим его
  // при первом открытии списка, а не на входе на страницу.
  const [isStudentFilterOpened, setIsStudentFilterOpened] = useState(false)

  const { students } = useStudentsDirectory(isStudentFilterOpened)

  const filter: PaymentsFilter = {
    student_id: studentFilter === ALL ? undefined : parseInt(studentFilter, 10),
    status: statusFilter === ALL ? undefined : (statusFilter as PaymentStatus),
    type: typeFilter === ALL ? undefined : (typeFilter as PaymentType),
    from: fromDate || undefined,
    to: toDate || undefined,
  }

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ['payments', 'list', filter],
    queryFn: () => paymentsApi.list(filter),
  })

  const cancelMutation = useMutation({
    mutationFn: (payment: Payment) => paymentsApi.cancelInvoice(payment.id),
    onSuccess: (_result, payment) => {
      showSuccessToast('Счёт отменён')
      invalidateMoneyQueries(queryClient, payment.student_id)
      setCancelTarget(null)
    },
  })

  const applyMutation = useMutation({
    mutationFn: (payment: Payment) => paymentsApi.applyPayment(payment.id),
    onSuccess: (result, payment) => {
      showSuccessToast(
        `Платёж применён. Баланс: ${formatMoney(result.balance, result.balance_currency)}`,
      )
      invalidateMoneyQueries(queryClient, payment.student_id)
    },
  })

  const handleOpenBalance = (payment: Payment) => {
    setBalanceStudent({ id: payment.student_id, name: payment.student_name })
    setBalanceDialogOpen(true)
  }

  const handleResetFilters = () => {
    setStudentFilter(ALL)
    setStatusFilter(ALL)
    setTypeFilter(ALL)
    setFromDate(getFirstDayOfCurrentMonth())
    setToDate('')
  }

  const attentionCount = payments.filter(
    (payment) => payment.status === 'REQUIRES_ATTENTION',
  ).length

  return (
    <div className="animate-screen-enter space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold">Платежи</h1>
        {attentionCount > 0 && (
          <p className="rounded-xl border border-orange-300 bg-orange-100 px-4 py-2 text-sm font-semibold text-orange-800">
            Требуют внимания: {attentionCount}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div className="grid gap-2">
          <Label htmlFor="payments-student">Ученик</Label>
          <Select
            value={studentFilter}
            onValueChange={setStudentFilter}
            onOpenChange={(open) => {
              if (open) setIsStudentFilterOpened(true)
            }}
          >
            <SelectTrigger id="payments-student" className="w-[220px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Все ученики</SelectItem>
              {students.map((student) => (
                <SelectItem key={student.id} value={student.id.toString()}>
                  {student.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="payments-status">Статус</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger id="payments-status" className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Все статусы</SelectItem>
              {PAYMENT_STATUS_OPTIONS.map((status) => (
                <SelectItem key={status} value={status}>
                  {PAYMENT_STATUS_LABELS[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="payments-type">Тип</Label>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger id="payments-type" className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Все типы</SelectItem>
              {PAYMENT_TYPE_OPTIONS.map((type) => (
                <SelectItem key={type} value={type}>
                  {PAYMENT_TYPE_LABELS[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="payments-from">Период с</Label>
          <Input
            id="payments-from"
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="w-[170px]"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="payments-to">по</Label>
          <Input
            id="payments-to"
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="w-[170px]"
          />
        </div>

        <Button variant="outline" onClick={handleResetFilters}>
          Сбросить
        </Button>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="text-muted-foreground">Загрузка...</div>
        </div>
      ) : (
        <PaymentsTable
          payments={payments}
          onCancelInvoice={setCancelTarget}
          onApply={(payment) => applyMutation.mutate(payment)}
          onOpenBalance={handleOpenBalance}
          isMutating={cancelMutation.isPending || applyMutation.isPending}
        />
      )}

      <Dialog
        open={cancelTarget !== null}
        onOpenChange={(open) => {
          if (!open) setCancelTarget(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Отменить счёт</DialogTitle>
            <DialogDescription>
              Ссылка на оплату будет деактивирована, счёт перейдёт в статус «Отменён». Отменить
              можно только неоплаченный счёт.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCancelTarget(null)}
              disabled={cancelMutation.isPending}
            >
              Отмена
            </Button>
            <Button
              variant="destructive"
              disabled={cancelMutation.isPending}
              onClick={() => {
                if (cancelTarget) cancelMutation.mutate(cancelTarget)
              }}
            >
              {cancelMutation.isPending ? 'Отмена счёта...' : 'Отменить счёт'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BalanceAdjustDialog
        open={balanceDialogOpen}
        onOpenChange={setBalanceDialogOpen}
        studentId={balanceStudent?.id ?? null}
        studentName={balanceStudent?.name}
      />
    </div>
  )
}
