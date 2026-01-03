import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { LessonCard } from '@/components/lessons/LessonCard'
import { CreateSingleLessonForm } from '@/components/lessons/CreateSingleLessonForm'
import { Button } from '@/components/ui/button'
import { lessonsApi } from '@/api/lessons'
import { studentsApi } from '@/api/students'
import { plansApi } from '@/api/plans'
import { teachersApi } from '@/api/teachers'
import { useAuth } from '@/contexts/AuthContext'
import type { Lesson, Student, Plan, Teacher } from '@/types'

interface ScheduleCellModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  year: number
  month: number
  day: number
  hour: number
  teacherId?: string
}

// Convert UTC+3 date components and hour to UTC+0 ISO string for API
const convertUTC3ToUTC0Date = (year: number, month: number, day: number, hour: number): string => {
  // User clicks on date/time in UTC+3 timezone
  // Example: Jan 5, 2026 at 9:00 UTC+3 = Jan 5, 2026 at 6:00 UTC
  // Create a date string representing UTC+3 time, then convert to UTC
  // We'll create it as if it's UTC first, then adjust
  
  // Create date at the specified time (treating as UTC+3)
  // To convert UTC+3 to UTC, subtract 3 hours
  const utc3Date = new Date(Date.UTC(year, month - 1, day, hour, 0, 0))
  // Subtract 3 hours to get UTC time
  const utc0Date = new Date(utc3Date.getTime() - 3 * 60 * 60 * 1000)
  
  // Return full ISO string
  return utc0Date.toISOString()
}

