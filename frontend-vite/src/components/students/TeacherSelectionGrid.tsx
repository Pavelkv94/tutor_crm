import { Card, CardContent } from '@/components/ui/card'
import type { Teacher } from '@/types'

interface TeacherSelectionGridProps {
  teachers: Teacher[]
  currentUserId?: string
  onSelect: (teacherId: number) => void
}

export const TeacherSelectionGrid = ({
  teachers,
  currentUserId,
  onSelect,
}: TeacherSelectionGridProps) => {
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
      <h1 className="text-2xl sm:text-3xl font-bold">Ученики</h1>
      <p className="text-muted-foreground">Выберите преподавателя</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 w-full px-4">
        {teachers.map((teacher) => {
          const isCurrentUser = currentUserId && teacher.id === +currentUserId

          return (
            <Card
              key={teacher.id}
              className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105 border-2 hover:border-primary"
              onClick={() => handleSelect(teacher.id)}
              tabIndex={0}
              role="button"
              aria-label={`Преподаватель ${teacher.name}${isCurrentUser ? ' (вы)' : ''}`}
              onKeyDown={handleKeyDown(teacher.id)}
            >
              <CardContent className="p-6">
                <div className="text-center">
                  <p className="text-lg font-semibold">{teacher.name}</p>
                  {isCurrentUser && (
                    <p className="text-sm text-muted-foreground mt-1">Вы</p>
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
