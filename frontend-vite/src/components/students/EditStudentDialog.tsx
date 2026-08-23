import { useState, useEffect } from 'react'
import { format } from 'date-fns'
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
import { RegionSelect } from '@/components/shared/RegionSelect'
import { useAuth } from '@/contexts/AuthContext'
import type { RegionCode } from '@/constants/regions'
import { STUDENT_CLASS_OPTIONS } from '@/constants/student-class'
import type { UpdateStudentInput } from '@/types'
import {
  MARKETING_CONSENT_OPTIONS,
  fromMarketingConsentValue,
  toMarketingConsentValue,
  type MarketingConsentValue,
} from '@/constants/marketing-consent'
import { MAX_STUDENT_DISCOUNT_PERCENT } from '@/constants/payments'
import { formatMoney, getCurrencyFlag } from '@/constants/currency'

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
  const [timezone, setTimezone] = useState<RegionCode | ''>('')
	const [marketingConsent, setMarketingConsent] = useState<MarketingConsentValue>('unasked')
  const [discount, setDiscount] = useState('0')
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

  const activeTeachers = teachers.filter((teacher) => !teacher.deleted_at)

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
			setMarketingConsent(toMarketingConsentValue(student))
      setDiscount(student.discount.toString())
    }
  }, [student, open, studentId])

  const updateMutation = useMutation({
    mutationFn: (data: UpdateStudentInput) => studentsApi.update(studentId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] })
      queryClient.invalidateQueries({ queryKey: ['student', studentId] })
      onOpenChange(false)
    },
  })

  useEffect(() => {
    if (!open) {
      setName('')
      setStudentClass('')
      setBirthDate('')
      setTeacherId('')
      setTimezone('')
			setMarketingConsent('unasked')
      setDiscount('0')
    }
  }, [open])

  const discountValue = Number(discount)
  const isDiscountValid =
    Number.isInteger(discountValue) && discountValue >= 0 && discountValue <= MAX_STUDENT_DISCOUNT_PERCENT

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !studentClass) return

    const data: UpdateStudentInput = {
      name,
      class: parseInt(studentClass, 10),
      birth_date: birthDate ? new Date(birthDate).toISOString() : undefined,
      timezone: timezone || null,
			marketing_consent: fromMarketingConsentValue(marketingConsent),
    }

    // Only include teacher_id if admin and it's provided
    if (isAdmin && teacherId) {
      data.teacher_id = parseInt(teacherId, 10)
    }

    // Скидку назначает только администратор — у преподавателя поля нет, и слать его нечего.
    if (isAdmin) {
      data.discount = discountValue
    }

    updateMutation.mutate(data)
  }

  if (!student) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`max-h-[90vh] overflow-y-auto ${isAdmin ? 'sm:max-w-2xl' : 'sm:max-w-[425px]'}`}
        aria-describedby="edit-student-description"
        aria-labelledby="edit-student-title"
      >
        <DialogHeader>
          <DialogTitle id="edit-student-title">Редактировать ученика</DialogTitle>
          <DialogDescription id="edit-student-description">
            Изменить информацию об ученике.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className={`grid gap-4 py-4 ${isAdmin ? 'sm:grid-cols-2' : ''}`}>
              <div className="grid gap-2">
                <Label htmlFor="edit-name">Имя</Label>
                <Input
                  id="edit-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Введите имя ученика"
                  required
                  aria-label="Имя ученика"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-class">Класс</Label>
                <Select value={studentClass} onValueChange={setStudentClass} required>
                  <SelectTrigger id="edit-class" aria-label="Класс">
                    <SelectValue placeholder="Выберите класс" />
                  </SelectTrigger>
                  <SelectContent>
                    {STUDENT_CLASS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value.toString()}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
              <RegionSelect
                id="edit-timezone"
                optional
                value={timezone}
                onValueChange={setTimezone}
              />
							{isAdmin && (
								<div className="grid gap-2">
									<Label>Баланс</Label>
									<div className="flex items-center gap-2 text-sm font-semibold">
										<span>{formatMoney(student.balance, student.balance_currency)}</span>
										{student.balance_currency && (
											<span aria-hidden="true">{getCurrencyFlag(student.balance_currency)}</span>
										)}
									</div>
									<p className="text-xs text-muted-foreground">
										Валюта задаётся платежом и меняется только через корректировку баланса.
									</p>
								</div>
							)}
							{isAdmin && (
								<div className="grid gap-2">
									<Label htmlFor="edit-discount">Скидка, %</Label>
									<Input
										id="edit-discount"
										type="number"
										min={0}
										max={MAX_STUDENT_DISCOUNT_PERCENT}
										step={1}
										value={discount}
										onChange={(e) => setDiscount(e.target.value)}
									/>
									<p className="text-xs text-muted-foreground">
										0 — без скидки, максимум {MAX_STUDENT_DISCOUNT_PERCENT}%. Действует на новые счета.
									</p>
								</div>
							)}
							<div className={`grid gap-3 ${isAdmin ? 'sm:col-span-2' : ''}`}>
								<div className="grid gap-2">
									<Label htmlFor="edit-marketingConsent">Согласие на маркетинг</Label>
									<Select
										value={marketingConsent}
										onValueChange={(value) => setMarketingConsent(value as MarketingConsentValue)}
									>
										<SelectTrigger id="edit-marketingConsent" aria-label="Согласие на маркетинг">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{MARKETING_CONSENT_OPTIONS.map((option) => (
												<SelectItem key={option.value} value={option.value}>
													{option.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								<p className="text-xs text-muted-foreground">
									{student.marketing_consent_at
										? `Ответ про фото/видео получен ${format(new Date(student.marketing_consent_at), 'dd.MM.yyyy')}`
										: 'Про фото/видео ещё не спрашивали — вопрос появится на странице оплаты'}
									{'. «Не спрашивали» сбрасывает ответ — вопрос снова появится на странице оплаты'}
								</p>
							</div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Отмена
              </Button>
              <Button type="submit" disabled={updateMutation.isPending || (isAdmin && !isDiscountValid)}>
                {updateMutation.isPending ? 'Сохранение...' : 'Сохранить'}
              </Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

