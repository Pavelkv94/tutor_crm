import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Lock, UserMinus, Undo2 } from 'lucide-react'
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
import type { Material, MaterialTeacher, TeacherRef } from '@/types'

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
  const [pendingTeacherId, setPendingTeacherId] = useState<number | null>(null)
  const queryClient = useQueryClient()

  const accessTeachers = material?.teachers ?? []
  const restrictedTeachers = material?.restrictedTeachers ?? []
  const courseTeachers = accessTeachers.filter((teacher) => teacher.accessSource === 'COURSE')
  const personalTeachers = accessTeachers.filter((teacher) => teacher.accessSource === 'FILE')

  const { data: teachers = [], isLoading: isTeachersLoading } = useQuery({
    queryKey: ['teachers', 'active'],
    queryFn: () => teachersApi.getAll('active'),
    enabled: open,
  })

  const knownTeacherIds = new Set([
    ...accessTeachers.map((teacher) => teacher.id),
    ...restrictedTeachers.map((teacher) => teacher.id),
  ])
  const grantableTeachers = teachers.filter(
    (teacher) => teacher.role !== 'ADMIN' && !knownTeacherIds.has(teacher.id),
  )

  useEffect(() => {
    if (!open) {
      setSelectedTeacherIds([])
      setPendingTeacherId(null)
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
      setPendingTeacherId(null)
      invalidateMaterials()
    },
    onError: () => {
      setPendingTeacherId(null)
    },
  })

  const revokeMutation = useMutation({
    mutationFn: (teacherId: number) =>
      materialsApi.revokeMaterialAccess(material!.id, { teacherIds: [teacherId] }),
    onSuccess: () => {
      showSuccessToast('Доступ к материалу отозван')
      setPendingTeacherId(null)
      invalidateMaterials()
    },
    onError: () => {
      setPendingTeacherId(null)
    },
  })

  const isPending = grantMutation.isPending || revokeMutation.isPending

  const handleGrantClick = () => {
    if (!material || selectedTeacherIds.length === 0 || isPending) return
    grantMutation.mutate(selectedTeacherIds)
  }

  const handleRevokeClick = (teacher: MaterialTeacher) => {
    if (!material || isPending) return
    setPendingTeacherId(teacher.id)
    revokeMutation.mutate(teacher.id)
  }

  const handleRestoreClick = (teacher: TeacherRef) => {
    if (!material || isPending) return
    setPendingTeacherId(teacher.id)
    grantMutation.mutate([teacher.id])
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

        <div className="grid max-h-[60vh] gap-4 overflow-y-auto py-2">
          <div className="grid gap-2">
            <Label>Доступ по курсу</Label>
            {courseTeachers.length === 0 ? (
              <p className="rounded-md border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
                Ни у кого нет доступа к курсу
              </p>
            ) : (
              <ul className="space-y-1 rounded-md border border-border p-2">
                {courseTeachers.map((teacher) => (
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
                      disabled={isPending}
                      aria-label={`Ограничить доступ к материалу для ${teacher.name}`}
                      className="h-8 shrink-0 border-red-200 text-red-500 hover:border-red-300 hover:bg-red-50 hover:text-red-600"
                    >
                      <Lock className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                      {pendingTeacherId === teacher.id && revokeMutation.isPending
                        ? 'Ограничение...'
                        : 'Ограничить'}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {restrictedTeachers.length > 0 && (
            <div className="grid gap-2">
              <Label>Ограничен доступ</Label>
              <ul className="space-y-1 rounded-md border border-border p-2">
                {restrictedTeachers.map((teacher) => (
                  <li
                    key={teacher.id}
                    className="flex items-center justify-between gap-2 rounded-sm px-2 py-1.5 hover:bg-accent/50"
                  >
                    <span className="truncate text-sm font-medium text-muted-foreground">
                      {teacher.name}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleRestoreClick(teacher)}
                      disabled={isPending}
                      aria-label={`Вернуть доступ к материалу для ${teacher.name}`}
                      className="h-8 shrink-0"
                    >
                      <Undo2 className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                      {pendingTeacherId === teacher.id && grantMutation.isPending
                        ? 'Возврат...'
                        : 'Вернуть'}
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid gap-2">
            <Label>Персональный доступ</Label>
            {personalTeachers.length === 0 ? (
              <p className="rounded-md border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
                Персональных доступов нет
              </p>
            ) : (
              <ul className="space-y-1 rounded-md border border-border p-2">
                {personalTeachers.map((teacher) => (
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
                      disabled={isPending}
                      aria-label={`Отозвать доступ у ${teacher.name}`}
                      className="h-8 shrink-0 border-red-200 text-red-500 hover:border-red-300 hover:bg-red-50 hover:text-red-600"
                    >
                      <UserMinus className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                      {pendingTeacherId === teacher.id && revokeMutation.isPending
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
            disabled={selectedTeacherIds.length === 0 || isPending || !material}
          >
            {grantMutation.isPending && selectedTeacherIds.length > 0 ? 'Выдача...' : 'Выдать доступ'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
