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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { materialsApi } from '@/api/materials'
import { showSuccessToast } from '@/lib/toast'
import type { Course } from '@/types'

interface CourseFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  course?: Course | null
}

export const CourseFormDialog = ({ open, onOpenChange, course = null }: CourseFormDialogProps) => {
  const [name, setName] = useState('')
  const queryClient = useQueryClient()
  const isEdit = !!course

  useEffect(() => {
    if (!open) return
    setName(course?.name ?? '')
  }, [open, course])

  const createMutation = useMutation({
    mutationFn: (courseName: string) => materialsApi.createCourse({ name: courseName }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials', 'courses'] })
      showSuccessToast('Курс создан')
      onOpenChange(false)
    },
  })

  const updateMutation = useMutation({
    mutationFn: (courseName: string) => materialsApi.updateCourse(course!.id, { name: courseName }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials', 'courses'] })
      showSuccessToast('Курс обновлён')
      onOpenChange(false)
    },
  })

  const isPending = createMutation.isPending || updateMutation.isPending

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName) return

    if (isEdit) {
      updateMutation.mutate(trimmedName)
      return
    }

    createMutation.mutate(trimmedName)
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setName('')
    }
    onOpenChange(nextOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Редактировать курс' : 'Создать курс'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Измените название курса.' : 'Укажите название нового курса.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="course-name">Название</Label>
              <Input
                id="course-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Например, English Starter"
                maxLength={255}
                required
                autoFocus
                aria-label="Название курса"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={isPending || !name.trim()}>
              {isPending
                ? isEdit
                  ? 'Сохранение...'
                  : 'Создание...'
                : isEdit
                  ? 'Сохранить'
                  : 'Создать'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
