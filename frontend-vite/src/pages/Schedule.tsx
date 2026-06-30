import { useState, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { teachersApi } from '@/api/teachers'
import { lessonsApi } from '@/api/lessons'
import { useAuth } from '@/contexts/AuthContext'
import { getDaysInWeeks } from '@/utils/getDaysInWeeks'
import { ScheduleCellModal } from '@/components/schedule/ScheduleCellModal'
import { RescheduleCard } from '@/components/schedule/RescheduleCard'
import { RescheduleLessonsModal } from '@/components/schedule/RescheduleLessonsModal'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Teacher, Lesson } from '@/types'

export const Schedule = () => {
  const { isAdmin, user } = useAuth()
  const currentDate = new Date()
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear().toString())
  const [selectedMonth, setSelectedMonth] = useState((currentDate.getMonth() + 1).toString())
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('')
  const [selectedCell, setSelectedCell] = useState<{
    year: number
    month: number
    day: number
    hour: number
  } | null>(null)
	const [showRescheduleModal, setShowRescheduleModal] = useState(false)

  const { data: teachers = [] } = useQuery({
    queryKey: ['teachers', 'active'],
    queryFn: () => teachersApi.getAll('active'),
    enabled: isAdmin,
  })

  const activeTeachers = teachers.filter((teacher: Teacher) => !teacher.deleted_at)

  // Set default teacher to current admin on mount
  useEffect(() => {
    if (isAdmin && user && !selectedTeacherId) {
			// eslint-disable-next-line react-hooks/set-state-in-effect
			setSelectedTeacherId(user.id.toString())
    }
  }, [isAdmin, user, selectedTeacherId])

  // Generate year options (current year ± 2 years)
  const currentYear = currentDate.getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => (currentYear - 2 + i).toString())

  const months = [
    { value: '1', label: 'Январь' },
    { value: '2', label: 'Февраль' },
    { value: '3', label: 'Март' },
    { value: '4', label: 'Апрель' },
    { value: '5', label: 'Май' },
    { value: '6', label: 'Июнь' },
    { value: '7', label: 'Июль' },
    { value: '8', label: 'Август' },
    { value: '9', label: 'Сентябрь' },
    { value: '10', label: 'Октябрь' },
    { value: '11', label: 'Ноябрь' },
    { value: '12', label: 'Декабрь' },
  ]


  // Fetch lessons when filters change
  const { data: lessons } = useQuery({
    queryKey: ['lessons', selectedYear, selectedMonth, selectedTeacherId],
    queryFn: () => {
      const { start, end } = getMonthDates(
        parseInt(selectedYear, 10),
        parseInt(selectedMonth, 10)
      )
      return lessonsApi.getLessonsForPeriod(
        start,
        end,
        selectedTeacherId || undefined
      )
    },
    enabled: !!selectedYear && !!selectedMonth && (isAdmin ? !!selectedTeacherId : true),
  })


  // Generate hours from 8:00 to 21:00
  const hours = useMemo(() => {
    const hoursList: string[] = []
    for (let i = 8; i <= 21; i++) {
      hoursList.push(`${i.toString().padStart(2, '0')}:00`)
    }
    return hoursList
  }, [])

  // Weekday names
  const weekDays = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье']

  // Get weeks for the selected month
  const weeks = useMemo(() => {
    if (!selectedYear || !selectedMonth) return []
    return getDaysInWeeks(parseInt(selectedYear, 10), parseInt(selectedMonth, 10))
  }, [selectedYear, selectedMonth])

  // Check if current day is today
  const isToday = (day: number | null): boolean => {
    if (day === null) return false
    const today = new Date()
    return (
      today.getDate() === day &&
      today.getMonth() + 1 === parseInt(selectedMonth, 10) &&
      today.getFullYear() === parseInt(selectedYear, 10)
    )
  }

  // Convert UTC+0 date to UTC+3 and get day/hour/minutes
  const getUTC3DateParts = (utcDate: string) => {
    const date = new Date(utcDate)
    // Get UTC components
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
      // Note: We don't handle month/year overflow here as it's unlikely for schedule display
      // and the backend should handle date ranges correctly
    }
    
    return { year: utcYear, month: utcMonth, day, hours, minutes: utcMinutes }
  }

  // Map lessons to cells: { day-hour: lesson[] }
  const lessonsMap = useMemo(() => {
    if (!lessons || lessons.length === 0) return new Map<string, Lesson[]>()
    
    const map = new Map<string, Lesson[]>()
    
    lessons.forEach((lesson) => {
      const { day, hours } = getUTC3DateParts(lesson.date)
      
      // Round down to nearest hour (e.g., 9:10 -> 9:00)
      const hourKey = `${day}-${hours}`
      
      if (!map.has(hourKey)) {
        map.set(hourKey, [])
      }
      map.get(hourKey)!.push(lesson)
    })
    
    return map
  }, [lessons])

  // Get lessons for a specific day and hour
  const getLessonsForCell = (day: number | null, hour: string): Lesson[] => {
    if (day === null) return []
    const hourNum = parseInt(hour.split(':')[0], 10)
    const key = `${day}-${hourNum}`
    return lessonsMap.get(key) || []
  }

  const formatLessonTime = (lesson: Lesson): string => {
    const { hours, minutes } = getUTC3DateParts(lesson.date)
    const hoursStr = hours.toString().padStart(2, '0')
    const minutesStr = minutes.toString().padStart(2, '0')
    return `${hoursStr}:${minutesStr}`
  }

  const getLessonTypeLabel = (lesson: Lesson): string => {
    if (lesson.is_trial) return 'пробное'
    if (lesson.is_free) return 'бесплатное'

    switch (lesson.status) {
      case 'PENDING_PAID':
      case 'COMPLETED_PAID':
        return 'оплачено'
      case 'PENDING_UNPAID':
      case 'COMPLETED_UNPAID':
        return 'не оплачено'
      case 'MISSED':
        return 'прогул'
      case 'RESCHEDULED':
        return 'перенесено'
      case 'CANCELLED':
        return 'отменено'
      default:
        return lesson.is_paid ? 'оплачено' : 'не оплачено'
    }
  }

  const formatLessonPrimaryLine = (lesson: Lesson): string => {
    return `[${formatLessonTime(lesson)}] ${lesson.student.name} ${lesson.student.class}кл`
  }

  const formatLessonSecondaryLine = (lesson: Lesson): string => {
    return `${lesson.plan.duration} мин · ${getLessonTypeLabel(lesson)}`
  }

  // Format lesson display text with full name (for tooltips)
  const formatLessonTextFull = (lesson: Lesson): string => {
    return `${formatLessonPrimaryLine(lesson)} — ${formatLessonSecondaryLine(lesson)}`
  }

  // Get background color for lesson status
  const getLessonStatusColor = (status: string): string => {
    switch (status) {
      case 'PENDING_PAID':
        return '#bff7b7'
      case 'PENDING_UNPAID':
        return '#ffffff'
      case 'COMPLETED_PAID':
        return '#3fc12d'
      case 'COMPLETED_UNPAID':
        return '#6da5f7'
      case 'MISSED':
        return '#eaff2e'
      case 'RESCHEDULED':
        return '#fd9500'
      case 'CANCELLED':
        return '#fd0000'
      default:
        return '#ffffff'
    }
  }

  // Get status label in Russian
  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'PENDING_PAID':
        return 'Ожидает (оплачено)'
      case 'PENDING_UNPAID':
        return 'Ожидает (не оплачено)'
      case 'COMPLETED_PAID':
        return 'Завершено (оплачено)'
      case 'COMPLETED_UNPAID':
        return 'Завершено (не оплачено)'
      case 'MISSED':
        return 'Прогул'
      case 'RESCHEDULED':
        return 'Перенесено'
      case 'CANCELLED':
        return 'Отменено'
      default:
        return status
    }
  }

  // Status legend items (ordered according to LessonStatusEnum)
  const statusLegend = [
    'PENDING_UNPAID',
    'PENDING_PAID',
    'COMPLETED_UNPAID',
    'COMPLETED_PAID',
    'MISSED',
    'RESCHEDULED',
    'CANCELLED',
  ]

  // Calculate start and end dates for download
  const getMonthDates = (year: number, month: number) => {
    // Use UTC methods to avoid timezone conversion issues
    const startDate = new Date(Date.UTC(year, month - 1, 1))
    const endDate = new Date(Date.UTC(year, month, 0))
    
    // Format as YYYY-MM-DD using UTC methods
    const formatDate = (date: Date) => {
      const year = date.getUTCFullYear()
      const month = String(date.getUTCMonth() + 1).padStart(2, '0')
      const day = String(date.getUTCDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }
    
    return {
      start: formatDate(startDate),
      end: formatDate(endDate),
    }
  }

  const handleDownloadSchedule = async () => {
    try {
      const { start, end } = getMonthDates(
        parseInt(selectedYear, 10),
        parseInt(selectedMonth, 10)
      )

      await lessonsApi.downloadSchedule(
        start,
        end,
        isAdmin ? selectedTeacherId : undefined
      )
    } catch (error) {
      console.error('Failed to download schedule:', error)
    }
  }

  return (
    <div className="space-y-4 font-sans">
      <div>
        <div className="mb-4">
          <h1 className="text-2xl sm:text-3xl font-bold">Расписание</h1>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end mb-6">
					<div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end flex-1">
						<div className="grid gap-2">
							<Label htmlFor="year">Год</Label>
							<Select value={selectedYear} onValueChange={setSelectedYear}>
								<SelectTrigger id="year" className="w-[150px]">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{years.map((year) => (
										<SelectItem key={year} value={year}>
											{year}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="month">Месяц</Label>
							<Select value={selectedMonth} onValueChange={setSelectedMonth}>
								<SelectTrigger id="month" className="w-[180px]">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{months.map((month) => (
										<SelectItem key={month.value} value={month.value}>
											{month.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						{isAdmin && (
							<div className="grid gap-2">
								<Label htmlFor="teacher">Преподаватель</Label>
								<Select value={selectedTeacherId} onValueChange={setSelectedTeacherId}>
									<SelectTrigger id="teacher" className="w-[200px]">
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
						<div className="flex items-end">
							<Button onClick={handleDownloadSchedule} className="font-semibold">
								Скачать расписание
							</Button>
						</div>
					</div>
					<div className="w-full sm:w-auto">
						<RescheduleCard
							teacherId={isAdmin ? selectedTeacherId : undefined}
							onClick={() => setShowRescheduleModal(true)}
						/>
					</div>
				</div>
      </div>

      {/* Status Legend */}
      <div className="rounded-2xl border border-border bg-card px-5 py-4 shadow-sm">
        <div className="flex flex-wrap gap-x-5 gap-y-3">
          {statusLegend.map((status) => (
            <div key={status} className="flex items-center gap-2">
              <div
                className="h-5 w-5 rounded-md border border-border"
                style={{
                  backgroundColor: getLessonStatusColor(status),
                }}
              />
              <span className="text-xs font-medium text-muted-foreground">
                {getStatusLabel(status)}
              </span>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <div
              className="h-5 w-5 rounded-md border-2 bg-card"
              style={{ borderColor: '#3fc12d' }}
            />
            <span className="text-xs font-medium text-muted-foreground">Бесплатное занятие</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="h-5 w-5 rounded-md border-2 bg-card"
              style={{ borderColor: '#f9c600' }}
            />
            <span className="text-xs font-medium text-muted-foreground">Пробное занятие</span>
          </div>
        </div>
      </div>

      {/* Schedule Grid */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto w-full">
          {weeks.map((week, weekIndex) => (
            <div
              key={weekIndex}
              className="border-b border-border last:border-b-0"
            >
              {/* Week Header */}
              <div className="grid grid-cols-[72px_repeat(7,minmax(0,1fr))] border-b border-border bg-secondary">
                <div className="flex items-center justify-center border-r border-border px-2 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Время
                </div>
                {week.map((day, dayIndex) => {
                  const isCurrentDay = day !== null && isToday(day)

                  return (
                    <div
                      key={dayIndex}
                      className={cn(
                        'flex min-w-0 flex-col items-center justify-center border-r border-border px-1 py-2 text-center last:border-r-0',
                        day
                          ? isCurrentDay
                            ? 'bg-accent text-accent-foreground'
                            : 'text-secondary-foreground'
                          : 'bg-secondary/60 text-muted-foreground',
                      )}
                    >
                      {day ? (
                        <>
                          <span className="truncate text-[10px] font-bold uppercase leading-tight tracking-wide">
                            {weekDays[dayIndex]}
                          </span>
                          <span className="text-sm font-extrabold leading-tight">{day}</span>
                        </>
                      ) : null}
                    </div>
                  )
                })}
              </div>

              {/* Hour Rows */}
              {hours.map((hour, hourIndex) => (
                <div
                  key={hourIndex}
                  className="grid grid-cols-[72px_repeat(7,minmax(0,1fr))] border-b border-border last:border-b-0"
                >
                  <div className="flex min-h-[36px] items-center justify-center border-r border-border bg-secondary/50 text-xs font-bold text-foreground">
                    {hour}
                  </div>

                  {week.map((day, dayIndex) => {
                    const weekDayName = weekDays[dayIndex]
                    const cellLessons = getLessonsForCell(day, hour)
                    const hasLessons = cellLessons.length > 0
                    const isCurrentDay = day !== null && isToday(day)

                    const tooltipText = day
                      ? `${weekDayName}, ${day} ${months[parseInt(selectedMonth, 10) - 1]?.label} ${selectedYear}, ${hour}`
                      : ''

                    const is13Hour = hour === '13:00'

                    let cellClassName =
                      'border-r border-border last:border-r-0 min-h-[36px] p-0.5 transition-colors duration-150 flex flex-col min-w-0 overflow-hidden'

                    if (isCurrentDay && day) {
                      cellClassName += ' bg-accent/20'
                    }

                    cellClassName += day
                      ? is13Hour
                        ? ' bg-[#88f1ec]/60 cursor-pointer hover:bg-gray-100'
                        : isCurrentDay
                          ? ' cursor-pointer hover:bg-gray-100'
                          : ' bg-card cursor-pointer hover:bg-gray-100'
                      : ' bg-gray-300 cursor-not-allowed'

                    if (!day) {
                      return <div key={dayIndex} className={cellClassName} />
                    }

                    const handleCellClick = () => {
                      const hourNum = parseInt(hour.split(':')[0], 10)
                      setSelectedCell({
                        year: parseInt(selectedYear, 10),
                        month: parseInt(selectedMonth, 10),
                        day,
                        hour: hourNum,
                      })
                    }

                    const currentTeacherId =
                      isAdmin && selectedTeacherId
                        ? parseInt(selectedTeacherId, 10)
                        : user?.id

                    return (
                      <Tooltip key={dayIndex}>
                        <TooltipTrigger asChild>
                          <div className={cellClassName} onClick={handleCellClick}>
                            {hasLessons && (
                              <div
                                className={`flex min-w-0 flex-col gap-0.5 ${cellLessons.length === 1 ? 'h-full' : ''}`}
                              >
                                {cellLessons.map((lesson) => {
                                  const isDifferentTeacher =
                                    currentTeacherId !== undefined &&
                                    lesson.teacher.id !== currentTeacherId

                                  return (
                                    <div
                                      key={lesson.id}
                                      className={`mx-0.5 flex min-w-0 flex-col justify-center rounded-sm px-1 py-0.5 text-xs leading-tight text-[#000000] ${
                                        cellLessons.length === 1 ? 'h-full' : ''
                                      }`}
                                      style={{
                                        backgroundColor: getLessonStatusColor(lesson.status),
                                        border:
                                          lesson.is_trial || lesson.is_free
                                            ? `2px solid ${lesson.is_trial ? '#f9c600' : '#3fc12d'}`
                                            : 'none',
                                        opacity: isDifferentTeacher ? 0.5 : 1,
                                      }}
                                    >
                                      <div className="truncate font-semibold">
                                        {formatLessonPrimaryLine(lesson)}
                                      </div>
                                      <div className="truncate text-[10px] leading-tight opacity-80">
                                        {formatLessonSecondaryLine(lesson)}
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">{tooltipText}</p>
                          {hasLessons && (
                            <div className="mt-1 space-y-1">
                              {cellLessons.map((lesson) => (
                                <p key={lesson.id} className="text-xs">
                                  {formatLessonTextFull(lesson)}
                                </p>
                              ))}
                            </div>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    )
                  })}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Schedule Cell Modal */}
      {selectedCell && (
        <ScheduleCellModal
          open={!!selectedCell}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedCell(null)
            }
          }}
          year={selectedCell.year}
          month={selectedCell.month}
          day={selectedCell.day}
          hour={selectedCell.hour}
          teacherId={isAdmin ? selectedTeacherId : undefined}
        />
      )}

			{/* Reschedule Lessons Modal */}
			<RescheduleLessonsModal
				open={showRescheduleModal}
				onOpenChange={setShowRescheduleModal}
				teacherId={isAdmin ? selectedTeacherId : undefined}
			/>
    </div>
  )
}

