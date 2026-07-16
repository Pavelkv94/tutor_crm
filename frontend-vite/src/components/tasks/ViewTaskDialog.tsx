import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Smile } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { tasksApi } from '@/api/tasks'
import { showSuccessToast } from '@/lib/toast'
import { EmojiPickerPanel } from '@/components/tasks/EmojiPickerPanel'
import {
  formatTaskDate,
  formatTaskDateTime,
  getTaskColorClass,
  TASK_STATUS_LABELS,
} from '@/components/tasks/task-utils'
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
  const [commentText, setCommentText] = useState('')
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false)
  const [formTaskId, setFormTaskId] = useState(task?.id)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const emojiPickerRef = useRef<HTMLDivElement>(null)
  const queryClient = useQueryClient()

  const taskId = task?.id

  if (taskId !== formTaskId) {
    setFormTaskId(taskId)
    setCommentText('')
    setIsEmojiPickerOpen(false)
  }

  const { data: taskDetails, isLoading: isLoadingDetails } = useQuery({
    queryKey: ['tasks', 'detail', taskId],
    queryFn: () => tasksApi.getById(taskId!),
    enabled: open && Boolean(taskId),
  })

  const displayTask = taskDetails ?? task
  const comments = taskDetails?.comments ?? []

  useEffect(() => {
    if (!isEmojiPickerOpen) return

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (emojiPickerRef.current?.contains(target)) return
      setIsEmojiPickerOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [isEmojiPickerOpen])

  const updateMutation = useMutation({
    mutationFn: (status: TaskStatus) => tasksApi.update(displayTask!.id, { status }),
    onSuccess: (updatedTask) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.setQueryData<Task>(['tasks', 'detail', updatedTask.id], (prev) =>
        prev
          ? {
              ...prev,
              ...updatedTask,
              comments: prev.comments,
              comments_count: prev.comments_count,
            }
          : {
              ...updatedTask,
              comments,
            }
      )
      onTaskUpdated?.(updatedTask)
      showSuccessToast('Статус задачи обновлён')
    },
  })

  const commentMutation = useMutation({
    mutationFn: (comment: string) =>
      tasksApi.createComment(displayTask!.id, { comment }),
    onSuccess: (createdComment) => {
      queryClient.setQueryData<Task>(['tasks', 'detail', displayTask!.id], (prev) => {
        if (!prev) return prev
        const nextComments = [...(prev.comments ?? []), createdComment]
        return {
          ...prev,
          comments: nextComments,
          comments_count: nextComments.length,
        }
      })
      setCommentText('')
      setIsEmojiPickerOpen(false)
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      showSuccessToast('Комментарий добавлен')
    },
  })

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setCommentText('')
      setIsEmojiPickerOpen(false)
    }
    onOpenChange(nextOpen)
  }

  if (!displayTask) return null

  const showOnApprovalButton = displayTask.status === 'IN_PROGRESS'
  const showCompletedButton = isAdmin && displayTask.status !== 'COMPLETED'
  const hasActionButtons = showOnApprovalButton || showCompletedButton
  const trimmedComment = commentText.trim()
  const canSubmitComment = trimmedComment.length > 0 && !commentMutation.isPending

  const handleStatusChange = (status: TaskStatus) => {
    updateMutation.mutate(status)
  }

  const handleEmojiSelect = (emoji: string) => {
    const textarea = textareaRef.current

    if (!textarea) {
      setCommentText((prev) => prev + emoji)
      return
    }

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const nextValue = commentText.slice(0, start) + emoji + commentText.slice(end)
    setCommentText(nextValue)

    requestAnimationFrame(() => {
      const cursor = start + emoji.length
      textarea.focus()
      textarea.setSelectionRange(cursor, cursor)
    })
  }

  const handleToggleEmojiPicker = () => {
    setIsEmojiPickerOpen((prev) => !prev)
  }

  const handleSubmitComment = (event: React.FormEvent) => {
    event.preventDefault()
    if (!canSubmitComment) return
    commentMutation.mutate(trimmedComment)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-[900px] border-0 bg-transparent p-0 shadow-none overflow-visible sm:max-w-[900px]">
        <DialogHeader className="sr-only">
          <DialogTitle>Просмотр задачи</DialogTitle>
          <DialogDescription>Детали задачи, комментарии и смена статуса</DialogDescription>
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

            <form onSubmit={handleSubmitComment} className="space-y-2 border-t border-black/10 pt-4">
              <label htmlFor="task-comment" className="text-sm font-medium text-gray-700">
                Комментарий
              </label>
              <Textarea
                id="task-comment"
                ref={textareaRef}
                value={commentText}
                onChange={(event) => setCommentText(event.target.value)}
                placeholder="Напишите комментарий..."
                rows={3}
                disabled={commentMutation.isPending}
                className="bg-white/70"
                aria-label="Текст комментария"
              />
              <div className="relative flex items-center justify-between gap-2">
                <div ref={emojiPickerRef} className="relative">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={handleToggleEmojiPicker}
                    aria-label="Добавить смайлик"
                    aria-expanded={isEmojiPickerOpen}
                    aria-haspopup="dialog"
                    disabled={commentMutation.isPending}
                  >
                    <Smile className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  {isEmojiPickerOpen && (
                    <div className="absolute bottom-full left-0 z-50 mb-2">
                      <EmojiPickerPanel onEmojiSelect={handleEmojiSelect} />
                    </div>
                  )}
                </div>
                <Button
                  type="submit"
                  size="sm"
                  disabled={!canSubmitComment}
                  aria-label="Отправить комментарий"
                >
                  {commentMutation.isPending ? 'Отправка...' : 'Отправить'}
                </Button>
              </div>
            </form>

            <div className="space-y-3 border-t border-black/10 pt-4">
              <h3 className="text-sm font-semibold text-gray-700">
                Комментарии
                {!isLoadingDetails && (
                  <span className="ml-1 font-normal text-gray-500">({comments.length})</span>
                )}
              </h3>
              {isLoadingDetails ? (
                <p className="text-sm text-gray-500">Загрузка комментариев...</p>
              ) : comments.length === 0 ? (
                <p className="text-sm text-gray-500">Пока нет комментариев</p>
              ) : (
                <ul className="space-y-3" aria-label="Список комментариев">
                  {comments.map((comment) => (
                    <li
                      key={comment.id}
                      className="rounded-md bg-white/50 px-3 py-2 text-sm shadow-sm"
                    >
                      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5 text-xs text-gray-500">
                        <span className="font-semibold text-gray-700">{comment.commenter_name}</span>
                        <time dateTime={comment.created_at}>
                          {formatTaskDateTime(comment.created_at)}
                        </time>
                      </div>
                      <p className="whitespace-pre-wrap break-words text-gray-800">
                        {comment.comment}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
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
