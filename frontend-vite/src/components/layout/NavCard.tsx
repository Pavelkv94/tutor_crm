import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { tasksApi } from '@/api/tasks'
import { useAuth } from '@/contexts/AuthContext'
import { TasksNavBadge } from '@/components/tasks/TasksNavBadge'
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
    <div
      className="group flex cursor-pointer items-center gap-4 rounded-2xl border bg-card px-6 py-5 shadow-sm transition-all duration-150 hover:shadow-xl hover:-translate-y-0.5"
      style={{ borderColor: 'hsl(254 75% 92%)' }}
      onClick={handleClick}
      tabIndex={0}
      role="button"
      aria-label={item.label}
      onKeyDown={handleKeyDown}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = '#4b2eaa'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'hsl(254 75% 92%)'
      }}
    >
      {/* Icon chip */}
      <div
        className="relative flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl transition-colors duration-150"
        style={{ background: '#f9da00', color: '#2a1568' }}
        aria-hidden="true"
      >
        <Icon className="h-7 w-7" />
        {isTasksItem && <TasksNavBadge count={pendingCount} />}
      </div>

      {/* Label */}
      <div>
        <p className="text-lg font-extrabold text-foreground">{item.label}</p>
      </div>
    </div>
  )
}
