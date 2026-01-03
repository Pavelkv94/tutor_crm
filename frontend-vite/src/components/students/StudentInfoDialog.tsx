import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { studentsApi } from '@/api/students'

interface StudentInfoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  studentId: number | null
}

export const StudentInfoDialog = ({
  open,
  onOpenChange,
  studentId,
}: StudentInfoDialogProps) => {
  const { data: student, isLoading } = useQuery({
    queryKey: ['student', studentId],
    queryFn: () => studentsApi.getById(studentId!),
    enabled: open && studentId !== null,
  })

  if (!studentId) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Информация об ученике</DialogTitle>
          <DialogDescription>Подробная информация об ученике.</DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <div className="py-4 text-center text-muted-foreground">Загрузка...</div>
        ) : student ? (
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Имя</Label>
              <div className="text-sm font-medium">{student.name}</div>
            </div>
            <div className="grid gap-2">
              <Label>Класс</Label>
              <div className="text-sm font-medium">{student.class}</div>
            </div>
            <div className="grid gap-2">
              <Label>Дата рождения</Label>
              <div className="text-sm font-medium">
                {format(new Date(student.birth_date), 'MMM dd, yyyy')}
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Баланс</Label>
              <div className="text-sm font-medium">{student.balance}</div>
            </div>
            <div className="grid gap-2">
              <Label>Бронировать до отмены</Label>
              <div className="text-sm font-medium">
                {student.bookUntilCancellation ? 'Да' : 'Нет'}
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Уведомлять о дне рождения</Label>
              <div className="text-sm font-medium">
                {student.notifyAboutBirthday ? 'Да' : 'Нет'}
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Уведомлять о занятиях</Label>
              <div className="text-sm font-medium">
                {student.notifyAboutLessons ? 'Да' : 'Нет'}
              </div>
            </div>
          </div>
        ) : (
          <div className="py-4 text-center text-muted-foreground">Ученик не найден</div>
        )}
      </DialogContent>
    </Dialog>
  )
}

