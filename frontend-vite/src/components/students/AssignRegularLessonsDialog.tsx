import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { RegularLessonCard } from './RegularLessonCard'
import { teachersApi } from '@/api/teachers'
import { plansApi } from '@/api/plans'
import { lessonsApi } from '@/api/lessons'
import type { RegularLessonInput, WeekDay } from '@/types'

interface AssignRegularLessonsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  studentId: number | null
}

// Convert time string "HH:MM" to UTC+3 ISO string format
const convertTimeToUTC3 = (timeString: string): string => {
  const [hours, minutes] = timeString.split(':')
  // Create date in UTC+3 timezone (Europe/Minsk or similar)
  // Using a fixed date (2000-01-01) for time-only values
  const date = new Date(`2000-01-01T${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}:00+03:00`)
  return date.toISOString()
}

const createEmptyLesson = (): RegularLessonInput => {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  const todayUTC3 = new Date(`${year}-${month}-${day}T06:00:00+03:00`).toISOString()
  
  return {
    teacher_id: 0,
    plan_id: 0,
    start_time: '09:00',
    week_day: 'MONDAY' as WeekDay,
    start_period_date: todayUTC3,
    end_period_date: todayUTC3,
  }
}

export const AssignRegularLessonsDialog = ({
  open,
  onOpenChange,
  studentId,
}: AssignRegularLessonsDialogProps) => {
  const [lessons, setLessons] = useState<RegularLessonInput[]>([createEmptyLesson()])
  const queryClient = useQueryClient()

  const { data: teachers = [] } = useQuery({
    queryKey: ['teachers', 'active'],
    queryFn: () => teachersApi.getAll('active'),
    enabled: open,
  })

  const { data: plans = [] } = useQuery({
    queryKey: ['plans', 'active'],
    queryFn: () => plansApi.getAll('active'),
    enabled: open,
  })

  const activeTeachers = teachers.filter((teacher) => !teacher.deleted_at)
  const activePlans = plans.filter((plan) => !plan.deleted_at)

  const createMutation = useMutation({
    mutationFn: (data: { lessons: RegularLessonInput[] }) =>
      lessonsApi.createRegularLessons(studentId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] })
      onOpenChange(false)
      setLessons([createEmptyLesson()])
    },
  })

  useEffect(() => {
    if (open) {
      setLessons([createEmptyLesson()])
    }
  }, [open])

  const handleAddLesson = () => {
    setLessons([...lessons, createEmptyLesson()])
  }

  const handleUpdateLesson = (index: number, updatedLesson: RegularLessonInput) => {
    const newLessons = [...lessons]
    newLessons[index] = updatedLesson
    setLessons(newLessons)
  }

  const handleRemoveLesson = (index: number) => {
    if (lessons.length > 1) {
      setLessons(lessons.filter((_, i) => i !== index))
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!studentId) return

    // Convert all times and dates to UTC+3 format before sending to backend
    const formattedLessons = lessons.map((lesson) => {
				console.log("lesson", lesson);
      return {
        ...lesson,
        start_time: convertTimeToUTC3(lesson.start_time),
        start_period_date: lesson.start_period_date,
        end_period_date: lesson.end_period_date,
      }
    })

    createMutation.mutate({ lessons: formattedLessons })
  }

  const isValid = lessons.every(
    (lesson) =>
      lesson.teacher_id > 0 &&
      lesson.plan_id > 0 &&
      lesson.start_time &&
      lesson.week_day &&
      lesson.start_period_date &&
      lesson.end_period_date
  )

  if (!studentId) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Назначить регулярные занятия</DialogTitle>
          <DialogDescription>
            Создать регулярные занятия для этого ученика. Вы можете добавить несколько занятий.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="flex justify-end">
              <Button type="button" onClick={handleAddLesson} variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Добавить регулярное занятие
              </Button>
            </div>
            {lessons.map((lesson, index) => (
              <RegularLessonCard
                key={index}
                lesson={lesson}
                teachers={activeTeachers}
                plans={activePlans}
                onUpdate={(updatedLesson) => handleUpdateLesson(index, updatedLesson)}
                onRemove={() => handleRemoveLesson(index)}
              />
            ))}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={!isValid || createMutation.isPending}>
              {createMutation.isPending ? 'Создание...' : 'Создать занятия'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

