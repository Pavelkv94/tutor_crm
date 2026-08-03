import { useEffect, useState } from 'react'
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
import type { Course } from '@/types'

interface DeleteCourseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  course: Course | null
  onConfirm: () => void
  isDeleting: boolean
}

export const DeleteCourseDialog = ({
  open,
  onOpenChange,
  course,
  onConfirm,
  isDeleting,
}: DeleteCourseDialogProps) => {
  const [confirmationText, setConfirmationText] = useState('')
  const isConfirmationValid = !!course && confirmationText === course.name

  useEffect(() => {
    if (!open) {
      setConfirmationText('')
    }
  }, [open])

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setConfirmationText('')
    }
    onOpenChange(nextOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Удалить курс</DialogTitle>
          <DialogDescription>
            Вы уверены, что хотите удалить <strong>{course?.name}</strong>? Вместе с курсом
            безвозвратно будут удалены все связанные с ним материалы. Это действие нельзя отменить.
            <br />
            <br />
            Для подтверждения введите название курса в поле ниже:
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2 py-2">
          <Label htmlFor="delete-course-confirmation">Название курса</Label>
          <Input
            id="delete-course-confirmation"
            value={confirmationText}
            onChange={(e) => setConfirmationText(e.target.value)}
            placeholder={course?.name ?? 'Название курса'}
            aria-label="Введите название курса для подтверждения удаления"
            autoComplete="off"
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            Отмена
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
            disabled={!isConfirmationValid || isDeleting}
          >
            {isDeleting ? 'Удаление...' : 'Удалить'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
