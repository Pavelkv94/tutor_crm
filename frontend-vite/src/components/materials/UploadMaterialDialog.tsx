import { useEffect, useId, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { Upload } from 'lucide-react'
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
import { TeacherMultiSelect } from '@/components/materials/TeacherMultiSelect'
import { materialsApi } from '@/api/materials'
import { teachersApi } from '@/api/teachers'
import { showErrorToast, showSuccessToast } from '@/lib/toast'

const ACCEPTED_EXTENSIONS = ['.html', '.htm', '.pdf'] as const
const ACCEPTED_MIME_TYPES = ['text/html', 'application/pdf'] as const
const FILE_ACCEPT = '.html,.htm,.pdf,text/html,application/pdf'

const resolveContentType = (file: File): string | null => {
  if (ACCEPTED_MIME_TYPES.includes(file.type as (typeof ACCEPTED_MIME_TYPES)[number])) {
    return file.type
  }

  const fileName = file.name.toLowerCase()
  if (fileName.endsWith('.pdf')) return 'application/pdf'
  if (fileName.endsWith('.html') || fileName.endsWith('.htm')) return 'text/html'

  return null
}

const isAcceptedMaterialFile = (file: File): boolean => {
  const fileName = file.name.toLowerCase()
  const hasAcceptedExtension = ACCEPTED_EXTENSIONS.some((extension) =>
    fileName.endsWith(extension),
  )

  return hasAcceptedExtension && resolveContentType(file) !== null
}

interface UploadMaterialDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  courseId: number
}

export const UploadMaterialDialog = ({
  open,
  onOpenChange,
  courseId,
}: UploadMaterialDialogProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<number[]>([])
  const [fileError, setFileError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const fileInputId = useId()
  const queryClient = useQueryClient()

  const { data: teachers = [], isLoading: isTeachersLoading } = useQuery({
    queryKey: ['teachers', 'active'],
    queryFn: () => teachersApi.getAll('active'),
    enabled: open,
  })

  const accessTeachers = teachers.filter((teacher) => teacher.role !== 'ADMIN')

  const uploadMutation = useMutation({
    mutationFn: async ({
      file,
      teacherIds,
    }: {
      file: File
      teacherIds: number[]
    }) => {
      const contentType = resolveContentType(file)
      if (!contentType) {
        throw new Error('Можно загружать только HTML и PDF файлы')
      }

      const initResponse = await materialsApi.uploadInit({
        courseId,
        teachers: teacherIds,
        fileName: file.name,
        mimeType: contentType,
        contentType,
        sizeBytes: file.size,
      })

      await materialsApi.uploadToR2(initResponse.uploadUrl, file, contentType)
      await materialsApi.uploadComplete(initResponse.materialId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials', 'courses', courseId, 'materials'] })
      showSuccessToast('Материал загружен')
      onOpenChange(false)
    },
    onError: (error: unknown) => {
      if (axios.isAxiosError(error)) return

      const message =
        error instanceof Error ? error.message : 'Не удалось загрузить материал'

      showErrorToast({
        statusCode: 0,
        path: '/materials/upload',
        message,
      })
    },
  })

  useEffect(() => {
    if (!open) {
      setSelectedFile(null)
      setSelectedTeacherIds([])
      setFileError(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }, [open])

  const handleOpenChange = (nextOpen: boolean) => {
    if (uploadMutation.isPending) return
    onOpenChange(nextOpen)
  }

  const handleChooseFileClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null

    if (!file) {
      setSelectedFile(null)
      setFileError(null)
      return
    }

    if (!isAcceptedMaterialFile(file)) {
      setSelectedFile(null)
      setFileError('Можно загружать только HTML и PDF файлы')
      event.target.value = ''
      return
    }

    setSelectedFile(file)
    setFileError(null)
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!selectedFile || !isAcceptedMaterialFile(selectedFile)) return

    uploadMutation.mutate({
      file: selectedFile,
      teacherIds: selectedTeacherIds,
    })
  }

  const isSubmitDisabled = !selectedFile || uploadMutation.isPending

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Загрузить материал</DialogTitle>
          <DialogDescription>
            Выберите HTML или PDF файл и преподавателей, которым будет предоставлен доступ.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor={fileInputId}>Файл (HTML, PDF)</Label>
              <input
                ref={fileInputRef}
                id={fileInputId}
                type="file"
                accept={FILE_ACCEPT}
                className="sr-only"
                onChange={handleFileChange}
                tabIndex={-1}
                disabled={uploadMutation.isPending}
              />
              <div className="flex gap-2">
                <Input
                  value={selectedFile?.name ?? ''}
                  placeholder="Файл не выбран"
                  disabled
                  readOnly
                  aria-label="Имя выбранного файла"
                  aria-invalid={!!fileError}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleChooseFileClick}
                  aria-label="Выбрать HTML или PDF файл"
                  disabled={uploadMutation.isPending}
                >
                  <Upload className="mr-2 h-4 w-4" aria-hidden="true" />
                  Выбрать
                </Button>
              </div>
              {fileError && (
                <p className="text-sm text-destructive" role="alert">
                  {fileError}
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <Label>Доступ преподавателям</Label>
              <TeacherMultiSelect
                teachers={accessTeachers}
                selectedIds={selectedTeacherIds}
                onChange={setSelectedTeacherIds}
                isLoading={isTeachersLoading}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={uploadMutation.isPending}
            >
              Отмена
            </Button>
            <Button type="submit" disabled={isSubmitDisabled}>
              {uploadMutation.isPending ? 'Загрузка...' : 'Загрузить'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
