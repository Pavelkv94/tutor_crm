import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TASK_STATUS_LABELS } from '@/components/tasks/task-utils'
import type { TaskStatus } from '@/types'

interface TaskStatusSectionProps {
  status: TaskStatus
  count: number
  collapsible?: boolean
  defaultCollapsed?: boolean
  children: React.ReactNode
}

export const TaskStatusSection = ({
  status,
  count,
  collapsible = false,
  defaultCollapsed = false,
  children,
}: TaskStatusSectionProps) => {
  const [isCollapsed, setIsCollapsed] = useState(collapsible && defaultCollapsed)

  const label = TASK_STATUS_LABELS[status]
  const gridId = `task-section-${status}`
  const ChevronIcon = isCollapsed ? ChevronRight : ChevronDown

  const handleToggle = () => {
    setIsCollapsed((prev) => !prev)
  }

  const header = (
    <>
      {collapsible && <ChevronIcon className="h-4 w-4 shrink-0" aria-hidden="true" />}
      <h2 className="text-sm font-semibold uppercase tracking-wide">{label}</h2>
      <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-foreground">
        {count}
      </span>
      <div className="h-px flex-1 bg-border" aria-hidden="true" />
    </>
  )

  return (
    <section className="space-y-3">
      {collapsible ? (
        <button
          type="button"
          onClick={handleToggle}
          aria-expanded={!isCollapsed}
          aria-controls={gridId}
          className={cn(
            'flex w-full items-center gap-2 rounded-sm text-muted-foreground outline-none',
            'transition-colors hover:text-foreground',
            'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
          )}
        >
          {header}
        </button>
      ) : (
        <div className="flex w-full items-center gap-2 text-muted-foreground">{header}</div>
      )}

      {!isCollapsed && (
        <div
          id={gridId}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6"
        >
          {children}
        </div>
      )}
    </section>
  )
}
