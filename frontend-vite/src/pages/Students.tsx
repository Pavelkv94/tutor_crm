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
import { EditStudentDialog } from '@/components/students/EditStudentDialog'
import { DeleteStudentDialog } from '@/components/students/DeleteStudentDialog'
import { AssignRegularLessonsDialog } from '@/components/students/AssignRegularLessonsDialog'
import { StudentReportDialog } from '@/components/students/StudentReportDialog'
import { studentsApi } from '@/api/students'
import { teachersApi } from '@/api/teachers'
import { useAuth } from '@/contexts/AuthContext'

export const Students = () => {
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [assignLessonsDialogOpen, setAssignLessonsDialogOpen] = useState(false)
  const [reportDialogOpen, setReportDialogOpen] = useState(false)
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null)
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('')
  const [filter, setFilter] = useState<'all' | 'active' | 'deleted'>('active')
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

  const handleEditClick = (id: number) => {
    setSelectedStudentId(id)
    setEditDialogOpen(true)
  }

  const handleAssignLessonsClick = (id: number) => {
    setSelectedStudentId(id)
    setAssignLessonsDialogOpen(true)
  }

  const handleReportClick = (id: number) => {
    setSelectedStudentId(id)
    setReportDialogOpen(true)
  }

  const handleDownloadClick = async () => {
    try {
      await studentsApi.downloadStudents(
        filter,
        isAdmin ? selectedTeacherId : undefined
      )
    } catch (error) {
      console.error('Failed to download students:', error)
    }
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
          <Label htmlFor="student-filter">Фильтр:</Label>
          <Select value={filter} onValueChange={(value: 'all' | 'active' | 'deleted') => setFilter(value)}>
            <SelectTrigger id="student-filter" className="w-[180px]">
              <SelectValue placeholder="Выберите фильтр" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все</SelectItem>
              <SelectItem value="active">Активные</SelectItem>
              <SelectItem value="deleted">Архивные</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end">
          <Button 
            onClick={handleDownloadClick} 
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            Скачать
          </Button>
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
          onEdit={handleEditClick}
          onAssignLessons={handleAssignLessonsClick}
          onReport={handleReportClick}
          isDeleting={deleteMutation.isPending}
          showBalance={isAdmin}
          showActions={isAdmin}
        />
      )}

      <CreateStudentDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
      <EditStudentDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        studentId={selectedStudentId}
      />
      <DeleteStudentDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        student={selectedStudent}
        onConfirm={handleDeleteConfirm}
        isDeleting={deleteMutation.isPending}
      />
      <AssignRegularLessonsDialog
        open={assignLessonsDialogOpen}
        onOpenChange={setAssignLessonsDialogOpen}
        studentId={selectedStudentId}
      />
      <StudentReportDialog
        open={reportDialogOpen}
        onOpenChange={setReportDialogOpen}
        studentId={selectedStudentId}
      />
    </div>
  )
}


