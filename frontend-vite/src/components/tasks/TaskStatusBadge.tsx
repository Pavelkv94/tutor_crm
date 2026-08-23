import { CheckCircle2, CircleDot, Clock } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TASK_STATUS_LABELS, TASK_STATUS_PILL_CLASS } from '@/components/tasks/task-utils'
import type { TaskStatus } from '@/types'

const TASK_STATUS_ICON: Record<TaskStatus, LucideIcon> = {
  IN_PROGRESS: CircleDot,
  ON_APPROVAL: Clock,
  COMPLETED: CheckCircle2,
}

interface TaskStatusBadgeProps {
  status: TaskStatus
  className?: string
}

export const TaskStatusBadge = ({ status, className }: TaskStatusBadgeProps) => {
  const Icon = TASK_STATUS_ICON[status]

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold',
        TASK_STATUS_PILL_CLASS[status],
        className
      )}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      {TASK_STATUS_LABELS[status]}
    </span>
  )
}
