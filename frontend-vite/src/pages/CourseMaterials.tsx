import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Search, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DeleteMaterialDialog } from '@/components/materials/DeleteMaterialDialog'
import { MaterialAccessDialog } from '@/components/materials/MaterialAccessDialog'
import { MaterialsTable } from '@/components/materials/MaterialsTable'
import { RenameMaterialDialog } from '@/components/materials/RenameMaterialDialog'
import { UploadMaterialDialog } from '@/components/materials/UploadMaterialDialog'
import { materialsApi } from '@/api/materials'
import { useAuth } from '@/contexts/AuthContext'
import { showSuccessToast } from '@/lib/toast'
import type { Material } from '@/types'

export const CourseMaterials = () => {
  const { courseId } = useParams<{ courseId: string }>()
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const queryClient = useQueryClient()
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [accessDialogOpen, setAccessDialogOpen] = useState(false)
  const [renameDialogOpen, setRenameDialogOpen] = useState(false)
  const [selectedMaterialId, setSelectedMaterialId] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
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

  const selectedMaterial =
    selectedMaterialId === null
      ? null
      : materials.find((material) => material.id === selectedMaterialId) ?? null

  const normalizedSearchQuery = searchQuery.trim().toLowerCase()
  const filteredMaterials = normalizedSearchQuery
    ? materials.filter((material) =>
        material.originalName.toLowerCase().includes(normalizedSearchQuery),
      )
    : materials

  const deleteMutation = useMutation({
    mutationFn: (id: number) => materialsApi.deleteMaterial(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials', 'courses', parsedCourseId, 'materials'] })
      queryClient.invalidateQueries({ queryKey: ['materials', 'size'] })
      showSuccessToast('Материал удалён')
      setDeleteDialogOpen(false)
      setSelectedMaterialId(null)
    },
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

  const handleDeleteClick = (material: Material) => {
    setSelectedMaterialId(material.id)
    setDeleteDialogOpen(true)
  }

  const handleAccessClick = (material: Material) => {
    setSelectedMaterialId(material.id)
    setAccessDialogOpen(true)
  }

  const handleRenameClick = (material: Material) => {
    setSelectedMaterialId(material.id)
    setRenameDialogOpen(true)
  }

  const handleDeleteConfirm = () => {
    if (selectedMaterialId === null) return
    deleteMutation.mutate(selectedMaterialId)
  }

  const handleAccessOpenChange = (open: boolean) => {
    setAccessDialogOpen(open)
    if (!open) {
      setSelectedMaterialId(null)
    }
  }

  const handleRenameOpenChange = (open: boolean) => {
    setRenameDialogOpen(open)
    if (!open) {
      setSelectedMaterialId(null)
    }
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

      <div className="relative w-full sm:max-w-sm">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Поиск по названию"
          aria-label="Поиск материалов по названию"
          className="pl-9"
        />
      </div>

      {isMaterialsLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="text-muted-foreground">Загрузка...</div>
        </div>
      ) : materials.length === 0 ? (
        <p className="py-10 text-center text-muted-foreground">Материалы не найдены</p>
      ) : filteredMaterials.length === 0 ? (
        <p className="py-10 text-center text-muted-foreground">
          Ничего не найдено по запросу «{searchQuery.trim()}»
        </p>
      ) : (
        <MaterialsTable
          materials={filteredMaterials}
          onOpen={handleOpenMaterial}
          showActions={isAdmin}
          onAccess={handleAccessClick}
          onRename={handleRenameClick}
          onDelete={handleDeleteClick}
          isDeleting={deleteMutation.isPending}
        />
      )}

      <UploadMaterialDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        courseId={course.id}
      />

      <DeleteMaterialDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        material={selectedMaterial}
        onConfirm={handleDeleteConfirm}
        isDeleting={deleteMutation.isPending}
      />

      <RenameMaterialDialog
        open={renameDialogOpen}
        onOpenChange={handleRenameOpenChange}
        material={selectedMaterial}
        courseId={course.id}
      />

      <MaterialAccessDialog
        open={accessDialogOpen}
        onOpenChange={handleAccessOpenChange}
        material={selectedMaterial}
        courseId={course.id}
      />
    </div>
  )
}
