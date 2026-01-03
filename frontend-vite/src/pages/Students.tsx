import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { StudentsTable } from '@/components/students/StudentsTable'
import { CreateStudentDialog } from '@/components/students/CreateStudentDialog'
import { DeleteStudentDialog } from '@/components/students/DeleteStudentDialog'
import { StudentInfoDialog } from '@/components/students/StudentInfoDialog'
import { AssignRegularLessonsDialog } from '@/components/students/AssignRegularLessonsDialog'
import { studentsApi } from '@/api/students'
import { teachersApi } from '@/api/teachers'
import { useAuth } from '@/contexts/AuthContext'

export const Students = () => {
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [infoDialogOpen, setInfoDialogOpen] = useState(false)
  const [assignLessonsDialogOpen, setAssignLessonsDialogOpen] = useState(false)
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null)
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('')
  const [showAllStudents, setShowAllStudents] = useState(false)
  const { isAdmin, user } = useAuth()
  const queryClient = useQueryClient()

  const { data: teachers = [], isLoading: isTeachersLoading } = useQuery({
    queryKey: ['teachers', 'active'],
    queryFn: () => teachersApi.getAll('active'),
    enabled: isAdmin,
  })

	// Set default teacher to current admin when user and teachers are available
  useEffect(() => {
    if (isAdmin && user?.id && teachers.length > 0 && !selectedTeacherId) {
      // Find teacher that matches current user ID
      const matchingTeacher = teachers.find((teacher) => teacher.id === +user.id)
      if (matchingTeacher) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSelectedTeacherId(matchingTeacher.id.toString())
      }
    }
  }, [isAdmin, user?.id, teachers, selectedTeacherId])

	const filter = showAllStudents ? 'all' : 'active'

	const { data: students = [], isLoading: isStudentsLoading } = useQuery({
    queryKey: ['students', selectedTeacherId, filter],
    queryFn: () => studentsApi.getAll(selectedTeacherId || undefined, filter),
    enabled: !isAdmin || !!selectedTeacherId || selectedTeacherId === '',
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => studentsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] })
      setDeleteDialogOpen(false)
      setSelectedStudentId(null)
    },
  })

  const handleDeleteClick = (id: number) => {
    setSelectedStudentId(id)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = () => {
    if (selectedStudentId !== null) {
      deleteMutation.mutate(selectedStudentId)
    }
  }

  const handleInfoClick = (id: number) => {
    setSelectedStudentId(id)
    setInfoDialogOpen(true)
  }

  const handleAssignLessonsClick = (id: number) => {
    setSelectedStudentId(id)
    setAssignLessonsDialogOpen(true)
  }

  const selectedStudent = students.find((s) => s.id === selectedStudentId) || null

	if(isTeachersLoading || isStudentsLoading) {
		return <div className="flex h-64 items-center justify-center">
			<div className="text-muted-foreground">Загрузка...</div>
		</div>
	}
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold">Ученики</h1>
        {isAdmin && (
          <Button onClick={() => setCreateDialogOpen(true)} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Добавить ученика
          </Button>
        )}
      </div>

      <div className="flex items-center gap-4">
        {isAdmin && (
          <div className="flex items-center gap-2">
            <Label htmlFor="teacher-filter">Фильтр по преподавателю:</Label>
            <Select
              value={selectedTeacherId}
              onValueChange={setSelectedTeacherId}
            >
              <SelectTrigger id="teacher-filter" className="w-[200px]">
                <SelectValue placeholder="Выберите преподавателя" />
              </SelectTrigger>
              <SelectContent>
                {teachers.map((teacher) => (
                  <SelectItem key={teacher.id} value={teacher.id.toString()}>
                    {teacher.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="show-all-students"
            checked={showAllStudents}
            onChange={(e) => setShowAllStudents(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300"
          />
          <Label htmlFor="show-all-students" className="cursor-pointer">
            Показать всех учеников
          </Label>
        </div>
      </div>

      {isStudentsLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="text-muted-foreground">Загрузка...</div>
        </div>
      ) : (
        <StudentsTable
          students={students}
          onDelete={handleDeleteClick}
          onInfo={handleInfoClick}
          onAssignLessons={handleAssignLessonsClick}
          isDeleting={deleteMutation.isPending}
          showBalance={isAdmin}
          showActions={isAdmin}
        />
      )}

      <CreateStudentDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
      <DeleteStudentDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        student={selectedStudent}
        onConfirm={handleDeleteConfirm}
        isDeleting={deleteMutation.isPending}
      />
      <StudentInfoDialog
        open={infoDialogOpen}
        onOpenChange={setInfoDialogOpen}
        studentId={selectedStudentId}
      />
      <AssignRegularLessonsDialog
        open={assignLessonsDialogOpen}
        onOpenChange={setAssignLessonsDialogOpen}
        studentId={selectedStudentId}
      />
    </div>
  )
}


