import { useState } from 'react'
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
import type { CreateTaskInput, TeacherTasksSummary } from '@/types'

interface CreateTaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  teachers: TeacherTasksSummary[]
  defaultTeacherId?: string
}

export const CreateTaskDialog = ({
  open,
  onOpenChange,
  teachers,
  defaultTeacherId = '',
}: CreateTaskDialogProps) => {
  const [description, setDescription] = useState('')
  const [teacherId, setTeacherId] = useState(defaultTeacherId)
  const queryClient = useQueryClient()

  const isFormValid = description.trim() !== '' && teacherId !== ''

  const createMutation = useMutation({
    mutationFn: (data: CreateTaskInput) => tasksApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      showSuccessToast('Задача создана')
      onOpenChange(false)
      setDescription('')
      setTeacherId(defaultTeacherId)
    },
  })

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setTeacherId(defaultTeacherId)
    } else {
      setDescription('')
      setTeacherId(defaultTeacherId)
    }
    onOpenChange(nextOpen)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!isFormValid) return

    createMutation.mutate({
      description: description.trim(),
      teacher_id: parseInt(teacherId, 10),
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Создать задачу</DialogTitle>
          <DialogDescription>Назначьте исполнителя и опишите задачу.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="create-task-teacher">Исполнитель</Label>
              <Select value={teacherId} onValueChange={setTeacherId} required>
                <SelectTrigger id="create-task-teacher">
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
              <Label htmlFor="create-task-description">Описание</Label>
              <Textarea
                id="create-task-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Опишите задачу..."
                required
                rows={10}
                className="min-h-[240px] resize-y"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={createMutation.isPending || !isFormValid}>
              {createMutation.isPending ? 'Создание...' : 'Создать'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
