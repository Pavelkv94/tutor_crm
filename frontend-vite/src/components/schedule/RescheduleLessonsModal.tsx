import { useQuery } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'
import { lessonsApi } from '@/api/lessons'
import { useAuth } from '@/contexts/AuthContext'
import type { Lesson } from '@/types'

interface RescheduleLessonsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  teacherId?: string
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

// Format date to readable format
const formatDate = (utcDate: string): string => {
  const date = new Date(utcDate)
  const utcYear = date.getUTCFullYear()
  const utcMonth = date.getUTCMonth()
  const utcDay = date.getUTCDate()
  
  // Add 3 hours for UTC+3
  let utcHours = date.getUTCHours() + 3
  let day = utcDay
  if (utcHours >= 24) {
    utcHours -= 24
    day += 1
  }
  
  const months = [
    'Января', 'Февраля', 'Марта', 'Апреля', 'Мая', 'Июня',
    'Июля', 'Августа', 'Сентября', 'Октября', 'Ноября', 'Декабря'
  ]
  
  return `${day} ${months[utcMonth]} ${utcYear}`
}

export const RescheduleLessonsModal = ({
  open,
  onOpenChange,
  teacherId,
}: RescheduleLessonsModalProps) => {
  const { isAdmin, user } = useAuth()
  
  // Determine which teacher ID to use
  const effectiveTeacherId = isAdmin && teacherId ? teacherId : user?.id.toString()

  // Fetch lessons for rescheduling
  const { data: lessons = [], isLoading } = useQuery({
    queryKey: ['lessons', 'rescheduled', effectiveTeacherId],
    queryFn: () => lessonsApi.getLessonsForReschedule(effectiveTeacherId),
    enabled: open && !!effectiveTeacherId,
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Доступные занятия для переноса</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Instruction */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-gray-700">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.
            </p>
          </div>

          {/* Lessons List */}
          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Загрузка...</p>
            </div>
          ) : lessons.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Нет доступных занятий для переноса</p>
            </div>
          ) : (
            <div className="space-y-4">
              {lessons.map((lesson: Lesson) => {
                const timeString = getUTC3TimeString(lesson.date)
                const statusInfo = getStatusInfo(lesson.status)
                const dateString = formatDate(lesson.date)
                
                return (
                  <Card key={lesson.id}>
                    <CardContent className="p-3">
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Ученик:</span>{' '}
                            <span className="font-semibold">{lesson.student.name}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Класс:</span>{' '}
                            <span className="font-semibold">{lesson.student.class}кл</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Преподаватель:</span>{' '}
                            <span className="font-semibold">{lesson.teacher.name}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Тариф:</span>{' '}
                            <span className="font-semibold">
                              {lesson.plan.plan_name} - {lesson.plan.duration}мин
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Дата:</span>{' '}
                            <span className="font-semibold">{dateString}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Время:</span>{' '}
                            <span className="font-semibold">{timeString}</span>
                          </div>
                          <div className="col-span-2 md:col-span-1">
                            <span className="text-muted-foreground">Статус:</span>{' '}
                            <span className={`font-semibold ${statusInfo.color}`}>
                              {statusInfo.label}
                            </span>
                            {lesson.is_free && (
                              <span className="ml-2 text-xs px-2 py-0.5 rounded bg-green-100 text-green-700 font-medium">
                                Бесплатное
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Comment Section - Display when lesson has a comment */}
                        {lesson.comment && (
                          <div className="mt-2 pt-2 border-t border-gray-200">
                            <p className="text-xs text-muted-foreground mb-1">Комментарий:</p>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">{lesson.comment}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

