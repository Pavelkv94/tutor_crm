import { Link, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { LogOut } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { getVisibleNavItems } from '@/constants/navigation'
import { tasksApi } from '@/api/tasks'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { TasksNavBadge } from '@/components/tasks/TasksNavBadge'

export const Sidebar = () => {
  const location = useLocation()
  const { isAdmin, logout, isAuthenticated } = useAuth()

  const filteredItems = getVisibleNavItems(isAdmin)

  const { data: pendingCountData } = useQuery({
    queryKey: ['tasks', 'pending-count'],
    queryFn: () => tasksApi.getPendingCount(),
    enabled: isAuthenticated,
  })

  const pendingCount = pendingCountData?.count ?? 0

  return (
    <div className="hidden sm:flex h-screen w-16 flex-col border-r bg-background">
      <div className="flex flex-1 flex-col gap-2 p-2">
        {filteredItems.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.path
          const isTasksItem = item.path === '/tasks'

          return (
            <TooltipProvider key={item.path}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link to={item.path}>
                    <Button
                      variant={isActive ? 'default' : 'ghost'}
                      size="icon"
                      className={cn(
                        'relative h-12 w-12',
                        isActive && 'bg-primary text-primary-foreground'
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      {isTasksItem && <TasksNavBadge count={pendingCount} />}
                      <span className="sr-only">{item.label}</span>
                    </Button>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>{item.label}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )
        })}
      </div>
      <div className="p-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-12 w-12"
                onClick={logout}
              >
                <LogOut className="h-5 w-5" />
                <span className="sr-only">Выход</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Выход</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  )
}

