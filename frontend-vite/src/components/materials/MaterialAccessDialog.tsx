import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { UserMinus } from 'lucide-react'
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
import type { Material, MaterialTeacher } from '@/types'

interface MaterialAccessDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  material: Material | null
  courseId: number
}

export const MaterialAccessDialog = ({
  open,
  onOpenChange,
  material,
  courseId,
}: MaterialAccessDialogProps) => {
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<number[]>([])
  const [revokingTeacherId, setRevokingTeacherId] = useState<number | null>(null)
  const queryClient = useQueryClient()

  const accessTeachers = material?.teachers ?? []

  const { data: teachers = [], isLoading: isTeachersLoading } = useQuery({
    queryKey: ['teachers', 'active'],
    queryFn: () => teachersApi.getAll('active'),
    enabled: open,
  })

  const accessTeacherIds = new Set(accessTeachers.map((teacher) => teacher.id))
  const grantableTeachers = teachers.filter(
    (teacher) => teacher.role !== 'ADMIN' && !accessTeacherIds.has(teacher.id),
  )

  useEffect(() => {
    if (!open) {
      setSelectedTeacherIds([])
      setRevokingTeacherId(null)
    }
  }, [open])

  const invalidateMaterials = () => {
    queryClient.invalidateQueries({ queryKey: ['materials', 'courses', courseId, 'materials'] })
  }

  const grantMutation = useMutation({
    mutationFn: (teacherIds: number[]) =>
      materialsApi.grantMaterialAccess(material!.id, { teacherIds }),
    onSuccess: () => {
      showSuccessToast('Доступ к материалу выдан')
      setSelectedTeacherIds([])
      invalidateMaterials()
    },
  })

  const revokeMutation = useMutation({
    mutationFn: (teacherId: number) =>
      materialsApi.revokeMaterialAccess(material!.id, { teacherIds: [teacherId] }),
    onSuccess: () => {
      showSuccessToast('Доступ к материалу отозван')
      setRevokingTeacherId(null)
      invalidateMaterials()
    },
    onError: () => {
      setRevokingTeacherId(null)
    },
  })

  const handleGrantClick = () => {
    if (!material || selectedTeacherIds.length === 0 || grantMutation.isPending) return
    grantMutation.mutate(selectedTeacherIds)
  }

  const handleRevokeClick = (teacher: MaterialTeacher) => {
    if (!material || revokeMutation.isPending) return
    setRevokingTeacherId(teacher.id)
    revokeMutation.mutate(teacher.id)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Доступы материала</DialogTitle>
          <DialogDescription>
            Управление доступом преподавателей к материалу{' '}
            <strong>{material?.originalName}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label>У кого есть доступ</Label>
            {accessTeachers.length === 0 ? (
              <p className="rounded-md border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
                Пока ни у кого нет доступа
              </p>
            ) : (
              <ul className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-border p-2">
                {accessTeachers.map((teacher) => (
                  <li
                    key={teacher.id}
                    className="flex items-center justify-between gap-2 rounded-sm px-2 py-1.5 hover:bg-accent/50"
                  >
                    <span className="truncate text-sm font-medium">{teacher.name}</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleRevokeClick(teacher)}
                      disabled={revokeMutation.isPending}
                      aria-label={`Отозвать доступ у ${teacher.name}`}
                      className="h-8 shrink-0 border-red-200 text-red-500 hover:border-red-300 hover:bg-red-50 hover:text-red-600"
                    >
                      <UserMinus className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                      {revokingTeacherId === teacher.id && revokeMutation.isPending
                        ? 'Отзыв...'
                        : 'Отозвать'}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="grid gap-2">
            <Label>Выдать доступ</Label>
            <TeacherMultiSelect
              teachers={grantableTeachers}
              selectedIds={selectedTeacherIds}
              onChange={setSelectedTeacherIds}
              isLoading={isTeachersLoading}
              placeholder="Выберите преподавателей без доступа"
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Закрыть
          </Button>
          <Button
            type="button"
            onClick={handleGrantClick}
            disabled={selectedTeacherIds.length === 0 || grantMutation.isPending || !material}
          >
            {grantMutation.isPending ? 'Выдача...' : 'Выдать доступ'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
