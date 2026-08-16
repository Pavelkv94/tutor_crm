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
import type { Material } from '@/types'

interface RenameMaterialDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  material: Material | null
  courseId: number
}

export const RenameMaterialDialog = ({
  open,
  onOpenChange,
  material,
  courseId,
}: RenameMaterialDialogProps) => {
  const [name, setName] = useState('')
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!open) return
    setName(material?.originalName ?? '')
  }, [open, material])

  const renameMutation = useMutation({
    mutationFn: (originalName: string) =>
      materialsApi.renameMaterial(material!.id, { originalName }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials', 'courses', courseId, 'materials'] })
      showSuccessToast('Материал переименован')
      onOpenChange(false)
    },
  })

  const trimmedName = name.trim()
  const isUnchanged = trimmedName === material?.originalName
  const isSubmitDisabled = !trimmedName || isUnchanged || renameMutation.isPending || !material

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitDisabled) return
    renameMutation.mutate(trimmedName)
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (renameMutation.isPending) return
    onOpenChange(nextOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Переименовать материал</DialogTitle>
          <DialogDescription>
            Измените название файла <strong>{material?.originalName}</strong>. Сам файл в хранилище
            останется прежним.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="material-name">Название</Label>
              <Input
                id="material-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Например, lesson5.pdf"
                maxLength={255}
                required
                autoFocus
                aria-label="Название материала"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={isSubmitDisabled}>
              {renameMutation.isPending ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
