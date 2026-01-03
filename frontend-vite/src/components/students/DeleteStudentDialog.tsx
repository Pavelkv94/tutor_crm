import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { Student } from '@/types'

interface DeleteStudentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  student: Student | null
  onConfirm: () => void
  isDeleting: boolean
}

export const DeleteStudentDialog = ({
  open,
  onOpenChange,
  student,
  onConfirm,
  isDeleting,
}: DeleteStudentDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Удалить ученика</DialogTitle>
          <DialogDescription>
            Вы уверены, что хотите удалить <strong>{student?.name}</strong>? Это действие
            нельзя отменить.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? 'Удаление...' : 'Удалить'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

