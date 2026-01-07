import { useState, useEffect } from 'react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { teachersApi } from '@/api/teachers'
import type { UpdateTeacherInput, Teacher } from '@/types'

interface EditTeacherDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  teacher: Teacher | null
}

export const EditTeacherDialog = ({ open, onOpenChange, teacher }: EditTeacherDialogProps) => {
	const [name, setName] = useState('')
  const [timezone, setTimezone] = useState<'BY' | 'PL'>('BY')
  const queryClient = useQueryClient()

  useEffect(() => {
    if (teacher) {
      setName(teacher.name)
			// telegram_link is no longer in the Teacher type, but we still allow editing it
      setTimezone(teacher.timezone)
    }
  }, [teacher])

  const updateMutation = useMutation({
    mutationFn: (data: UpdateTeacherInput) => teachersApi.update(teacher!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] })
      onOpenChange(false)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!teacher || !name) return

    const data: UpdateTeacherInput = {
			name,
      timezone,
    }

    updateMutation.mutate(data)
  }

  if (!teacher) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Редактировать преподавателя</DialogTitle>
          <DialogDescription>Обновить информацию о преподавателе.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Имя</Label>
              <Input
                id="edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
						<div className="grid gap-2">
              <Label htmlFor="edit-timezone">Часовой пояс</Label>
              <Select value={timezone} onValueChange={(value: 'BY' | 'PL') => setTimezone(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BY">BY</SelectItem>
                  <SelectItem value="PL">PL</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Обновление...' : 'Обновить'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

