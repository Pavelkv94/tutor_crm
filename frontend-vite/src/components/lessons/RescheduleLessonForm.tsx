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
import { useAuth } from '@/contexts/AuthContext'
import type { Lesson, Teacher, RescheduledLessonInput } from '@/types'

// Generate minutes options with 5-minute intervals from 00 to 55
const generateMinutesOptions = () => {
  const options: string[] = []
  for (let minute = 0; minute < 60; minute += 5) {
    options.push(minute.toString().padStart(2, '0'))
  }
  return options
}

const MINUTES_OPTIONS = generateMinutesOptions()

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

interface RescheduleLessonFormProps {
  lesson: Lesson
  teachers: Teacher[]
  defaultDate: string // YYYY-MM-DD format in UTC+3
  defaultTime: string // HH:MM format
  defaultTeacherId: number
  onSuccess: () => void
  onCancel: () => void
}

export const RescheduleLessonForm = ({
  lesson,
  teachers,
  defaultDate,
  defaultTime,
  defaultTeacherId,
  onSuccess,
  onCancel,
}: RescheduleLessonFormProps) => {
  const { isAdmin } = useAuth()
  const [teacherId, setTeacherId] = useState<string>(defaultTeacherId.toString())
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  // Extract hour from defaultTime (format: HH:MM)
  const defaultHour = defaultTime.split(':')[0] || '00'
  const [hour] = useState<string>(defaultHour)
  const [minutes, setMinutes] = useState<string>('00')

  const handleSubmit = async () => {
    if (!teacherId || !hour || !minutes) {
      return
    }

    setIsSubmitting(true)
    try {
      // Combine hour and minutes into time string
      const time = `${hour}:${minutes}`
      const startDate = convertUTC3ToUTC0(defaultDate, time)
			console.log(teacherId)
      const data: RescheduledLessonInput = {
        rescheduled_lesson_id: lesson.id,
				teacher_id: parseInt(teacherId, 10),
        start_date: startDate,
      }
      await lessonsApi.createRescheduledLesson(data)
      onSuccess()
    } catch (error) {
      console.error('Error creating rescheduled lesson:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const activeTeachers = teachers.filter((teacher) => !teacher.deleted_at)

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4">
          <h3 className="font-semibold text-lg mb-4">Отработать занятие</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="student">Ученик</Label>
              <Input
                id="student"
                value={`${lesson.student.name} - ${lesson.student.class}кл`}
                disabled
                className="bg-gray-100"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="plan">Тариф</Label>
              <Input
                id="plan"
                value={`${lesson.plan.plan_name} - ${lesson.plan.duration}мин`}
                disabled
                className="bg-gray-100"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="teacher">Преподаватель</Label>
              {isAdmin ? (
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
              ) : (
                <Input
                  id="teacher"
                  value={lesson.teacher.name}
                  disabled
                  className="bg-gray-100"
                />
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="date">Дата</Label>
              <Input
                id="date"
                type="date"
                value={defaultDate}
                disabled
                className="bg-gray-100"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="time">Время</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="hour"
                  value={hour}
                  disabled
                  className="w-16 bg-gray-100 text-center"
                />
                <span className="text-lg font-semibold">:</span>
                <Select value={minutes} onValueChange={setMinutes}>
                  <SelectTrigger id="minutes" className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MINUTES_OPTIONS.map((minuteOption) => (
                      <SelectItem key={minuteOption} value={minuteOption}>
                        {minuteOption}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center space-x-2 pt-6">
              <Checkbox
                id="isFree"
                checked={lesson.is_free}
                disabled
                className="bg-gray-100"
              />
              <Label htmlFor="isFree" className="text-sm font-normal">
                Бесплатное занятие
              </Label>
            </div>
          </div>
          <div className="flex gap-2 pt-4">
            <Button
              variant="default"
              onClick={handleSubmit}
              disabled={!teacherId || !hour || !minutes || isSubmitting}
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

