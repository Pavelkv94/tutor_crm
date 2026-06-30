import { CheckCircle2, Eye, PlayCircle, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TASK_STATUS_LABELS } from '@/components/tasks/task-utils'
import type { TaskStatus } from '@/types'

interface StatusIconConfig {
  icon: LucideIcon
  className: string
}

const STATUS_ICON_CONFIG: Record<TaskStatus, StatusIconConfig> = {
  IN_PROGRESS: {
    icon: PlayCircle,
    className: 'text-blue-600',
  },
  ON_APPROVAL: {
    icon: Eye,
    className: 'text-amber-600',
  },
  COMPLETED: {
    icon: CheckCircle2,
    className: 'text-green-600',
  },
}

interface TaskStatusIconProps {
  status: TaskStatus
  className?: string
}

export const TaskStatusIcon = ({ status, className }: TaskStatusIconProps) => {
  const { icon: Icon, className: iconClassName } = STATUS_ICON_CONFIG[status]

  return (
    <span
      className={cn('inline-flex shrink-0 grayscale-0', className)}
      aria-label={TASK_STATUS_LABELS[status]}
      title={TASK_STATUS_LABELS[status]}
    >
      <Icon className={cn('h-5 w-5', iconClassName)} aria-hidden="true" />
    </span>
  )
}
