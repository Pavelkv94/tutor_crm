import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MaterialsTable } from '@/components/materials/MaterialsTable'
import { UploadMaterialDialog } from '@/components/materials/UploadMaterialDialog'
import { materialsApi } from '@/api/materials'
import { useAuth } from '@/contexts/AuthContext'
import type { Material } from '@/types'

export const CourseMaterials = () => {
  const { courseId } = useParams<{ courseId: string }>()
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const parsedCourseId = Number(courseId)

  const { data: courses = [], isLoading: isCoursesLoading } = useQuery({
    queryKey: ['materials', 'courses'],
    queryFn: () => materialsApi.getCourses(),
  })

  const course = courses.find((item) => item.id === parsedCourseId)

  const {
    data: materials = [],
    isLoading: isMaterialsLoading,
  } = useQuery({
    queryKey: ['materials', 'courses', parsedCourseId, 'materials'],
    queryFn: () => materialsApi.getCourseMaterials(parsedCourseId),
    enabled: !!course,
  })

  const handleBackClick = () => {
    navigate('/materials')
  }

  const handleUploadClick = () => {
    setUploadDialogOpen(true)
  }

  const handleOpenMaterial = (material: Material) => {
    const viewerUrl = `/materials/view/${material.id}?name=${encodeURIComponent(material.originalName)}`
    window.open(viewerUrl, '_blank', 'noopener,noreferrer')
  }

  if (isCoursesLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-muted-foreground">Загрузка...</div>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleBackClick}
            aria-label="Назад к курсам"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </Button>
          <h1 className="text-2xl sm:text-3xl font-bold">Курс не найден</h1>
        </div>
        <p className="text-muted-foreground">
          Курс не существует или был удалён.{' '}
          <Link to="/materials" className="text-accent-foreground underline hover:no-underline">
            Вернуться к списку курсов
          </Link>
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleBackClick}
            aria-label="Назад к курсам"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </Button>
          <h1 className="text-2xl sm:text-3xl font-bold">{course.name}</h1>
        </div>
        {isAdmin && (
          <Button
            onClick={handleUploadClick}
            className="w-full sm:w-auto font-semibold"
            aria-label="Загрузить материал"
          >
            <Upload className="mr-2 h-4 w-4" aria-hidden="true" />
            Загрузить материал
          </Button>
        )}
      </div>

      {isMaterialsLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="text-muted-foreground">Загрузка...</div>
        </div>
      ) : materials.length === 0 ? (
        <p className="py-10 text-center text-muted-foreground">Материалы не найдены</p>
      ) : (
        <MaterialsTable materials={materials} onOpen={handleOpenMaterial} />
      )}

      <UploadMaterialDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        courseId={course.id}
      />
    </div>
  )
}
