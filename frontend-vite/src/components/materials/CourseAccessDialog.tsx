import { useEffect, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
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
import { TeacherMultiSelect } from '@/components/materials/TeacherMultiSelect'
import { materialsApi } from '@/api/materials'
import { teachersApi } from '@/api/teachers'
import { showSuccessToast } from '@/lib/toast'
import type { Course } from '@/types'

interface CourseAccessDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  course: Course | null
}

export const CourseAccessDialog = ({ open, onOpenChange, course }: CourseAccessDialogProps) => {
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<number[]>([])

  const { data: teachers = [], isLoading: isTeachersLoading } = useQuery({
    queryKey: ['teachers', 'active'],
    queryFn: () => teachersApi.getAll('active'),
    enabled: open,
  })

  const accessTeachers = teachers.filter((teacher) => teacher.role !== 'ADMIN')

  useEffect(() => {
    if (!open) {
      setSelectedTeacherIds([])
    }
  }, [open])

  const grantMutation = useMutation({
    mutationFn: (teacherIds: number[]) =>
      materialsApi.grantCourseAccess(course!.id, { teacherIds }),
    onSuccess: () => {
      showSuccessToast('Доступ к материалам курса выдан')
      setSelectedTeacherIds([])
    },
  })

  const revokeMutation = useMutation({
    mutationFn: (teacherIds: number[]) =>
      materialsApi.revokeCourseAccess(course!.id, { teacherIds }),
    onSuccess: () => {
      showSuccessToast('Доступ к материалам курса отозван')
      setSelectedTeacherIds([])
    },
  })

  const isPending = grantMutation.isPending || revokeMutation.isPending
  const canSubmit = selectedTeacherIds.length > 0 && !isPending && !!course

  const handleGrantClick = () => {
    if (!canSubmit) return
    grantMutation.mutate(selectedTeacherIds)
  }

  const handleRevokeClick = () => {
    if (!canSubmit) return
    revokeMutation.mutate(selectedTeacherIds)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Доступы курса</DialogTitle>
          <DialogDescription>
            Управление доступом преподавателей ко всем материалам курса{' '}
            <strong>{course?.name}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2 py-2">
          <Label>Преподаватели</Label>
          <TeacherMultiSelect
            teachers={accessTeachers}
            selectedIds={selectedTeacherIds}
            onChange={setSelectedTeacherIds}
            isLoading={isTeachersLoading}
          />
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Закрыть
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleRevokeClick}
            disabled={!canSubmit}
          >
            {revokeMutation.isPending ? 'Отзыв...' : 'Отозвать доступ'}
          </Button>
          <Button type="button" onClick={handleGrantClick} disabled={!canSubmit}>
            {grantMutation.isPending ? 'Выдача...' : 'Выдать доступ'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
