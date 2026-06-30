import { Pencil, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatTaskDate, getTaskColorClass } from '@/components/tasks/task-utils'
import { TaskStatusIcon } from '@/components/tasks/TaskStatusIcon'
import type { Task } from '@/types'

interface TaskStickerProps {
  task: Task
  canEdit?: boolean
  canDelete?: boolean
  onView: (task: Task) => void
  onEdit?: (task: Task) => void
  onDelete?: (task: Task) => void
}

export const TaskSticker = ({
  task,
  canEdit = false,
  canDelete = false,
  onView,
  onEdit,
  onDelete,
}: TaskStickerProps) => {
  const handleViewClick = () => {
    onView(task)
  }

  const handleViewKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onView(task)
    }
  }

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onEdit?.(task)
  }

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete?.(task)
  }

  const showActions = canEdit || canDelete
  const isCompleted = task.status === 'COMPLETED'

  return (
    <div
      className={cn(
        'relative flex aspect-square flex-col rounded-sm p-4 shadow-md',
        'font-medium text-gray-800 leading-snug',
        getTaskColorClass(task.color),
        isCompleted && 'opacity-60 grayscale shadow-sm'
      )}
    >
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-4 bg-white/40 rounded-sm"
        aria-hidden="true"
      />

      {showActions && (
        <div className="relative z-10 flex items-start justify-between gap-1 pt-1">
          <TaskStatusIcon status={task.status} />
          <div className="flex gap-1">
            {canEdit && (
              <button
                type="button"
                onClick={handleEditClick}
                className="rounded p-1 text-gray-700 transition-colors hover:bg-black/10"
                aria-label="Редактировать задачу"
              >
                <Pencil className="h-4 w-4" />
              </button>
            )}
            {canDelete && (
              <button
                type="button"
                onClick={handleDeleteClick}
                className="rounded p-1 text-gray-700 transition-colors hover:bg-black/10"
                aria-label="Удалить задачу"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {!showActions && (
        <div className="relative z-10 pt-1">
          <TaskStatusIcon status={task.status} />
        </div>
      )}

      <button
        type="button"
        onClick={handleViewClick}
        onKeyDown={handleViewKeyDown}
        className={cn(
          'relative z-10 flex flex-1 flex-col text-left outline-none',
          'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm'
        )}
        aria-label={`Открыть задачу: ${task.description}`}
      >
        <p className={cn('line-clamp-5 flex-1 text-sm', isCompleted && 'text-gray-500')}>
          {task.description}
        </p>
        <p className={cn('mt-2 text-xs text-gray-500', isCompleted && 'text-gray-400')}>
          {formatTaskDate(task.created_at)}
        </p>
      </button>
    </div>
  )
}
