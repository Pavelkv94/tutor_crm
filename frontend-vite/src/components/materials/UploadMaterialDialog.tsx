import { useEffect, useId, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { PDFDocument } from 'pdf-lib'
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

const COPYRIGHT_MARKER = 'English Stars School. All rights reserved.'

const buildCopyrightComment = (year: number): string => `<!-- 
© ${year} English Stars School. All rights reserved.
Owner: Anna Mintel.

This HTML file and its contents are the intellectual property of English Stars School.
Any reproduction, redistribution, or alteration without explicit written permission from the owner is prohibited.
-->
`

const buildCopyrightSubject = (year: number): string =>
  `© ${year} English Stars School. All rights reserved. Owner: Anna Mintel.`

const preparePdfFile = async (file: File): Promise<File> => {
  try {
    const arrayBuffer = await file.arrayBuffer()
    const pdfDoc = await PDFDocument.load(arrayBuffer)

    const existingSubject = pdfDoc.getSubject() ?? ''
    if (existingSubject.includes(COPYRIGHT_MARKER)) return file

    const year = new Date().getFullYear()
    pdfDoc.setProducer('English Stars School')
    pdfDoc.setCreator('English Stars School')
    pdfDoc.setSubject(buildCopyrightSubject(year))
    pdfDoc.setKeywords(['English Stars School', 'confidential'])

    const pdfBytes = await pdfDoc.save()
    const buffer = pdfBytes.buffer.slice(
      pdfBytes.byteOffset,
      pdfBytes.byteOffset + pdfBytes.byteLength,
    ) as ArrayBuffer
    return new File([buffer], file.name, { type: 'application/pdf', lastModified: Date.now() })
  } catch {
    // Если PDF не удаётся обработать (шифрование, повреждение и т.п.) — загружаем как есть
    return file
  }
}

const prepareUploadFile = async (file: File, contentType: string): Promise<File> => {
  if (contentType === 'application/pdf') {
    return preparePdfFile(file)
  }

  if (contentType !== 'text/html') return file

  const text = await file.text()
  if (text.includes(COPYRIGHT_MARKER)) return file

  const year = new Date().getFullYear()
  const blob = new Blob([buildCopyrightComment(year) + text], { type: 'text/html' })
  return new File([blob], file.name, { type: 'text/html', lastModified: Date.now() })
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

  const { data: courseAccessTeachers = [] } = useQuery({
    queryKey: ['materials', 'courses', courseId, 'access'],
    queryFn: () => materialsApi.getCourseAccess(courseId),
    enabled: open,
  })

  // Преподаватели с доступом к курсу получают новый файл автоматически, поэтому в списке их нет
  const courseAccessTeacherIds = new Set(courseAccessTeachers.map((teacher) => teacher.id))
  const accessTeachers = teachers.filter(
    (teacher) => teacher.role !== 'ADMIN' && !courseAccessTeacherIds.has(teacher.id),
  )

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

      const uploadFile = await prepareUploadFile(file, contentType)

      const initResponse = await materialsApi.uploadInit({
        courseId,
        teachers: teacherIds,
        fileName: uploadFile.name,
        mimeType: contentType,
        contentType,
        sizeBytes: uploadFile.size,
      })

      await materialsApi.uploadToR2(initResponse.uploadUrl, uploadFile, contentType)
      await materialsApi.uploadComplete(initResponse.materialId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials', 'courses', courseId, 'materials'] })
      queryClient.invalidateQueries({ queryKey: ['materials', 'size'] })
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
              {courseAccessTeachers.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Преподаватели с доступом к курсу ({courseAccessTeachers.length}) получат файл
                  автоматически.
                </p>
              )}
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
