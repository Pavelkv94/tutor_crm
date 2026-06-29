import { cn } from '@/lib/utils'

interface TasksNavBadgeProps {
  count: number
  className?: string
}

export const TasksNavBadge = ({ count, className }: TasksNavBadgeProps) => {
  const hasPendingTasks = count > 0

  return (
    <span
      className={cn(
        'absolute -bottom-0.5 -right-0.5 flex h-4 min-w-4 animate-badge-pulse items-center justify-center rounded-full px-1 text-[10px] font-semibold leading-none',
        hasPendingTasks ? 'bg-red-500 text-white' : 'border border-gray-300 bg-white text-black',
        className
      )}
      aria-label={`Задач: ${count}`}
    >
      {count}
    </span>
  )
}
