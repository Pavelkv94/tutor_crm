import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CourseAccessDialog } from '@/components/materials/CourseAccessDialog'
import { CourseFormDialog } from '@/components/materials/CourseFormDialog'
import { CoursesTable } from '@/components/materials/CoursesTable'
import { DeleteCourseDialog } from '@/components/materials/DeleteCourseDialog'
import { materialsApi } from '@/api/materials'
import { useAuth } from '@/contexts/AuthContext'
import { showSuccessToast } from '@/lib/toast'
import type { Course } from '@/types'

const formatTotalSize = (sizeBytes: number): string => {
  if (sizeBytes < 1024) return `${sizeBytes} Б`
  if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(1)} КБ`
  if (sizeBytes < 1024 * 1024 * 1024) return `${(sizeBytes / (1024 * 1024)).toFixed(1)} МБ`
  return `${(sizeBytes / (1024 * 1024 * 1024)).toFixed(1)} ГБ`
}

export const Materials = () => {
  const { isAdmin } = useAuth()
  const queryClient = useQueryClient()
  const [formDialogOpen, setFormDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [accessDialogOpen, setAccessDialogOpen] = useState(false)
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)

  const { data: courses = [], isLoading } = useQuery({
    queryKey: ['materials', 'courses'],
    queryFn: () => materialsApi.getCourses(),
  })

  const { data: materialsSize, isLoading: isSizeLoading } = useQuery({
    queryKey: ['materials', 'size'],
    queryFn: () => materialsApi.getMaterialsSize(),
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

  const handleAccessClick = (course: Course) => {
    setSelectedCourse(course)
    setAccessDialogOpen(true)
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

  const handleAccessOpenChange = (open: boolean) => {
    setAccessDialogOpen(open)
    if (!open) {
      setSelectedCourse(null)
    }
  }

  return (
    <div className="animate-screen-enter space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold">Материалы</h1>
        <div className="flex w-full sm:w-auto flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
          <p className="text-sm text-muted-foreground">
            Общий размер:{' '}
            <span className="font-semibold text-foreground">
              {isSizeLoading ? '...' : formatTotalSize(materialsSize?.totalSizeBytes ?? 0)}
            </span>
          </p>
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
          onAccess={handleAccessClick}
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

      <CourseAccessDialog
        open={accessDialogOpen}
        onOpenChange={handleAccessOpenChange}
        course={selectedCourse}
      />
    </div>
  )
}
