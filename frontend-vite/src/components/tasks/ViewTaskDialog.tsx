import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { tasksApi } from '@/api/tasks'
import { showSuccessToast } from '@/lib/toast'
import { formatTaskDate, getTaskColorClass, TASK_STATUS_LABELS } from '@/components/tasks/task-utils'
import type { Task, TaskStatus } from '@/types'

interface ViewTaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  task: Task | null
  isAdmin: boolean
  onTaskUpdated?: (task: Task) => void
}

export const ViewTaskDialog = ({
  open,
  onOpenChange,
  task,
  isAdmin,
  onTaskUpdated,
}: ViewTaskDialogProps) => {
  const [displayTask, setDisplayTask] = useState<Task | null>(task)
  const queryClient = useQueryClient()

  useEffect(() => {
    setDisplayTask(task)
  }, [task])

  const updateMutation = useMutation({
    mutationFn: (status: TaskStatus) => tasksApi.update(displayTask!.id, { status }),
    onSuccess: (updatedTask) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      setDisplayTask(updatedTask)
      onTaskUpdated?.(updatedTask)
      showSuccessToast('Статус задачи обновлён')
    },
  })

  if (!displayTask) return null

  const showOnApprovalButton = displayTask.status === 'IN_PROGRESS'
  const showCompletedButton = isAdmin && displayTask.status !== 'COMPLETED'

  const handleStatusChange = (status: TaskStatus) => {
    updateMutation.mutate(status)
  }

  const hasActionButtons = showOnApprovalButton || showCompletedButton

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-[640px] border-0 bg-transparent p-0 shadow-none overflow-visible sm:max-w-[640px]">
        <DialogHeader className="sr-only">
          <DialogTitle>Просмотр задачи</DialogTitle>
        </DialogHeader>
        <div
          className={cn(
            'relative flex max-h-[85vh] flex-col overflow-hidden rounded-sm shadow-lg',
            'font-medium text-gray-800 leading-relaxed',
            getTaskColorClass(displayTask.color)
          )}
        >
          <div
            className="absolute top-0 left-1/2 z-10 -translate-x-1/2 -translate-y-1/2 w-10 h-5 bg-white/40 rounded-sm"
            aria-hidden="true"
          />
          <div className="overflow-y-auto p-6 pt-8 space-y-4">
            <p className="whitespace-pre-wrap break-words text-base">{displayTask.description}</p>
            <div className="space-y-1 shrink-0 text-sm text-gray-600">
              <p>Статус: {TASK_STATUS_LABELS[displayTask.status]}</p>
              {displayTask.teacher && <p>Исполнитель: {displayTask.teacher.name}</p>}
              <p>Создано: {formatTaskDate(displayTask.created_at)}</p>
            </div>
          </div>
          {hasActionButtons && (
            <div className="flex justify-end gap-2 border-t border-black/10 p-4">
              {showOnApprovalButton && (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => handleStatusChange('ON_APPROVAL')}
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? 'Сохранение...' : 'На проверку'}
                </Button>
              )}
              {showCompletedButton && (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleStatusChange('COMPLETED')}
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? 'Сохранение...' : 'Выполнено'}
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
