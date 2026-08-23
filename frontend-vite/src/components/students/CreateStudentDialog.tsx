import { useState } from 'react'
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
import { MAX_STUDENT_DISCOUNT_PERCENT } from '@/constants/payments'
import type { CreateStudentInput } from '@/types'
import {
  MARKETING_CONSENT_OPTIONS,
  fromMarketingConsentValue,
  type MarketingConsentValue,
} from '@/constants/marketing-consent'

interface CreateStudentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const CreateStudentDialog = ({ open, onOpenChange }: CreateStudentDialogProps) => {
  const [name, setName] = useState('')
  const [studentClass, setStudentClass] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [teacherId, setTeacherId] = useState<string>('')
  const [timezone, setTimezone] = useState<RegionCode | ''>('')
	const [marketingConsent, setMarketingConsent] = useState<MarketingConsentValue>('unasked')
  const [discount, setDiscount] = useState('0')
  const { isAdmin, user } = useAuth()
  const queryClient = useQueryClient()

  const { data: teachers = [] } = useQuery({
    queryKey: ['teachers', 'active'],
    queryFn: () => teachersApi.getAll('active'),
    enabled: isAdmin && open,
  })

  const activeTeachers = teachers.filter((teacher) => !teacher.deleted_at)

  const discountValue = Number(discount)
  const isDiscountValid =
    Number.isInteger(discountValue) && discountValue >= 0 && discountValue <= MAX_STUDENT_DISCOUNT_PERCENT

  const isFormValid =
    name.trim() !== '' && studentClass.trim() !== '' && (!isAdmin || (teacherId !== '' && isDiscountValid))

  const createMutation = useMutation({
    mutationFn: (data: CreateStudentInput) => studentsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] })
      onOpenChange(false)
      setName('')
      setStudentClass('')
      setBirthDate('')
      setTeacherId('')
      setTimezone('')
			setMarketingConsent('unasked')
      setDiscount('0')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !studentClass) return
    if (isAdmin && !teacherId) return

    const data: CreateStudentInput = {
      name,
      class: parseInt(studentClass, 10),
      birth_date: birthDate ? new Date(birthDate).toISOString() : null,
      teacher_id: isAdmin ? parseInt(teacherId, 10) : parseInt(user?.id || '0', 10),
      timezone: timezone || null,
			marketing_consent: fromMarketingConsentValue(marketingConsent),
    }

    // Скидку назначает только администратор — у преподавателя поля нет, и слать его нечего.
    if (isAdmin) {
      data.discount = discountValue
    }

    createMutation.mutate(data)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Создать ученика</DialogTitle>
          <DialogDescription>Добавить нового ученика в систему.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Имя</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Введите имя ученика"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="class">Класс</Label>
              <Select value={studentClass} onValueChange={setStudentClass} required>
                <SelectTrigger id="class" aria-label="Класс">
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
              <Label htmlFor="birthDate">Дата рождения</Label>
              <Input
                id="birthDate"
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
              />
            </div>
            {isAdmin && (
              <div className="grid gap-2">
                <Label htmlFor="teacher">Преподаватель</Label>
                <Select value={teacherId} onValueChange={setTeacherId} required>
                  <SelectTrigger>
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
              optional
              value={timezone}
              onValueChange={setTimezone}
            />
            {isAdmin && (
              <div className="grid gap-2">
                <Label htmlFor="discount">Скидка, %</Label>
                <Input
                  id="discount"
                  type="number"
                  min={0}
                  max={MAX_STUDENT_DISCOUNT_PERCENT}
                  step={1}
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Уменьшает цену каждого занятия в счёте. 0 — без скидки, максимум{' '}
                  {MAX_STUDENT_DISCOUNT_PERCENT}%.
                </p>
              </div>
            )}
						<div className="grid gap-2">
							<Label htmlFor="marketingConsent">Согласие на маркетинг</Label>
							<Select
								value={marketingConsent}
								onValueChange={(value) => setMarketingConsent(value as MarketingConsentValue)}
							>
								<SelectTrigger id="marketingConsent" aria-label="Согласие на маркетинг">
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
							<p className="text-xs text-muted-foreground">
								«Не спрашивали» — вопрос про фото/видео задаст страница оплаты.
							</p>
						</div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={createMutation.isPending || !isFormValid}>
              {createMutation.isPending ? 'Создание...' : 'Создать'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
