import { Card, CardContent } from '@/components/ui/card'
import type { TeacherTasksSummary } from '@/types'

interface TaskTeacherSelectionGridProps {
  teachers: TeacherTasksSummary[]
  currentUserId?: string
  onSelect: (teacherId: number) => void
}

export const TaskTeacherSelectionGrid = ({
  teachers,
  currentUserId,
  onSelect,
}: TaskTeacherSelectionGridProps) => {
  const handleSelect = (teacherId: number) => {
    onSelect(teacherId)
  }

  const handleKeyDown = (teacherId: number) => (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleSelect(teacherId)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-8">
      <h1 className="text-2xl sm:text-3xl font-bold">Задачи</h1>
      <p className="text-muted-foreground">Выберите преподавателя</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-5xl px-4">
        {teachers.map((teacher) => {
          const isCurrentUser = currentUserId && teacher.id === +currentUserId

          return (
            <Card
              key={teacher.id}
              className="flex h-full cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105 border-2 hover:border-primary"
              onClick={() => handleSelect(teacher.id)}
              tabIndex={0}
              role="button"
              aria-label={`Преподаватель ${teacher.name}${isCurrentUser ? ' (вы)' : ''}`}
              onKeyDown={handleKeyDown(teacher.id)}
            >
              <CardContent className="flex h-full w-full flex-col items-center p-6 text-center">
                <div className="flex w-full flex-1 flex-col items-center justify-center">
                  <p className="text-lg font-semibold">{teacher.name}</p>
                  <p
                    className={`mt-1 text-sm text-muted-foreground ${isCurrentUser ? '' : 'invisible'}`}
                    aria-hidden={!isCurrentUser}
                  >
                    Вы
                  </p>
                </div>
                <div className="mt-auto flex w-full flex-wrap items-center justify-center gap-x-4 gap-y-1 border-t pt-4 text-sm text-muted-foreground">
                  <span>
                    В работе:{' '}
                    <span className="font-medium text-foreground">
                      {teacher.tasks_count.IN_PROGRESS}
                    </span>
                  </span>
                  {isCurrentUser ? (
                    <span className="invisible" aria-hidden="true">
                      На проверку: 0
                    </span>
                  ) : (
                    <span>
                      На проверку:{' '}
                      <span className="font-medium text-foreground">
                        {teacher.tasks_count.ON_APPROVAL}
                      </span>
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
