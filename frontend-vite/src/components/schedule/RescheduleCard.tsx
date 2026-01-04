import { useQuery } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { lessonsApi } from '@/api/lessons'
import { useAuth } from '@/contexts/AuthContext'

interface RescheduleCardProps {
  teacherId?: string
  onClick: () => void
}

export const RescheduleCard = ({ teacherId, onClick }: RescheduleCardProps) => {
  const { isAdmin, user } = useAuth()
  
  // Determine which teacher ID to use
  const effectiveTeacherId = isAdmin && teacherId ? teacherId : user?.id.toString()

  // Fetch lessons for rescheduling
  const { data: lessons = [] } = useQuery({
    queryKey: ['lessons', 'rescheduled', effectiveTeacherId],
    queryFn: () => lessonsApi.getLessonsForReschedule(effectiveTeacherId),
    enabled: !!effectiveTeacherId,
  })

  const count = lessons.length

  return (
    <Card
      className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105 border-2 hover:border-blue-400"
      onClick={onClick}
      tabIndex={0}
      role="button"
      aria-label={`Доступные занятия для переноса: ${count}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
    >
      <CardContent className="p-3">
        <div className="text-center">
          <p className="text-sm font-medium text-muted-foreground mb-1">
            Доступные занятия для переноса:
          </p>
          <p className={`text-2xl font-bold ${count > 0 ? 'text-red-600' : 'text-blue-600'}`}>
            {count}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

