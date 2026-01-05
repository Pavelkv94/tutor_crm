import { useState, useEffect } from 'react'
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
import type { UpdateStudentInput } from '@/types'

interface EditStudentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  studentId: number | null
}

export const EditStudentDialog = ({ open, onOpenChange, studentId }: EditStudentDialogProps) => {
  const [name, setName] = useState('')
  const [studentClass, setStudentClass] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [teacherId, setTeacherId] = useState<string>('')
  const { isAdmin } = useAuth()
  const queryClient = useQueryClient()

  const { data: student } = useQuery({
    queryKey: ['student', studentId],
    queryFn: () => studentsApi.getById(studentId!),
    enabled: !!studentId && open,
    refetchOnMount: true,
  })

  const { data: teachers = [] } = useQuery({
    queryKey: ['teachers', 'active'],
    queryFn: () => teachersApi.getAll('active'),
    enabled: isAdmin && open,
  })

  const activeTeachers = teachers.filter((teacher) => !teacher.deleted_at)

  useEffect(() => {
    if (student && open) {
      setName(student.name)
      setStudentClass(student.class.toString())
      setBirthDate(student.birth_date ? student.birth_date.split('T')[0] : '')
      if (student.teacher_id) {
        setTeacherId(student.teacher_id.toString())
      } else {
        setTeacherId('')
      }
    }
  }, [student, open, studentId])

  const updateMutation = useMutation({
    mutationFn: (data: UpdateStudentInput) => studentsApi.update(studentId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] })
      queryClient.invalidateQueries({ queryKey: ['student', studentId] })
      onOpenChange(false)
    },
  })

  useEffect(() => {
    if (!open) {
      setName('')
      setStudentClass('')
      setBirthDate('')
      setTeacherId('')
    }
  }, [open])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !studentClass) return

    const data: UpdateStudentInput = {
      name,
      class: parseInt(studentClass, 10),
      birth_date: birthDate ? new Date(birthDate).toISOString() : null,
    }

    // Only include teacher_id if admin and it's provided
    if (isAdmin && teacherId) {
      data.teacher_id = parseInt(teacherId, 10)
    }

    updateMutation.mutate(data)
  }

  if (!student) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Редактировать ученика</DialogTitle>
          <DialogDescription>Изменить информацию об ученике.</DialogDescription>
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
              <Label htmlFor="edit-class">Класс</Label>
              <Input
                id="edit-class"
                type="number"
                min="1"
                value={studentClass}
                onChange={(e) => setStudentClass(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-birthDate">Дата рождения</Label>
              <Input
                id="edit-birthDate"
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
              />
            </div>
            {isAdmin && (
              <div className="grid gap-2">
                <Label htmlFor="edit-teacher">Преподаватель</Label>
                <Select value={teacherId} onValueChange={setTeacherId}>
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
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

