import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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
import { studentsApi } from '@/api/students'
import { teachersApi } from '@/api/teachers'
import { plansApi } from '@/api/plans'
import { lessonsApi } from '@/api/lessons'
import { useAuth } from '@/contexts/AuthContext'
import { showSuccessToast } from '@/lib/toast'
import type { UpdateStudentInput } from '@/types'

const currencyFlags: Record<string, string> = {
  USD: '🇺🇸',
  EUR: '🇪🇺',
  PLN: '🇵🇱',
  BYN: '🇧🇾',
  RUB: '🇷🇺',
}

const getDefaultDateTimeLocal = (): string => {
  const d = new Date()
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

interface EditStudentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  studentId: number | null
}

export const EditStudentDialog = ({ open, onOpenChange, studentId }: EditStudentDialogProps) => {
  const [name, setName] = useState('')
  const [studentClass, setStudentClass] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [teacherId, setTeacherId] = useState<string>('')
  const [timezone, setTimezone] = useState<'BY' | 'PL' | ''>('')
  const [oldPlanId, setOldPlanId] = useState<string>('')
  const [newPlanId, setNewPlanId] = useState<string>('')
  const [planStartDate, setPlanStartDate] = useState('')
  const [planEndDate, setPlanEndDate] = useState('')
  const { isAdmin } = useAuth()
  const queryClient = useQueryClient()

  const { data: student } = useQuery({
    queryKey: ['student', studentId],
    queryFn: () => studentsApi.getById(studentId!),
    enabled: !!studentId && open,
    refetchOnMount: true,
  })

  const { data: teachers = [] } = useQuery({
    queryKey: ['teachers', 'active'],
    queryFn: () => teachersApi.getAll('active'),
    enabled: isAdmin && open,
  })

  const { data: activePlans = [] } = useQuery({
    queryKey: ['plans', 'active'],
    queryFn: () => plansApi.getAll('active'),
    enabled: isAdmin && open,
  })

  const activeTeachers = teachers.filter((teacher) => !teacher.deleted_at)
  const actualPlans = student?.actualPlans ?? []

  useEffect(() => {
    if (student && open) {
      setName(student.name)
      setStudentClass(student.class.toString())
      setBirthDate(student.birth_date ? student.birth_date.split('T')[0] : '')
      if (student.teacher_id) {
        setTeacherId(student.teacher_id.toString())
      } else {
        setTeacherId('')
      }
      setTimezone(student.timezone || '')
    }
  }, [student, open, studentId])

  useEffect(() => {
    if (open && isAdmin) {
      const now = getDefaultDateTimeLocal()
      setPlanStartDate(now)
      setPlanEndDate(now)
      setOldPlanId('')
      setNewPlanId('')
    }
  }, [open, isAdmin])

  const updateMutation = useMutation({
    mutationFn: (data: UpdateStudentInput) => studentsApi.update(studentId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] })
      queryClient.invalidateQueries({ queryKey: ['student', studentId] })
      onOpenChange(false)
    },
  })

  const updatePlanMutation = useMutation({
    mutationFn: (data: { student_id: number; old_plan_id: number; new_plan_id: number; start_date: string; end_date: string }) =>
      lessonsApi.updateLessonsPlanForPeriod(data),
    onSuccess: () => {
      showSuccessToast('План для периода успешно изменён')
      queryClient.invalidateQueries({ queryKey: ['student', studentId] })
      queryClient.invalidateQueries({ queryKey: ['lessons'] })
    },
  })

  useEffect(() => {
    if (!open) {
      setName('')
      setStudentClass('')
      setBirthDate('')
      setTeacherId('')
      setTimezone('')
    }
  }, [open])

  const handleSavePlanChange = (e: React.FormEvent) => {
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !studentClass) return

    const data: UpdateStudentInput = {
      name,
      class: parseInt(studentClass, 10),
      birth_date: birthDate ? new Date(birthDate).toISOString() : undefined,
      timezone: timezone ? (timezone as 'BY' | 'PL') : null,
    }

    // Only include teacher_id if admin and it's provided
    if (isAdmin && teacherId) {
      data.teacher_id = parseInt(teacherId, 10)
    }

    updateMutation.mutate(data)
  }

  if (!student) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={isAdmin ? 'sm:max-w-4xl' : 'sm:max-w-[425px]'}
        aria-describedby="edit-student-description"
        aria-labelledby="edit-student-title"
      >
        <DialogHeader>
          <DialogTitle id="edit-student-title">Редактировать ученика</DialogTitle>
          <DialogDescription id="edit-student-description">
            Изменить информацию об ученике.
          </DialogDescription>
        </DialogHeader>
        <div className={isAdmin ? 'grid grid-cols-1 gap-6 sm:grid-cols-2' : undefined}>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-name">Имя</Label>
                <Input
                  id="edit-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  aria-label="Имя ученика"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-class">Класс</Label>
                <Input
                  id="edit-class"
                  type="number"
                  min="1"
                  value={studentClass}
                  onChange={(e) => setStudentClass(e.target.value)}
                  required
                  aria-label="Класс"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-birthDate">Дата рождения</Label>
                <Input
                  id="edit-birthDate"
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  aria-label="Дата рождения"
                />
              </div>
              {isAdmin && (
                <div className="grid gap-2">
                  <Label htmlFor="edit-teacher">Преподаватель</Label>
                  <Select value={teacherId} onValueChange={setTeacherId}>
                    <SelectTrigger id="edit-teacher" aria-label="Выберите преподавателя">
                      <SelectValue placeholder="Выберите преподавателя" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeTeachers.map((teacher) => (
                        <SelectItem key={teacher.id} value={teacher.id.toString()}>
                          {teacher.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="grid gap-2">
                <Label htmlFor="edit-timezone">Часовой пояс</Label>
                <Select
                  value={timezone || 'none'}
                  onValueChange={(value: 'BY' | 'PL' | 'none') => setTimezone(value === 'none' ? '' : value)}
                >
                  <SelectTrigger id="edit-timezone" aria-label="Часовой пояс">
                    <SelectValue placeholder="Выберите часовой пояс (необязательно)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Не выбрано</SelectItem>
                    <SelectItem value="BY">BY</SelectItem>
                    <SelectItem value="PL">PL</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Отмена
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Сохранение...' : 'Сохранить'}
              </Button>
            </DialogFooter>
          </form>

          {isAdmin && (
            <div className="border-t pt-4 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
              <h3 className="mb-3 text-sm font-semibold" id="plan-change-title">
                Изменить план для ученика
              </h3>
              <form onSubmit={handleSavePlanChange} className="flex flex-col gap-4">
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
                                  {plan.plan_price.toLocaleString()} {plan.plan_currency} {currencyFlags[plan.plan_currency] ?? ''}
                                </span>
                              </span>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
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
                  <div className="grid gap-2">
                    <Label htmlFor="plan-new">Новый план</Label>
                    <Select value={newPlanId} onValueChange={setNewPlanId}>
                      <SelectTrigger id="plan-new" aria-label="Новый план">
                        <SelectValue placeholder="Не выбрано" />
                      </SelectTrigger>
                      <SelectContent>
                        {activePlans.map((plan) => (
                          <SelectItem key={plan.id} value={plan.id.toString()}>
                            <span className="flex items-center gap-2">
                              <span>{plan.plan_name}</span>
                              <span className="text-muted-foreground">
                                {plan.plan_price.toLocaleString()} {plan.plan_currency} {currencyFlags[plan.plan_currency] ?? ''}
                              </span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter className="sm:justify-start">
                  <Button
                    type="submit"
                    variant="secondary"
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
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

