import { cn } from '@/lib/utils'

interface TasksNavBadgeProps {
  count: number
  className?: string
  variant?: 'corner' | 'inline'
}

export const TasksNavBadge = ({ count, className, variant = 'corner' }: TasksNavBadgeProps) => {
  const hasPendingTasks = count > 0

  return (
    <span
      className={cn(
        'flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold leading-none',
        hasPendingTasks && 'animate-badge-pulse',
        variant === 'corner' && 'absolute -top-1.5 -right-1.5',
        variant === 'inline' && 'shrink-0',
        hasPendingTasks ? 'bg-red-500 text-white' : 'border border-gray-300 bg-white text-black',
        className
      )}
      aria-label={`Задач: ${count}`}
    >
      {count}
    </span>
  )
}
