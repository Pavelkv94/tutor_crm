import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
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
import { Textarea } from '@/components/ui/textarea'
import { lessonsApi } from '@/api/lessons'
import type { Lesson, Teacher, CancelLessonInput } from '@/types'
import { useAuth } from '@/contexts/AuthContext'

interface LessonCardProps {
  lesson: Lesson
  teachers: Teacher[]
  onCancel: () => void
}

// Convert UTC+0 date to UTC+3 and get time string
const getUTC3TimeString = (utcDate: string): string => {
  const date = new Date(utcDate)
  let utcHours = date.getUTCHours()
  const utcMinutes = date.getUTCMinutes()
  
  // Add 3 hours for UTC+3
  utcHours += 3
  
  // Handle day overflow
  let hours = utcHours
  if (hours >= 24) {
    hours -= 24
  }
  
  const hoursStr = hours.toString().padStart(2, '0')
  const minutesStr = utcMinutes.toString().padStart(2, '0')
  return `${hoursStr}:${minutesStr}`
}

// Get status label and color
const getStatusInfo = (status: string): { label: string; color: string; bgColor: string } => {
  switch (status) {
    case 'PENDING_PAID':
      return { label: 'Ожидает (Оплачено)', color: 'text-blue-600', bgColor: 'bg-blue-50' }
    case 'PENDING_UNPAID':
      return { label: 'Ожидает (Не оплачено)', color: 'text-orange-600', bgColor: 'bg-orange-50' }
    case 'COMPLETED_PAID':
      return { label: 'Завершено (Оплачено)', color: 'text-green-600', bgColor: 'bg-green-50' }
    case 'COMPLETED_UNPAID':
      return { label: 'Завершено (Не оплачено)', color: 'text-yellow-600', bgColor: 'bg-yellow-50' }
    case 'MISSED':
      return { label: 'Прогул', color: 'text-red-600', bgColor: 'bg-red-50' }
    case 'RESCHEDULED':
      return { label: 'Перенесено', color: 'text-purple-600', bgColor: 'bg-purple-50' }
    case 'CANCELLED':
      return { label: 'Отменено', color: 'text-gray-600', bgColor: 'bg-gray-50' }
    default:
      return { label: status, color: 'text-gray-600', bgColor: 'bg-gray-50' }
  }
}

