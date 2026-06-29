import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { TasksNavBadge } from '@/components/tasks/TasksNavBadge'
import { tasksApi } from '@/api/tasks'
import { useAuth } from '@/contexts/AuthContext'
import type { NavItem } from '@/constants/navigation'

interface NavCardProps {
  item: NavItem
}

export const NavCard = ({ item }: NavCardProps) => {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const Icon = item.icon
  const isTasksItem = item.path === '/tasks'

  const { data: pendingCountData } = useQuery({
    queryKey: ['tasks', 'pending-count'],
    queryFn: () => tasksApi.getPendingCount(),
    enabled: isAuthenticated && isTasksItem,
  })

  const pendingCount = pendingCountData?.count ?? 0

  const handleClick = () => {
    navigate(item.path)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleClick()
    }
  }

  return (
    <Card
      className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105 border-2 hover:border-primary"
      onClick={handleClick}
      tabIndex={0}
      role="button"
      aria-label={item.label}
      onKeyDown={handleKeyDown}
    >
      <CardContent className="p-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="relative">
            <Icon className="h-10 w-10 text-primary" aria-hidden="true" />
            {isTasksItem && <TasksNavBadge count={pendingCount} />}
          </div>
          <p className="text-lg font-semibold">{item.label}</p>
        </div>
      </CardContent>
    </Card>
  )
}
