import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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
import { studentsApi } from '@/api/students'
import { teachersApi } from '@/api/teachers'
import { useAuth } from '@/contexts/AuthContext'
import type { CreateStudentInput } from '@/types'

interface CreateStudentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const CreateStudentDialog = ({ open, onOpenChange }: CreateStudentDialogProps) => {
  const [name, setName] = useState('')
  const [studentClass, setStudentClass] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [teacherId, setTeacherId] = useState<string>('')
  const [timezone, setTimezone] = useState<'BY' | 'PL' | ''>('')
  const { isAdmin, user } = useAuth()
  const queryClient = useQueryClient()

  const { data: teachers = [] } = useQuery({
    queryKey: ['teachers', 'active'],
    queryFn: () => teachersApi.getAll('active'),
    enabled: isAdmin && open,
  })

  const activeTeachers = teachers.filter((teacher) => !teacher.deleted_at)

  const isFormValid = name.trim() !== '' && studentClass.trim() !== '' && (!isAdmin || teacherId !== '')

  const createMutation = useMutation({
    mutationFn: (data: CreateStudentInput) => studentsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] })
      onOpenChange(false)
      setName('')
      setStudentClass('')
      setBirthDate('')
      setTeacherId('')
      setTimezone('')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !studentClass) return
    if (isAdmin && !teacherId) return

    const data: CreateStudentInput = {
      name,
      class: parseInt(studentClass, 10),
      birth_date: birthDate ? new Date(birthDate).toISOString() : null,
      teacher_id: isAdmin ? parseInt(teacherId, 10) : parseInt(user?.id || '0', 10),
      timezone: timezone ? (timezone as 'BY' | 'PL') : null,
    }

    createMutation.mutate(data)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Создать ученика</DialogTitle>
          <DialogDescription>Добавить нового ученика в систему.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Имя</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="class">Класс</Label>
              <Input
                id="class"
                type="number"
                min="1"
                value={studentClass}
                onChange={(e) => setStudentClass(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="birthDate">Дата рождения</Label>
              <Input
                id="birthDate"
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
              />
            </div>
            {isAdmin && (
              <div className="grid gap-2">
                <Label htmlFor="teacher">Преподаватель</Label>
                <Select value={teacherId} onValueChange={setTeacherId} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите преподавателя" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeTeachers.map((teacher) => (
                      <SelectItem key={teacher.id} value={teacher.id.toString()}>
                        {teacher.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="timezone">Часовой пояс</Label>
              <Select value={timezone || 'none'} onValueChange={(value: 'BY' | 'PL' | 'none') => setTimezone(value === 'none' ? '' : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите часовой пояс (необязательно)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Не выбрано</SelectItem>
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
            <Button type="submit" disabled={createMutation.isPending || !isFormValid}>
              {createMutation.isPending ? 'Создание...' : 'Создать'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