export const LessonCard = ({ lesson, teachers, onCancel }: LessonCardProps) => {
  const { isAdmin } = useAuth()
  const queryClient = useQueryClient()
  const [isCancelling, setIsCancelling] = useState(false)
  const [comment, setComment] = useState('')
  const [rescheduled, setRescheduled] = useState(false)
  const [missed, setMissed] = useState(false)
  const [fullCancel, setFullCancel] = useState(false)
  const [isChangingTeacher, setIsChangingTeacher] = useState(false)
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('')
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false)
  const [isSubmittingChangeTeacher, setIsSubmittingChangeTeacher] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCancelClick = () => {
    setIsCancelling(true)
  }

  const handleCheckboxChange = (type: 'rescheduled' | 'missed' | 'fullCancel') => {
    // Only one checkbox can be checked at a time
    setRescheduled(type === 'rescheduled')
    setMissed(type === 'missed')
    setFullCancel(type === 'fullCancel')
  }

  const handleCancelSubmit = async () => {
    if (!isAnyCheckboxChecked) {
      return
    }

    setIsSubmittingCancel(true)
    setError(null)

    try {
      const cancelData: CancelLessonInput = {
        comment,
        rescheduled,
        missed,
        fullCancel,
      }
      
      await lessonsApi.cancelLesson(lesson.id, cancelData)
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['lessons'] })
      
      setIsCancelling(false)
      setComment('')
      setRescheduled(false)
      setMissed(false)
      setFullCancel(false)
      onCancel()
    } catch (err: unknown) {
      console.error('Error canceling lesson:', err)
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { data?: { message?: string | string[] } } }
        const message = axiosError.response?.data?.message
        if (Array.isArray(message)) {
          setError(message.join(', '))
        } else if (typeof message === 'string') {
          setError(message)
        } else {
          setError('Не удалось отменить занятие. Пожалуйста, попробуйте снова.')
        }
      } else {
        setError('Не удалось отменить занятие. Пожалуйста, попробуйте снова.')
      }
    } finally {
      setIsSubmittingCancel(false)
    }
  }

  const handleCancelCancel = () => {
    setIsCancelling(false)
    setComment('')
    setRescheduled(false)
    setMissed(false)
    setFullCancel(false)
    setError(null)
  }

  // Check if at least one checkbox is selected
  const isAnyCheckboxChecked = rescheduled || missed || fullCancel

  const handleChangeTeacherClick = () => {
    setIsChangingTeacher(true)
  }

  const handleChangeTeacherSubmit = async () => {
    if (!selectedTeacherId) {
      return
    }

    setIsSubmittingChangeTeacher(true)
    setError(null)

    try {
      await lessonsApi.changeTeacher(lesson.id, parseInt(selectedTeacherId, 10))
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['lessons'] })
      
      setIsChangingTeacher(false)
      setSelectedTeacherId('')
      onCancel()
    } catch (err: unknown) {
      console.error('Error changing teacher:', err)
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { data?: { message?: string | string[] } } }
        const message = axiosError.response?.data?.message
        if (Array.isArray(message)) {
          setError(message.join(', '))
        } else if (typeof message === 'string') {
          setError(message)
        } else {
          setError('Не удалось изменить преподавателя. Пожалуйста, попробуйте снова.')
        }
      } else {
        setError('Не удалось изменить преподавателя. Пожалуйста, попробуйте снова.')
      }
    } finally {
      setIsSubmittingChangeTeacher(false)
    }
  }

  const handleChangeTeacherCancel = () => {
    setIsChangingTeacher(false)
    setSelectedTeacherId('')
    setError(null)
  }

  const timeString = getUTC3TimeString(lesson.date)
  const statusInfo = getStatusInfo(lesson.status)
  
  // Check if lesson is already cancelled or has inactive status
  const inactiveStatuses = ['MISSED', 'RESCHEDULED', 'CANCELLED']
  const isLessonInactive = inactiveStatuses.includes(lesson.status)

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
          
          {/* Lesson Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Ученик</Label>
              <p className="text-sm font-semibold">{lesson.student.name}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Класс</Label>
              <p className="text-sm font-semibold">{lesson.student.class}кл</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Преподаватель</Label>
              <p className="text-sm font-semibold">{lesson.teacher.name}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Тариф</Label>
              <p className="text-sm font-semibold">
                {lesson.plan.plan_name} - {lesson.plan.duration}мин
              </p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Время</Label>
              <p className="text-sm font-semibold">{timeString}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Статус</Label>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-semibold ${statusInfo.color}`}>
                  {statusInfo.label}
                </span>
                {lesson.is_free && (
                  <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700 font-medium">
                    Бесплатное
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Comment Section - Display when lesson is cancelled and has a comment */}
          {isLessonInactive && lesson.comment && (
            <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <Label className="text-sm font-medium text-muted-foreground">Комментарий</Label>
              <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{lesson.comment}</p>
            </div>
          )}

          {/* Change Teacher Section (Admin only) */}
          {isAdmin && !isCancelling && (
            <div className="space-y-2">
              {!isChangingTeacher ? (
                <Button variant="outline" onClick={handleChangeTeacherClick} className="w-full">
                  Изменить преподавателя
                </Button>
              ) : (
                <div className="space-y-2 border p-4 rounded-lg">
                  <Label htmlFor="teacher-select">Выберите преподавателя</Label>
                  <Select value={selectedTeacherId} onValueChange={setSelectedTeacherId}>
                    <SelectTrigger id="teacher-select">
                      <SelectValue placeholder="Выберите преподавателя" />
                    </SelectTrigger>
                    <SelectContent>
                      {teachers
                        .filter((teacher) => !teacher.deleted_at)
                        .map((teacher) => (
                          <SelectItem key={teacher.id} value={teacher.id.toString()}>
                            {teacher.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <div className="flex gap-2">
                    <Button
                      variant="default"
                      onClick={handleChangeTeacherSubmit}
                      disabled={!selectedTeacherId || isSubmittingChangeTeacher}
                      className="flex-1"
                    >
                      {isSubmittingChangeTeacher ? 'Сохранение...' : 'Сохранить'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleChangeTeacherCancel}
                      disabled={isSubmittingChangeTeacher}
                      className="flex-1"
                    >
                      Отмена
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Cancel Lesson Section */}
          {!isChangingTeacher && (
            <div className="space-y-2">
              {!isCancelling ? (
                <Button 
                  variant="destructive" 
                  onClick={handleCancelClick} 
                  disabled={isLessonInactive}
                  className="w-full"
                >
                  Отменить занятие
                </Button>
              ) : (
                <div className="space-y-4 border p-4 rounded-lg">
                  <div className="space-y-2">
                    <Label htmlFor="comment">Комментарий</Label>
                    <Textarea
                      id="comment"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Введите комментарий..."
                      rows={3}
                    />
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="rescheduled"
                        checked={rescheduled}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            handleCheckboxChange('rescheduled')
                          } else {
                            setRescheduled(false)
                          }
                        }}
                      />
                      <Label
                        htmlFor="rescheduled"
                        className="text-sm font-normal cursor-pointer"
                      >
                        Перенос
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="missed"
                        checked={missed}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            handleCheckboxChange('missed')
                          } else {
                            setMissed(false)
                          }
                        }}
                      />
                      <Label htmlFor="missed" className="text-sm font-normal cursor-pointer">
                        Прогул
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="fullCancel"
                        checked={fullCancel}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            handleCheckboxChange('fullCancel')
                          } else {
                            setFullCancel(false)
                          }
                        }}
                      />
                      <Label htmlFor="fullCancel" className="text-sm font-normal cursor-pointer">
                        Отменить
                      </Label>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="destructive"
                      onClick={handleCancelSubmit}
                      disabled={!isAnyCheckboxChecked || isSubmittingCancel}
                      className="flex-1"
                    >
                      {isSubmittingCancel ? 'Отмена...' : 'Подтвердить'}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={handleCancelCancel} 
                      disabled={isSubmittingCancel}
                      className="flex-1"
                    >
                      Отмена
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

