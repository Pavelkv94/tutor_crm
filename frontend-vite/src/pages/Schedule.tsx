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


  // Generate hours from 8:00 to 22:00
  const hours = useMemo(() => {
    const hoursList: string[] = []
    for (let i = 8; i <= 22; i++) {
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

  // Get first name (text before first space)
  const getFirstName = (fullName: string): string => {
    const spaceIndex = fullName.indexOf(' ')
    return spaceIndex !== -1 ? fullName.substring(0, spaceIndex) : fullName
  }

  // Format lesson display text (for cells - shows first name only)
  const formatLessonText = (lesson: Lesson): string => {
    const { hours, minutes } = getUTC3DateParts(lesson.date)
    const hoursStr = hours.toString().padStart(2, '0')
    const minutesStr = minutes.toString().padStart(2, '0')
    const firstName = getFirstName(lesson.student.name)
		return `[${hoursStr}:${minutesStr}] ${firstName} ${lesson.student.class}кл ${lesson.plan.duration}м`
  }

  // Format lesson display text with full name (for tooltips)
  const formatLessonTextFull = (lesson: Lesson): string => {
    const { hours, minutes } = getUTC3DateParts(lesson.date)
    const hoursStr = hours.toString().padStart(2, '0')
    const minutesStr = minutes.toString().padStart(2, '0')
		return `[${hoursStr}:${minutesStr}] ${lesson.student.name} ${lesson.student.class}кл - ${lesson.plan.duration} минут`
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
							<Button 
								onClick={handleDownloadSchedule} 
								className="bg-green-600 hover:bg-green-700 text-white"
							>
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
      <div className="bg-gray-50 border border-gray-300 rounded-lg p-4">
        <div className="flex flex-wrap gap-4">
          {statusLegend.map((status) => (
            <div key={status} className="flex items-center gap-2">
              <div
                className="w-6 h-6 border border-gray-400 rounded"
                style={{
                  backgroundColor: getLessonStatusColor(status),
                }}
              />
              <span className="text-xs text-gray-700">{getStatusLabel(status)}</span>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 border-2 rounded"
              style={{
                borderColor: '#1e40af',
                backgroundColor: 'transparent',
              }}
            />
            <span className="text-xs text-gray-700">Бесплатное занятие</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 border-2 rounded"
              style={{
                borderColor: '#f9c600',
                backgroundColor: 'transparent',
              }}
            />
            <span className="text-xs text-gray-700">Пробное занятие</span>
          </div>
        </div>
      </div>

      {/* Schedule Grid */}
      <div className="overflow-x-auto w-full">
        {/* Weekdays Header */}
        <div className="grid grid-cols-[80px_repeat(7,minmax(0,1fr))] border-b-2 border-gray-800">
          <div className="bg-gray-100 border-r-2 border-gray-800 h-[24px] text-center font-bold text-xs flex items-center justify-center">
            Время
          </div>
          {weekDays.map((day, index) => {
            // Check if any day in any week at this column index is today
            const isCurrentDayColumn = weeks.some(week => {
              const dayNumber = week[index]
              return dayNumber !== null && dayNumber !== undefined && isToday(dayNumber)
            })
            
            return (
              <div
                key={index}
                className={`bg-yellow-100 border-r border-gray-500 last:border-r-0 h-[24px] text-center font-semibold text-xs flex items-center justify-center min-w-0 overflow-hidden ${
                  isCurrentDayColumn ? 'border-l-4 border-l-purple-500 border-r-4 border-r-purple-500' : ''
                }`}
              >
                <span className="truncate">{day}</span>
              </div>
            )
          })}
        </div>

        {/* Weeks */}
        {weeks.map((week, weekIndex) => (
          <div
            key={weekIndex}
            className="mb-4 border-2 border-gray-400 rounded-lg overflow-hidden"
          >
            {/* Week Header with Day Numbers */}
            <div className="grid grid-cols-[80px_repeat(7,minmax(0,1fr))] bg-gray-50 border-b border-gray-500">
              <div className="bg-gray-200 border-r-2 border-gray-800 h-[24px]"></div>
              {week.map((day, dayIndex) => {
                const isCurrentDay = day !== null && isToday(day)
                return (
                  <div
                    key={dayIndex}
                    className={`border-r border-gray-500 last:border-r-0 h-[24px] text-center font-bold text-xs flex items-center justify-center min-w-0 ${
                      day
                        ? isCurrentDay
                          ? 'bg-purple-400 text-white border-l-4 border-l-purple-500 border-r-4 border-r-purple-500'
                          : 'bg-white text-black'
                        : 'bg-gray-300 text-gray-500'
                    }`}
                  >
                    {day || ''}
                  </div>
                )
              })}
            </div>

            {/* Hour Rows */}
            {hours.map((hour, hourIndex) => (
              <div
                key={hourIndex}
                className="grid grid-cols-[80px_repeat(7,minmax(0,1fr))] border-b border-gray-400 last:border-b-0"
              >
                {/* Time Column */}
                <div className="bg-gray-100 border-r-2 border-gray-800 min-h-[32px] text-center font-bold text-xs flex items-center justify-center">
                  {hour}
                </div>

                {/* Day Columns */}
                {week.map((day, dayIndex) => {
                  const weekDayName = weekDays[dayIndex]
                  const cellLessons = getLessonsForCell(day, hour)
                  const hasLessons = cellLessons.length > 0
                  const isCurrentDay = day !== null && isToday(day)
                  const hasTrialLesson = cellLessons.some((lesson) => lesson.is_trial)
                  const hasFreeLesson = cellLessons.some((lesson) => lesson.is_free)
                  
                  // Determine current teacher ID
                  const currentTeacherId = isAdmin && selectedTeacherId 
                    ? parseInt(selectedTeacherId, 10) 
                    : user?.id ? parseInt(user.id, 10) : null
                  
                  const tooltipText = day
                    ? `${weekDayName}, ${day} ${months[parseInt(selectedMonth, 10) - 1]?.label} ${selectedYear}, ${hour}`
                    : ''
                  
                  const is13Hour = hour === '13:00'
                  
                  // Build cell className with proper border handling
                  let cellClassName = 'border-r border-gray-400 last:border-r-0 min-h-[32px] transition-colors duration-200 flex flex-col min-w-0 overflow-hidden'
                  
                  // Apply trial lesson border (2px #f9c600) - takes precedence over free lesson and current day border
                  if (hasTrialLesson) {
                    cellClassName += ' border-2'
                  } else if (hasFreeLesson) {
                    // Apply free lesson border (2px dark blue)
                    cellClassName += ' border-2'
                  } else if (isCurrentDay) {
                    cellClassName += ' border-l-4 border-l-purple-500 border-r-4 border-r-purple-500'
                  }
                  
                  // Add background and cursor styles
                  cellClassName += day
                    ? is13Hour
                      ? ' bg-[#88f1ec] hover:bg-[#7ae0d9] cursor-pointer'
                      : hasLessons
                      ? ' cursor-pointer'
                      : ' bg-white hover:bg-blue-50 cursor-pointer'
                    : ' bg-gray-300 cursor-not-allowed'

                  if (!day) {
                    return (
                      <div
                        key={dayIndex}
                        className={cellClassName}
                      />
                    )
                  }

                  const handleCellClick = () => {
                    if (day) {
                      const hourNum = parseInt(hour.split(':')[0], 10)
                      setSelectedCell({
                        year: parseInt(selectedYear, 10),
                        month: parseInt(selectedMonth, 10),
                        day,
                        hour: hourNum,
                      })
                    }
                  }

                  return (
                    <Tooltip key={dayIndex}>
                      <TooltipTrigger asChild>
                        <div 
                          className={cellClassName} 
                          onClick={handleCellClick}
                          style={
                            hasTrialLesson 
                              ? { borderColor: '#f9c600' } 
                              : hasFreeLesson 
                              ? { borderColor: '#1e40af' } 
                              : undefined
                          }
                        >
                          {hasLessons && (
                            <div className={`flex flex-col min-w-0 ${cellLessons.length === 1 ? 'h-full' : ''}`}>
                              {cellLessons.map((lesson) => {
                                // Check if teacher was replaced (teacher_id different from current teacher)
                                const isTeacherReplaced = currentTeacherId !== null && lesson.teacher.id !== currentTeacherId
                                
                                return (
                                  <div
                                    key={lesson.id}
                                    className={`px-1 py-0.5 text-xs leading-tight text-[#000000] truncate min-w-0 ${
                                      cellLessons.length === 1 ? 'h-full flex items-center' : ''
                                    }`}
                                    style={{
                                      backgroundColor: getLessonStatusColor(lesson.status),
                                      opacity: isTeacherReplaced ? 0.5 : 1,
                                    }}
                                  >
                                    {formatLessonText(lesson)}
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