// Convert UTC+0 date to UTC+3 date string (YYYY-MM-DD)
const convertUTC0ToUTC3Date = (utc0Date: string): string => {
  const date = new Date(utc0Date)
  const utc3Date = new Date(date.getTime() + 3 * 60 * 60 * 1000)
  const year = utc3Date.getUTCFullYear()
  const month = String(utc3Date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(utc3Date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Get UTC+3 time string from UTC+0 date
const getUTC3TimeString = (utcDate: string): { hours: number; minutes: number } => {
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
  
  return { hours, minutes: utcMinutes }
}

export const ScheduleCellModal = ({
  open,
  onOpenChange,
  year,
  month,
  day,
  hour,
  teacherId,
}: ScheduleCellModalProps) => {
  const { isAdmin, user } = useAuth()
  const [showCreateForm, setShowCreateForm] = useState(false)
  const queryClient = useQueryClient()
  
  // Convert to UTC+0 date for API (with hour for proper conversion)
  const apiDate = convertUTC3ToUTC0Date(year, month, day, hour)
  
  // Determine which teacher ID to use
  const effectiveTeacherId = isAdmin && teacherId ? teacherId : user?.id.toString()

  // Fetch lessons for the selected date
  const { data: lessons = [], refetch: refetchLessons } = useQuery({
    queryKey: ['lessons', 'by-date', apiDate, effectiveTeacherId],
    queryFn: () => lessonsApi.getLessonsByDate(apiDate, effectiveTeacherId, isAdmin),
    enabled: open && !!effectiveTeacherId,
  })

  // Filter lessons by hour range (e.g., 9:00-9:59 for hour 9)
  const filteredLessons = lessons.filter((lesson: Lesson) => {
    const { hours: lessonHours } = getUTC3TimeString(lesson.date)
    return lessonHours === hour
  })

  // Statuses that allow adding new lessons (exclude MISSED, RESCHEDULED, CANCELLED)
  const inactiveStatuses = ['MISSED', 'RESCHEDULED', 'CANCELLED']
  
  // Get active lessons (without inactive statuses)
  const activeLessons = filteredLessons.filter(
    (lesson: Lesson) => !inactiveStatuses.includes(lesson.status)
  )
  
  // Check if there's an active INDIVIDUAL lesson
  const hasActiveIndividualLesson = activeLessons.some(
    (lesson: Lesson) => lesson.plan.plan_type === 'INDIVIDUAL'
  )
  
  // Count active PAIR lessons
  const activePairLessonsCount = activeLessons.filter(
    (lesson: Lesson) => lesson.plan.plan_type === 'PAIR'
  ).length
  
  // Hide button if:
  // 1. There's an active INDIVIDUAL lesson (max 1 allowed), OR
  // 2. There are 2+ active PAIR lessons (max 2 allowed)
  const canAddLesson = !hasActiveIndividualLesson && activePairLessonsCount < 2
  
  // Determine the limit message
  const limitReachedMessage = hasActiveIndividualLesson
    ? 'Максимальное количество активных индивидуальных занятий (1) достигнуто'
    : activePairLessonsCount >= 2
    ? 'Максимальное количество активных парных занятий (2) достигнуто'
    : null

  // Fetch students, plans, and teachers (admin only)
  const { data: students = [] } = useQuery({
    queryKey: ['students', 'active', effectiveTeacherId],
    queryFn: () => studentsApi.getAll(effectiveTeacherId, 'active'),
    enabled: open && isAdmin && showCreateForm,
  })

  const { data: plans = [] } = useQuery({
    queryKey: ['plans', 'active'],
    queryFn: () => plansApi.getAll('active'),
    enabled: open && isAdmin && showCreateForm,
  })

  // Fetch teachers for both create form and change teacher functionality (admin only)
  const { data: teachers = [] } = useQuery({
    queryKey: ['teachers', 'active'],
    queryFn: () => teachersApi.getAll('active'),
    enabled: open && isAdmin,
  })

  // Reset create form when modal closes
  useEffect(() => {
    if (!open) {
      setShowCreateForm(false)
    }
  }, [open])

  const handleCreateSuccess = () => {
    setShowCreateForm(false)
    refetchLessons()
    // Invalidate schedule page lessons query to refresh the schedule
    queryClient.invalidateQueries({ queryKey: ['lessons'] })
  }

  const handleLessonCancel = () => {
    refetchLessons()
    // Invalidate schedule page lessons query to refresh the schedule
    queryClient.invalidateQueries({ queryKey: ['lessons'] })
  }

  // Format date and time for display
  const dateStr = `${day.toString().padStart(2, '0')}.${month.toString().padStart(2, '0')}.${year}`
  const timeStr = `${hour.toString().padStart(2, '0')}:00`
  const defaultDate = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
  const defaultTime = timeStr

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Занятия на {dateStr} в {timeStr}
          </DialogTitle>
          <DialogDescription>
            {filteredLessons.length === 0
              ? 'На это время нет занятий'
              : `Найдено занятий: ${filteredLessons.length}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {showCreateForm ? (
            <CreateSingleLessonForm
              students={students}
              plans={plans}
              teachers={teachers}
              defaultTeacherId={effectiveTeacherId ? parseInt(effectiveTeacherId, 10) : 0}
              defaultDate={defaultDate}
              defaultTime={defaultTime}
              onSuccess={handleCreateSuccess}
              onCancel={() => setShowCreateForm(false)}
            />
          ) : (
            <>
              {filteredLessons.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">На это время нет занятий</p>
                  {isAdmin && canAddLesson && (
                    <Button onClick={() => setShowCreateForm(true)}>
                      Добавить занятие
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredLessons.map((lesson: Lesson) => (
                    <LessonCard
                      key={lesson.id}
                      lesson={lesson}
                      teachers={teachers}
                      onCancel={handleLessonCancel}
                    />
                  ))}
                  {isAdmin && canAddLesson && (
                    <div className="pt-4">
                      <Button onClick={() => setShowCreateForm(true)} className="w-full">
                        Добавить занятие
                      </Button>
                    </div>
                  )}
                  {isAdmin && !canAddLesson && limitReachedMessage && (
                    <div className="pt-4 text-center">
                      <p className="text-sm text-muted-foreground">{limitReachedMessage}</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

