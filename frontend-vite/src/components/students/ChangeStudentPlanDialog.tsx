import { useState, useEffect } from 'react'
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
import { plansApi } from '@/api/plans'
import { lessonsApi } from '@/api/lessons'
import { studentsApi } from '@/api/students'
import { formatMoney, getCurrencyFlag } from '@/constants/currency'
import { getAllowedPlanCurrency, isPlanSelectable } from '@/lib/lesson-currency'
import { invalidateMoneyQueries } from '@/lib/invalidate-money'
import { showSuccessToast } from '@/lib/toast'

interface ChangeStudentPlanDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  studentId: number | null
}

const getDefaultDateTimeLocal = (): string => {
  const d = new Date()
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export const ChangeStudentPlanDialog = ({
  open,
  onOpenChange,
  studentId,
}: ChangeStudentPlanDialogProps) => {
  const [oldPlanId, setOldPlanId] = useState<string>('')
  const [newPlanId, setNewPlanId] = useState<string>('')
  const [planStartDate, setPlanStartDate] = useState('')
  const [planEndDate, setPlanEndDate] = useState('')
  const queryClient = useQueryClient()

  const { data: student } = useQuery({
    queryKey: ['student', studentId],
    queryFn: () => studentsApi.getById(studentId!),
    enabled: !!studentId && open,
    refetchOnMount: true,
  })

  const { data: activePlans = [] } = useQuery({
    queryKey: ['plans', 'active'],
    queryFn: () => plansApi.getAll('active'),
    enabled: open,
  })

  const actualPlans = student?.actualPlans ?? []
  const allowedCurrency = getAllowedPlanCurrency(student)

  useEffect(() => {
    if (open) {
      const now = getDefaultDateTimeLocal()
      setPlanStartDate(now)
      setPlanEndDate(now)
      setOldPlanId('')
      setNewPlanId('')
    }
  }, [open])

  const updatePlanMutation = useMutation({
    mutationFn: (data: {
      student_id: number
      old_plan_id: number
      new_plan_id: number
      start_date: string
      end_date: string
    }) => lessonsApi.updateLessonsPlanForPeriod(data),
    onSuccess: () => {
      showSuccessToast('План для периода успешно изменён')
      invalidateMoneyQueries(queryClient, studentId)
      onOpenChange(false)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!studentId || !oldPlanId || !newPlanId || !planStartDate || !planEndDate) return
    updatePlanMutation.mutate({
      student_id: studentId,
      old_plan_id: parseInt(oldPlanId, 10),
      new_plan_id: parseInt(newPlanId, 10),
      start_date: planStartDate,
      end_date: planEndDate,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto"
        aria-describedby="change-plan-description"
        aria-labelledby="change-plan-title"
      >
        <DialogHeader>
          <DialogTitle id="change-plan-title">Изменить план для ученика</DialogTitle>
          <DialogDescription id="change-plan-description">
            {student
              ? `Занятия ученика ${student.name} за выбранный период перейдут на новый план.`
              : 'Занятия за выбранный период перейдут на новый план.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="plan-old">Текущий план</Label>
              <Select value={oldPlanId} onValueChange={setOldPlanId}>
                <SelectTrigger id="plan-old" aria-label="Текущий план ученика">
                  <SelectValue placeholder="Не выбрано" />
                </SelectTrigger>
                <SelectContent>
                  {actualPlans.length === 0 ? (
                    <SelectItem value="none" disabled>
                      Нет планов
                    </SelectItem>
                  ) : (
                    actualPlans.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id.toString()}>
                        <span className="flex items-center gap-2">
                          <span>{plan.plan_name}</span>
                          <span className="text-muted-foreground">
                            {plan.plan_price.toLocaleString()} {plan.plan_currency} {getCurrencyFlag(plan.plan_currency)}
                          </span>
                          {plan.deleted_at && (
                            <span className="text-muted-foreground">(удалён)</span>
                          )}
                        </span>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="plan-start">Дата и время начала</Label>
                <Input
                  id="plan-start"
                  type="datetime-local"
                  value={planStartDate}
                  onChange={(e) => setPlanStartDate(e.target.value)}
                  required
                  aria-label="Дата и время начала периода"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="plan-end">Дата и время окончания</Label>
                <Input
                  id="plan-end"
                  type="datetime-local"
                  value={planEndDate}
                  onChange={(e) => setPlanEndDate(e.target.value)}
                  required
                  aria-label="Дата и время окончания периода"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="plan-new">Новый план</Label>
              <Select value={newPlanId} onValueChange={setNewPlanId}>
                <SelectTrigger id="plan-new" aria-label="Новый план">
                  <SelectValue placeholder="Не выбрано" />
                </SelectTrigger>
                <SelectContent>
                  {activePlans.map((plan) => {
                    const isSelectable = isPlanSelectable(plan, allowedCurrency)

                    return (
                      <SelectItem key={plan.id} value={plan.id.toString()} disabled={!isSelectable}>
                        <span className="flex items-center gap-2">
                          <span>{plan.plan_name}</span>
                          <span className="text-muted-foreground">
                            {plan.plan_price.toLocaleString()} {plan.plan_currency} {getCurrencyFlag(plan.plan_currency)}
                          </span>
                          {!isSelectable && (
                            <span className="text-muted-foreground">(другая валюта)</span>
                          )}
                        </span>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
              {allowedCurrency && student && (
                <p className="text-xs text-muted-foreground">
                  На балансе {formatMoney(student.balance, allowedCurrency)} — доступны только планы
                  в {allowedCurrency}.
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button
              type="submit"
              disabled={
                updatePlanMutation.isPending ||
                !oldPlanId ||
                oldPlanId === 'none' ||
                !newPlanId ||
                actualPlans.length === 0
              }
            >
              {updatePlanMutation.isPending ? 'Сохранение...' : 'Сохранить план'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
