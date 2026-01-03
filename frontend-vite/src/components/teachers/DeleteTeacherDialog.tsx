import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { Teacher } from '@/types'

interface DeleteTeacherDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  teacher: Teacher | null
  onConfirm: () => void
  isDeleting: boolean
}

export const DeleteTeacherDialog = ({
  open,
  onOpenChange,
  teacher,
  onConfirm,
  isDeleting,
}: DeleteTeacherDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Удалить преподавателя</DialogTitle>
          <DialogDescription>
            Вы уверены, что хотите удалить <strong>{teacher?.name}</strong>? Это действие
            архивирует преподавателя (мягкое удаление).
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

