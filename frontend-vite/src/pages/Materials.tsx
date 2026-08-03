import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CourseFormDialog } from '@/components/materials/CourseFormDialog'
import { CoursesTable } from '@/components/materials/CoursesTable'
import { DeleteCourseDialog } from '@/components/materials/DeleteCourseDialog'
import { materialsApi } from '@/api/materials'
import { useAuth } from '@/contexts/AuthContext'
import { showSuccessToast } from '@/lib/toast'
import type { Course } from '@/types'

export const Materials = () => {
  const { isAdmin } = useAuth()
  const queryClient = useQueryClient()
  const [formDialogOpen, setFormDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)

  const { data: courses = [], isLoading } = useQuery({
    queryKey: ['materials', 'courses'],
    queryFn: () => materialsApi.getCourses(),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => materialsApi.deleteCourse(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials', 'courses'] })
      showSuccessToast('Курс удалён')
      setDeleteDialogOpen(false)
      setSelectedCourse(null)
    },
  })

  const handleCreateCourseClick = () => {
    setSelectedCourse(null)
    setFormDialogOpen(true)
  }

  const handleEditClick = (course: Course) => {
    setSelectedCourse(course)
    setFormDialogOpen(true)
  }

  const handleDeleteClick = (course: Course) => {
    setSelectedCourse(course)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = () => {
    if (selectedCourse === null) return
    deleteMutation.mutate(selectedCourse.id)
  }

  const handleFormOpenChange = (open: boolean) => {
    setFormDialogOpen(open)
    if (!open) {
      setSelectedCourse(null)
    }
  }

  return (
    <div className="animate-screen-enter space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold">Материалы</h1>
        {isAdmin && (
          <Button
            onClick={handleCreateCourseClick}
            className="w-full sm:w-auto font-semibold"
            aria-label="Создать курс"
          >
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            Создать курс
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="text-muted-foreground">Загрузка...</div>
        </div>
      ) : courses.length === 0 ? (
        <p className="py-10 text-center text-muted-foreground">Курсы не найдены</p>
      ) : (
        <CoursesTable
          courses={courses}
          showActions={isAdmin}
          onEdit={handleEditClick}
          onDelete={handleDeleteClick}
          isDeleting={deleteMutation.isPending}
        />
      )}

      <CourseFormDialog
        open={formDialogOpen}
        onOpenChange={handleFormOpenChange}
        course={selectedCourse}
      />

      <DeleteCourseDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        course={selectedCourse}
        onConfirm={handleDeleteConfirm}
        isDeleting={deleteMutation.isPending}
      />
    </div>
  )
}
