import { Link, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { LogOut } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { getVisibleNavItems } from '@/constants/navigation'
import { tasksApi } from '@/api/tasks'
import { TasksNavBadge } from '@/components/tasks/TasksNavBadge'

const getInitials = (name: string): string => {
  return name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

const getRoleLabel = (role: string): string => {
  if (role === 'ADMIN') return 'Администратор'
  if (role === 'TEACHER') return 'Преподаватель'
  return role
}

export const Sidebar = () => {
  const location = useLocation()
  const { isAdmin, logout, isAuthenticated, user } = useAuth()

  const filteredItems = getVisibleNavItems(isAdmin)

  const { data: pendingCountData } = useQuery({
    queryKey: ['tasks', 'pending-count'],
    queryFn: () => tasksApi.getPendingCount(),
    enabled: isAuthenticated,
  })

  const pendingCount = pendingCountData?.count ?? 0

  return (
    <aside
      className="hidden sm:flex h-screen w-56 flex-shrink-0 flex-col"
      style={{
        background: 'linear-gradient(180deg, #5634c4 0%, #421ca8 100%)',
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 pt-6 pb-5">
        <img
          src="/logo.png"
          alt="English Stars logo"
          className="h-10 w-10 flex-shrink-0 rounded-full object-cover shadow-md"
          style={{ boxShadow: '0 0 0 2px rgba(255,255,255,0.2)' }}
        />
        <div className="flex flex-col leading-tight">
          <span
            className="text-sm font-extrabold tracking-tight"
            style={{ color: '#fff', letterSpacing: '-0.02em' }}
          >
            English Stars
          </span>
          <span
            className="text-xs font-bold uppercase tracking-widest"
            style={{ color: 'rgba(255,255,255,0.6)', letterSpacing: '0.14em', fontSize: '10px' }}
          >
            School CRM
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col gap-1 px-2.5" aria-label="Основное меню">
        {filteredItems.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.path
          const isTasksItem = item.path === '/tasks'

          return (
            <Link
              key={item.path}
              to={item.path}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
              className="relative flex items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-sm font-semibold transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-yellow-300"
              style={
                isActive
                  ? {
                      background: '#f9da00',
                      color: '#2a1568',
                    }
                  : {
                      background: 'transparent',
                      color: 'rgba(255,255,255,0.75)',
                    }
              }
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.10)'
                  e.currentTarget.style.color = '#fff'
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = 'rgba(255,255,255,0.75)'
                }
              }}
            >
              <Icon
                className="h-5 w-5 flex-shrink-0"
                style={{ color: isActive ? '#2a1568' : 'rgba(255,255,255,0.75)' }}
                aria-hidden="true"
              />
              <span className="flex-1">{item.label}</span>
              {isTasksItem && <TasksNavBadge count={pendingCount} variant="inline" />}
            </Link>
          )
        })}
      </nav>

      {/* Profile block */}
      {user && (
        <div
          className="mx-2.5 mb-4 mt-4 flex items-center gap-2.5 rounded-xl px-2.5 py-3"
          style={{ borderTop: '1px solid rgba(255,255,255,0.13)' }}
        >
          <div
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-sm font-extrabold"
            style={{ background: '#f9da00', color: '#2a1568' }}
            aria-hidden="true"
          >
            {getInitials(user.name)}
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <div
              className="truncate text-sm font-bold"
              style={{ color: '#fff' }}
            >
              {user.name}
            </div>
            <div className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>
              {getRoleLabel(user.role)}
            </div>
          </div>
          <button
            onClick={logout}
            title="Выйти"
            aria-label="Выйти из системы"
            className="flex h-8 w-8 flex-shrink-0 cursor-pointer items-center justify-center rounded-lg border-none transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300"
            style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.8)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.18)'
              e.currentTarget.style.color = '#fff'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
              e.currentTarget.style.color = 'rgba(255,255,255,0.8)'
            }}
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </aside>
  )
}
