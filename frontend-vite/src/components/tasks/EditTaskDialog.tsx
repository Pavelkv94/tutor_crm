import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { tasksApi } from '@/api/tasks'
import { showSuccessToast } from '@/lib/toast'
import { TASK_STATUS_LABELS } from '@/components/tasks/task-utils'
import type { Task, TaskStatus, TeacherTasksSummary, UpdateTaskInput } from '@/types'

interface EditTaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  task: Task | null
  isAdmin: boolean
  teachers?: TeacherTasksSummary[]
}

export const EditTaskDialog = ({
  open,
  onOpenChange,
  task,
  isAdmin,
  teachers = [],
}: EditTaskDialogProps) => {
  const [description, setDescription] = useState('')
  const [teacherId, setTeacherId] = useState('')
  const [status, setStatus] = useState<TaskStatus>('IN_PROGRESS')
  const queryClient = useQueryClient()

  useEffect(() => {
    if (task) {
      setDescription(task.description)
      setTeacherId(task.teacher_id.toString())
      setStatus(task.status)
    }
  }, [task])

  const updateMutation = useMutation({
    mutationFn: (data: UpdateTaskInput) => tasksApi.update(task!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      showSuccessToast('Задача обновлена')
      onOpenChange(false)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!task) return

    if (isAdmin) {
      if (!description.trim() || !teacherId) return
      updateMutation.mutate({
        description: description.trim(),
        teacher_id: parseInt(teacherId, 10),
        status,
      })
      return
    }

    updateMutation.mutate({ status: 'ON_APPROVAL' })
  }

  if (!task) return null

  if (!isAdmin) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Отправить на проверку</DialogTitle>
            <DialogDescription>
              Задача будет переведена в статус «На проверку».
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{task.description}</p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? 'Отправка...' : 'Отправить на проверку'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Редактировать задачу</DialogTitle>
          <DialogDescription>Измените исполнителя, статус или описание задачи.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-task-teacher">Исполнитель</Label>
              <Select value={teacherId} onValueChange={setTeacherId} required>
                <SelectTrigger id="edit-task-teacher">
                  <SelectValue placeholder="Выберите преподавателя" />
                </SelectTrigger>
                <SelectContent>
                  {teachers.map((teacher) => (
                    <SelectItem key={teacher.id} value={teacher.id.toString()}>
                      {teacher.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-task-status">Статус</Label>
              <Select value={status} onValueChange={(value: TaskStatus) => setStatus(value)}>
                <SelectTrigger id="edit-task-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TASK_STATUS_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-task-description">Описание</Label>
              <Textarea
                id="edit-task-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                rows={10}
                className="min-h-[240px] resize-y"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button
              type="submit"
              disabled={updateMutation.isPending || !description.trim() || !teacherId}
            >
              {updateMutation.isPending ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
