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
import { RescheduleLessonForm } from '@/components/lessons/RescheduleLessonForm'
import { Button } from '@/components/ui/button'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { lessonsApi } from '@/api/lessons'
import { studentsApi } from '@/api/students'
import { plansApi } from '@/api/plans'
import { teachersApi } from '@/api/teachers'
import { useAuth } from '@/contexts/AuthContext'
import type { Lesson } from '@/types'

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
	const [showRescheduleForm, setShowRescheduleForm] = useState(false)
	const [showRescheduleSelect, setShowRescheduleSelect] = useState(false)
	const [selectedRescheduleLesson, setSelectedRescheduleLesson] = useState<Lesson | null>(null)
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

	// Fetch lessons for rescheduling
	const { data: lessonsForReschedule = [] } = useQuery({
		queryKey: ['lessons', 'rescheduled', effectiveTeacherId],
		queryFn: () => lessonsApi.getLessonsForReschedule(effectiveTeacherId),
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

	// Check if cell is "free" for rescheduling
	// A cell is free if:
	// 1. No lessons, OR
	// 2. All lessons have inactive statuses, OR
	// 3. Cell has exactly one lesson with rescheduled_lesson_id set (can create rescheduled lesson with same plan.id)
	const isFreeCell =
		filteredLessons.length === 0 ||
		filteredLessons.every((lesson: Lesson) => inactiveStatuses.includes(lesson.status)) ||
		(filteredLessons.length === 1 && filteredLessons[0].rescheduled_lesson_id !== null)

	// Check if cell contains trial lesson
	const hasTrialLesson = filteredLessons.some((lesson: Lesson) => lesson.is_trial)

	// Check if we can show reschedule button
	// Hide if cell contains trial lesson
	const canShowRescheduleButton = isFreeCell && lessonsForReschedule.length > 0 && (isAdmin || user) && !hasTrialLesson

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
	const canAddLesson = true//!hasActiveIndividualLesson && activePairLessonsCount < 2
  
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

	// Reset forms when modal closes
  useEffect(() => {
    if (!open) {
			// Reset all form states when modal closes
			// Using setTimeout to avoid synchronous setState calls
			setTimeout(() => {
				setShowCreateForm(false)
				setShowRescheduleForm(false)
				setShowRescheduleSelect(false)
				setSelectedRescheduleLesson(null)
			}, 0)
    }
  }, [open])

  const handleCreateSuccess = () => {
    setShowCreateForm(false)
    refetchLessons()
    // Invalidate schedule page lessons query to refresh the schedule
    queryClient.invalidateQueries({ queryKey: ['lessons'] })
  }

	const handleRescheduleSuccess = () => {
		setShowRescheduleForm(false)
		setSelectedRescheduleLesson(null)
		refetchLessons()
		// Invalidate schedule page lessons query to refresh the schedule
		queryClient.invalidateQueries({ queryKey: ['lessons'] })
		// Also invalidate reschedule lessons query
		queryClient.invalidateQueries({ queryKey: ['lessons', 'rescheduled'] })
	}

	const handleRescheduleLessonSelect = (lessonId: string) => {
		const lesson = lessonsForReschedule.find((l: Lesson) => l.id.toString() === lessonId)
		if (lesson) {
			setSelectedRescheduleLesson(lesson)
			setShowRescheduleSelect(false)
			setShowRescheduleForm(true)
		}
	}

	const handleRescheduleButtonClick = () => {
		if (lessonsForReschedule.length === 1) {
			// If only one lesson, directly select it
			setSelectedRescheduleLesson(lessonsForReschedule[0])
			setShowRescheduleForm(true)
		} else {
			// Show select dropdown
			setShowRescheduleSelect(true)
		}
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
							disableDate={true}
              onSuccess={handleCreateSuccess}
              onCancel={() => setShowCreateForm(false)}
            />
					) : showRescheduleForm && selectedRescheduleLesson ? (
						<RescheduleLessonForm
							lesson={selectedRescheduleLesson}
							teachers={teachers}
							defaultDate={defaultDate}
							defaultTime={defaultTime}
							defaultTeacherId={effectiveTeacherId ? parseInt(effectiveTeacherId, 10) : 0}
							onSuccess={handleRescheduleSuccess}
							onCancel={() => {
								setShowRescheduleForm(false)
								setShowRescheduleSelect(false)
								setSelectedRescheduleLesson(null)
							}}
						/>
          ) : (
            <>
              {filteredLessons.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">На это время нет занятий</p>
											<div className="flex flex-col sm:flex-row gap-2 justify-center">
												{isAdmin && canAddLesson && (
													<Button onClick={() => setShowCreateForm(true)}>
														Добавить занятие
													</Button>
												)}
												{canShowRescheduleButton && canAddLesson && !showRescheduleSelect && (
													<Button
														onClick={handleRescheduleButtonClick}
														className="bg-orange-500 hover:bg-orange-600 text-white"
													>
														Отработать занятие
													</Button>
												)}
												{canShowRescheduleButton && canAddLesson && showRescheduleSelect && (
													<Select onValueChange={handleRescheduleLessonSelect}>
														<SelectTrigger className="w-full sm:w-[300px]">
															<SelectValue placeholder="Выберите занятие для отработки" />
														</SelectTrigger>
														<SelectContent>
															{lessonsForReschedule.map((lesson: Lesson) => {
																const { hours: lessonHours, minutes: lessonMinutes } = getUTC3TimeString(lesson.date)
																const date = new Date(lesson.date)
																const utcYear = date.getUTCFullYear()
																const utcMonth = date.getUTCMonth()
																const utcDay = date.getUTCDate()
																let utcHours = date.getUTCHours() + 3
																if (utcHours >= 24) {
																	utcHours -= 24
																}
																const dateStr = `${utcDay.toString().padStart(2, '0')}.${(utcMonth + 1).toString().padStart(2, '0')}.${utcYear}`
																const timeStr = `${lessonHours.toString().padStart(2, '0')}:${lessonMinutes.toString().padStart(2, '0')}`
																return (
																	<SelectItem key={lesson.id} value={lesson.id.toString()}>
																		{lesson.student.name} - {dateStr} {timeStr}
																	</SelectItem>
																)
															})}
														</SelectContent>
													</Select>
												)}
											</div>
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
												<div className="pt-4 space-y-2">
													{isAdmin && canAddLesson && (
                      <Button onClick={() => setShowCreateForm(true)} className="w-full">
                        Добавить занятие
                      </Button>
													)}
													{canShowRescheduleButton && canAddLesson && !showRescheduleSelect && (
														<Button
															onClick={handleRescheduleButtonClick}
															className="w-full bg-orange-500 hover:bg-orange-600 text-white"
														>
															Отработать занятие
														</Button>
													)}
													{canShowRescheduleButton && canAddLesson && showRescheduleSelect && (
														<Select onValueChange={handleRescheduleLessonSelect}>
															<SelectTrigger className="w-full">
																<SelectValue placeholder="Выберите занятие для отработки" />
															</SelectTrigger>
															<SelectContent>
																{lessonsForReschedule.map((lesson: Lesson) => {
																	const { hours: lessonHours, minutes: lessonMinutes } = getUTC3TimeString(lesson.date)
																	const date = new Date(lesson.date)
																	const utcYear = date.getUTCFullYear()
																	const utcMonth = date.getUTCMonth()
																	const utcDay = date.getUTCDate()
																	let utcHours = date.getUTCHours() + 3
																	if (utcHours >= 24) {
																		utcHours -= 24
																	}
																	const dateStr = `${utcDay.toString().padStart(2, '0')}.${(utcMonth + 1).toString().padStart(2, '0')}.${utcYear}`
																	const timeStr = `${lessonHours.toString().padStart(2, '0')}:${lessonMinutes.toString().padStart(2, '0')}`
																	return (
																		<SelectItem key={lesson.id} value={lesson.id.toString()}>
																			{lesson.student.name} - {dateStr} {timeStr}
																		</SelectItem>
																	)
																})}
															</SelectContent>
														</Select>
													)}
													{isAdmin && !canAddLesson && limitReachedMessage && (
														<div className="text-center">
															<p className="text-sm text-muted-foreground">{limitReachedMessage}</p>
														</div>
													)}
												</div>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

