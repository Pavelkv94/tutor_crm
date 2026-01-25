import { X } from 'lucide-react'
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
import { Card, CardContent } from '@/components/ui/card'
import type { RegularLessonInput, WeekDay, Teacher, Plan } from '@/types'

const currencyFlags: Record<string, string> = {
	USD: '🇺🇸',
	EUR: '🇪🇺',
	PLN: '🇵🇱',
	BYN: '🇧🇾',
	RUB: '🇷🇺',
}

interface RegularLessonCardProps {
  lesson: RegularLessonInput
  teachers: Teacher[]
  plans: Plan[]
  onUpdate: (lesson: RegularLessonInput) => void
  onRemove: () => void
}

const WEEK_DAYS: WeekDay[] = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
]

// Generate time options with 5-minute intervals from 8:00 to 22:00
const generateTimeOptions = () => {
  const options: string[] = []
  for (let hour = 8; hour <= 22; hour++) {
    for (let minute = 0; minute < 60; minute += 5) {
      // Skip times after 22:00
      if (hour === 22 && minute > 0) break
      const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
      options.push(timeString)
    }
  }
  return options
}

const TIME_OPTIONS = generateTimeOptions()

// Parse UTC+3 ISO string to display date (YYYY-MM-DD format)
// When we store dates as UTC+3 ISO strings, we need to parse them back correctly
const parseUTC3DateForDisplay = (isoString: string): string => {
  // Parse the ISO string and adjust for UTC+3 offset
  const date = new Date(isoString)
  // Add 3 hours to convert from UTC back to UTC+3 for display
  const utc3Date = new Date(date.getTime() + 3 * 60 * 60 * 1000)
  const year = utc3Date.getUTCFullYear()
  const month = String(utc3Date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(utc3Date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const RegularLessonCard = ({
  lesson,
  teachers,
  plans,
  onUpdate,
  onRemove,
}: RegularLessonCardProps) => {
  const handleChange = (field: keyof RegularLessonInput, value: string | number) => {
    onUpdate({ ...lesson, [field]: value })
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex justify-between items-start mb-4">
          <h3 className="font-semibold">Регулярное занятие</h3>
          <Button variant="ghost" size="icon" onClick={onRemove}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="teacher">Преподаватель</Label>
            <Select
              value={lesson.teacher_id.toString()}
              onValueChange={(value) => handleChange('teacher_id', parseInt(value, 10))}
            >
              <SelectTrigger id="teacher">
                <SelectValue placeholder="Выберите преподавателя" />
              </SelectTrigger>
              <SelectContent>
                {teachers.filter((teacher) => !teacher.deleted_at).map((teacher) => (
                  <SelectItem key={teacher.id} value={teacher.id.toString()}>
                    {teacher.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="plan">Тариф</Label>
            <Select
              value={lesson.plan_id.toString()}
              onValueChange={(value) => handleChange('plan_id', parseInt(value, 10))}
            >
              <SelectTrigger id="plan">
                <SelectValue placeholder="Выберите тариф" />
              </SelectTrigger>
              <SelectContent>
                {plans.filter((plan) => !plan.deleted_at && plan.plan_price > 0).map((plan) => (
                  <SelectItem key={plan.id} value={plan.id.toString()}>
                    <span className="flex items-center gap-2">
                      <span>{plan.plan_name}</span>
                      <span className="text-muted-foreground">
                        {plan.plan_price.toLocaleString()} {plan.plan_currency} {currencyFlags[plan.plan_currency] || ''}
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="startTime">Время начала</Label>
            <Select
              value={lesson.start_time}
              onValueChange={(value) => handleChange('start_time', value)}
            >
              <SelectTrigger id="startTime">
                <SelectValue placeholder="Выберите время" />
              </SelectTrigger>
              <SelectContent className="max-h-[200px]">
                {TIME_OPTIONS.map((time) => (
                  <SelectItem key={time} value={time}>
                    {time}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="weekDay">День недели</Label>
            <Select
              value={lesson.week_day}
              onValueChange={(value) => handleChange('week_day', value as WeekDay)}
            >
              <SelectTrigger id="weekDay">
                <SelectValue placeholder="Выберите день" />
              </SelectTrigger>
              <SelectContent>
                {WEEK_DAYS.map((day) => {
                  const dayNames: Record<WeekDay, string> = {
                    MONDAY: 'Понедельник',
                    TUESDAY: 'Вторник',
                    WEDNESDAY: 'Среда',
                    THURSDAY: 'Четверг',
                    FRIDAY: 'Пятница',
                    SATURDAY: 'Суббота',
                    SUNDAY: 'Воскресенье',
                  }
                  return (
                    <SelectItem key={day} value={day}>
                      {dayNames[day]}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="startPeriodDate">Дата начала периода</Label>
            <Input
              id="startPeriodDate"
              type="date"
              value={parseUTC3DateForDisplay(lesson.start_period_date)}
              onChange={(e) => {
                const dateValue = e.target.value
                const [year, month, day] = dateValue.split('-')
                const date = new Date(`${year}-${month}-${day}T06:00:00`)
                handleChange('start_period_date', date.toISOString())
              }}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="endPeriodDate">Дата окончания периода</Label>
            <Input
              id="endPeriodDate"
              type="date"
              value={parseUTC3DateForDisplay(lesson.end_period_date)}
              onChange={(e) => {
                const dateValue = e.target.value
                const [year, month, day] = dateValue.split('-')
                const date = new Date(`${year}-${month}-${day}T06:00:00`)
                handleChange('end_period_date', date.toISOString())
              }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

