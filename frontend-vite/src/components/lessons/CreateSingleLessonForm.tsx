import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { lessonsApi } from '@/api/lessons'
import type { Student, Plan, Teacher, SingleLessonInput } from '@/types'

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

interface CreateSingleLessonFormProps {
  students: Student[]
  plans: Plan[]
  teachers: Teacher[]
  defaultTeacherId: number
  defaultDate: string // YYYY-MM-DD format in UTC+3
  defaultTime: string // HH:MM format
  disableDate?: boolean // Disable date field when true
  onSuccess: () => void
  onCancel: () => void
}

// Convert UTC+3 date and time to UTC+0 ISO string
const convertUTC3ToUTC0 = (dateStr: string, timeStr: string): string => {
  // Parse date and time in UTC+3
  const [year, month, day] = dateStr.split('-').map(Number)
  const [hours, minutes] = timeStr.split(':').map(Number)
  
  // Create date at the specified time, treating it as UTC+3
  // We create it as UTC first, then adjust
  const utcDate = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0))
  
  // Subtract 3 hours to convert from UTC+3 to UTC+0
  const utc0Date = new Date(utcDate.getTime() - 3 * 60 * 60 * 1000)
  
  return utc0Date.toISOString()
}

export const CreateSingleLessonForm = ({
  students,
  plans,
  teachers,
  defaultTeacherId,
  defaultDate,
  defaultTime,
  disableDate = false,
  onSuccess,
  onCancel,
}: CreateSingleLessonFormProps) => {
  const [studentId, setStudentId] = useState<string>('')
  const [planId, setPlanId] = useState<string>('')
  const [teacherId, setTeacherId] = useState<string>(defaultTeacherId.toString())
  const [date, setDate] = useState<string>(defaultDate)
  const [time, setTime] = useState<string>(defaultTime)
  const [isFree, setIsFree] = useState<boolean>(false)
  const [isTrial, setIsTrial] = useState<boolean>(false)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

  const handleSubmit = async () => {
    if (!studentId || !planId || !teacherId || !date || !time) {
      return
    }

    setIsSubmitting(true)
    try {
      const startDate = convertUTC3ToUTC0(date, time)
      const data: SingleLessonInput = {
        student_id: parseInt(studentId, 10),
        plan_id: parseInt(planId, 10),
        teacher_id: parseInt(teacherId, 10),
        start_date: startDate,
        isFree,
        isTrial,
      }
      await lessonsApi.createSingleLesson(data)
      onSuccess()
    } catch (error) {
      console.error('Error creating single lesson:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const activeStudents = students.filter((student) => !student.deleted_at)
  // Filter plans: if isTrial is true, only show plans with price 0; if false, only show plans with price > 0
  const activePlans = plans.filter((plan) => {
    if (!plan.deleted_at) {
      if (isTrial) {
        return plan.plan_price === 0
      }
      return plan.plan_price > 0
    }
    return false
  })
  const activeTeachers = teachers.filter((teacher) => !teacher.deleted_at)

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4">
          <h3 className="font-semibold text-lg mb-4">Создать разовое занятие</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="student">Ученик</Label>
              <Select value={studentId} onValueChange={setStudentId}>
                <SelectTrigger id="student">
                  <SelectValue placeholder="Выберите ученика" />
                </SelectTrigger>
                <SelectContent>
                  {activeStudents.map((student) => (
                    <SelectItem key={student.id} value={student.id.toString()}>
                      {student.name} - {student.class}кл
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="plan">Тариф</Label>
              <Select value={planId} onValueChange={setPlanId}>
                <SelectTrigger id="plan">
                  <SelectValue placeholder="Выберите тариф" />
                </SelectTrigger>
                <SelectContent>
                  {activePlans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id.toString()}>
                      {plan.plan_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="teacher">Преподаватель</Label>
              <Select value={teacherId} onValueChange={setTeacherId}>
                <SelectTrigger id="teacher">
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
            <div className="grid gap-2">
              <Label htmlFor="date">Дата</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                disabled={disableDate}
                className={disableDate ? 'bg-gray-100' : ''}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="time">Время</Label>
              <Select value={time} onValueChange={setTime}>
                <SelectTrigger id="time">
                  <SelectValue placeholder="Выберите время" />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  {TIME_OPTIONS.map((timeOption) => (
                    <SelectItem key={timeOption} value={timeOption}>
                      {timeOption}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label className="text-sm font-medium text-muted-foreground">Тип занятия</Label>
              <div className="flex flex-col gap-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isTrial"
                    checked={isTrial}
                    disabled={isFree}
                    onCheckedChange={(checked) => {
                      const newIsTrial = checked === true
                      setIsTrial(newIsTrial)
                      // When isTrial is checked, disable and uncheck isFree
                      if (newIsTrial) {
                        setIsFree(false)
                        // Reset plan selection if current plan doesn't have price 0
                        if (planId) {
                          const selectedPlan = plans.find((p) => p.id.toString() === planId)
                          if (selectedPlan && selectedPlan.plan_price !== 0) {
                            setPlanId('')
                          }
                        }
                      } else {
                        // When isTrial is unchecked, reset plan selection if current plan has price 0
                        if (planId) {
                          const selectedPlan = plans.find((p) => p.id.toString() === planId)
                          if (selectedPlan && selectedPlan.plan_price === 0) {
                            setPlanId('')
                          }
                        }
                      }
                    }}
                  />
                  <Label htmlFor="isTrial" className={`text-sm font-normal ${isFree ? 'cursor-not-allowed text-muted-foreground' : 'cursor-pointer'}`}>
                    Пробное занятие
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isFree"
                    checked={isFree}
                    disabled={isTrial}
                    onCheckedChange={(checked) => {
                      const newIsFree = checked === true
                      setIsFree(newIsFree)
                      // When isFree is checked, disable and uncheck isTrial
                      if (newIsFree) {
                        setIsTrial(false)
                      }
                    }}
                  />
                  <Label htmlFor="isFree" className={`text-sm font-normal ${isTrial ? 'cursor-not-allowed text-muted-foreground' : 'cursor-pointer'}`}>
                    Бесплатное занятие
                  </Label>
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-2 pt-4">
            <Button
              variant="default"
              onClick={handleSubmit}
              disabled={!studentId || !planId || !teacherId || !date || !time || isSubmitting}
              className="flex-1"
            >
              Создать
            </Button>
            <Button variant="outline" onClick={onCancel} className="flex-1">
              Отмена
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

