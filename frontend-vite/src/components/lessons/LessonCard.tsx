import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
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

// Format UTC+0 date to UTC+3 date and time string
const formatUTC3DateTime = (utcDate: string): string => {
	const date = new Date(utcDate)
	const utcYear = date.getUTCFullYear()
	const utcMonth = date.getUTCMonth()
	const utcDay = date.getUTCDate()
	let utcHours = date.getUTCHours()
	const utcMinutes = date.getUTCMinutes()

	// Add 3 hours for UTC+3
	utcHours += 3

	// Handle day overflow
	let day = utcDay
	let hours = utcHours
	if (hours >= 24) {
		hours -= 24
		day += 1
	}

	const months = [
		'Января', 'Февраля', 'Марта', 'Апреля', 'Мая', 'Июня',
		'Июля', 'Августа', 'Сентября', 'Октября', 'Ноября', 'Декабря'
	]

	const hoursStr = hours.toString().padStart(2, '0')
	const minutesStr = utcMinutes.toString().padStart(2, '0')

	return `${day} ${months[utcMonth]} ${utcYear}, ${hoursStr}:${minutesStr}`
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
  const [isSubmittingFreeStatus, setIsSubmittingFreeStatus] = useState(false)
  const [isDeletingLesson, setIsDeletingLesson] = useState(false)
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('')
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
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

  const handleToggleFreeStatus = async () => {
    setIsSubmittingFreeStatus(true)
    setError(null)

    try {
      await lessonsApi.manageFreeLessonStatus(lesson.id, !lesson.is_free)
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['lessons'] })
    } catch (err: unknown) {
      console.error('Error toggling free status:', err)
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { data?: { message?: string | string[] } } }
        const message = axiosError.response?.data?.message
        if (Array.isArray(message)) {
          setError(message.join(', '))
        } else if (typeof message === 'string') {
          setError(message)
        } else {
          setError('Не удалось изменить статус занятия. Пожалуйста, попробуйте снова.')
        }
      } else {
        setError('Не удалось изменить статус занятия. Пожалуйста, попробуйте снова.')
      }
    } finally {
      setIsSubmittingFreeStatus(false)
    }
  }

  const handleDeleteClick = () => {
    setIsDeleteDialogOpen(true)
    setDeleteConfirmationText('')
    setError(null)
  }

  const handleDeleteSubmit = async () => {
    if (deleteConfirmationText.trim().toLowerCase() !== 'delete lesson') {
      return
    }

    setIsDeletingLesson(true)
    setError(null)

    try {
      await lessonsApi.deleteLesson(lesson.id)
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['lessons'] })
      
      setIsDeleteDialogOpen(false)
      setDeleteConfirmationText('')
      onCancel()
    } catch (err: unknown) {
      console.error('Error deleting lesson:', err)
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { data?: { message?: string | string[] } } }
        const message = axiosError.response?.data?.message
        if (Array.isArray(message)) {
          setError(message.join(', '))
        } else if (typeof message === 'string') {
          setError(message)
        } else {
          setError('Не удалось удалить занятие. Пожалуйста, попробуйте снова.')
        }
      } else {
        setError('Не удалось удалить занятие. Пожалуйста, попробуйте снова.')
      }
    } finally {
      setIsDeletingLesson(false)
    }
  }

  const handleDeleteCancel = () => {
    setIsDeleteDialogOpen(false)
    setDeleteConfirmationText('')
    setError(null)
  }

  const isDeleteConfirmationValid = deleteConfirmationText.trim().toLowerCase() === 'delete lesson'

  const timeString = getUTC3TimeString(lesson.date)
  const statusInfo = getStatusInfo(lesson.status)
  
  // Check if lesson is already cancelled or has inactive status
  const inactiveStatuses = ['MISSED', 'RESCHEDULED', 'CANCELLED']
  const isLessonInactive = inactiveStatuses.includes(lesson.status)

	// Check if lesson is already rescheduled (has rescheduled_lesson_id)
	const isAlreadyRescheduled = lesson.rescheduled_lesson_id !== null

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
							<div className="flex items-center gap-2 flex-wrap">
                <span className={`text-sm font-semibold ${statusInfo.color}`}>
                  {statusInfo.label}
                </span>
								{lesson.is_trial && (
									<span className="text-xs px-2 py-0.5 rounded font-medium" style={{ backgroundColor: '#fef3c7', color: '#92400e' }}>
										Пробное
									</span>
								)}
                {lesson.is_free && (
                  <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700 font-medium">
                    Бесплатное
                  </span>
                )}
              </div>
            </div>
          </div>

					{/* Rescheduling Info */}
					{(lesson.rescheduled_to_lesson_date || lesson.rescheduled_lesson_date) && (
						<div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
							{lesson.rescheduled_to_lesson_date && (
								<div className="mb-2">
									<Label className="text-sm font-medium text-blue-700">Перенесено на:</Label>
									<p className="text-sm text-blue-900 font-semibold mt-1">
										{formatUTC3DateTime(lesson.rescheduled_to_lesson_date)}
									</p>
								</div>
							)}
							{lesson.rescheduled_lesson_date && (
								<div>
									<Label className="text-sm font-medium text-blue-700">Отработка занятия:</Label>
									<p className="text-sm text-blue-900 font-semibold mt-1">
										{formatUTC3DateTime(lesson.rescheduled_lesson_date)}
									</p>
								</div>
							)}
						</div>
					)}

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
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleChangeTeacherClick} className={lesson.is_trial ? "w-full" : "flex-1"}>
                    Изменить преподавателя
                  </Button>
                  {!lesson.is_trial && (
                    <Button 
                      variant="outline" 
                      onClick={handleToggleFreeStatus} 
                      disabled={isSubmittingFreeStatus}
                      className="flex-1"
                    >
                      {isSubmittingFreeStatus 
                        ? 'Сохранение...' 
                        : lesson.is_free 
                          ? 'Убрать бесплатное' 
                          : 'Сделать бесплатным'
                      }
                    </Button>
                  )}
                </div>
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
                <div className="flex gap-2">
                  <Button 
                    variant="destructive" 
                    onClick={handleCancelClick} 
                    disabled={isLessonInactive}
                    className="flex-1"
                  >
                    Отменить занятие
                  </Button>
									{isAdmin && (
										<Button
											variant="outline"
											onClick={handleDeleteClick}
											className="flex-1 border-red-500 text-red-600 hover:bg-red-50 hover:text-red-700"
										>
											Удалить занятие
										</Button>
									)}
                </div>
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
													disabled={isAlreadyRescheduled}
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
													className={`text-sm font-normal ${isAlreadyRescheduled ? 'cursor-not-allowed text-muted-foreground' : 'cursor-pointer'}`}
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
											{isAdmin && <div className="flex items-center space-x-2">
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
											</div>}
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

          {/* Delete Lesson Dialog */}
          <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Удалить занятие</DialogTitle>
                <DialogDescription>
                  Это действие нельзя отменить. Это полностью удалит занятие из системы.
                  <br />
                  <br />
                  Для подтверждения введите <strong>delete lesson</strong> в поле ниже:
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="delete-confirmation">Подтверждение</Label>
                  <Input
                    id="delete-confirmation"
                    value={deleteConfirmationText}
                    onChange={(e) => setDeleteConfirmationText(e.target.value)}
                    placeholder="delete lesson"
                    className="w-full"
                  />
                </div>
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={handleDeleteCancel}
                  disabled={isDeletingLesson}
                >
                  Отмена
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteSubmit}
                  disabled={!isDeleteConfirmationValid || isDeletingLesson}
                >
                  {isDeletingLesson ? 'Удаление...' : 'Удалить занятие'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  )
}

