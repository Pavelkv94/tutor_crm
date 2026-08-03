import { useState } from 'react'
import {
  ArrowUpDown,
  CheckCircle2,
  FileCode2,
  FileText,
  Loader2,
  XCircle,
} from 'lucide-react'
import { format } from 'date-fns'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { Material, MaterialFileType, MaterialUploadStatus } from '@/types'

interface MaterialsTableProps {
  materials: Material[]
  onOpen: (material: Material) => void
}

type SortField = 'originalName' | 'type' | 'sizeBytes' | 'created_at' | 'status'
type SortDirection = 'asc' | 'desc'

const headerCellClass =
  'h-auto px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-foreground'

const STATUS_ORDER: Record<MaterialUploadStatus, number> = {
  UPLOADED: 0,
  UPLOADING: 1,
  FAILED: 2,
}

const formatFileSize = (sizeBytes: number): string => {
  if (sizeBytes < 1024) return `${sizeBytes} Б`
  if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(1)} КБ`
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} МБ`
}

const formatMaterialDate = (date: string): string => {
  return format(new Date(date), 'dd.MM.yyyy HH:mm')
}

const getTypeLabel = (type: MaterialFileType): string => {
  if (type === 'PDF') return 'PDF'
  if (type === 'HTML') return 'HTML'
  return type
}

const getStatusLabel = (status: MaterialUploadStatus): string => {
  if (status === 'UPLOADED') return 'Загружен'
  if (status === 'UPLOADING') return 'Загружается'
  if (status === 'FAILED') return 'Ошибка'
  return status
}

const TypeIcon = ({ type }: { type: MaterialFileType }) => {
  if (type === 'HTML') {
    return <FileCode2 className="h-4 w-4 text-accent-foreground" aria-hidden="true" />
  }

  return <FileText className="h-4 w-4 text-accent-foreground" aria-hidden="true" />
}

const StatusIcon = ({ status }: { status: MaterialUploadStatus }) => {
  const label = getStatusLabel(status)

  if (status === 'UPLOADED') {
    return (
      <span title={label} aria-label={label} className="inline-flex">
        <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-hidden="true" />
      </span>
    )
  }

  if (status === 'UPLOADING') {
    return (
      <span title={label} aria-label={label} className="inline-flex">
        <Loader2 className="h-5 w-5 animate-spin text-amber-500" aria-hidden="true" />
      </span>
    )
  }

  return (
    <span title={label} aria-label={label} className="inline-flex">
      <XCircle className="h-5 w-5 text-red-500" aria-hidden="true" />
    </span>
  )
}

export const MaterialsTable = ({ materials, onOpen }: MaterialsTableProps) => {
  const [sortField, setSortField] = useState<SortField | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
      return
    }

    setSortField(field)
    setSortDirection('asc')
  }

  const sortedMaterials = [...materials].sort((a, b) => {
    if (!sortField) return 0

    let aValue: string | number
    let bValue: string | number

    if (sortField === 'originalName') {
      aValue = a.originalName.toLowerCase()
      bValue = b.originalName.toLowerCase()
    } else if (sortField === 'type') {
      aValue = a.type
      bValue = b.type
    } else if (sortField === 'sizeBytes') {
      aValue = a.sizeBytes
      bValue = b.sizeBytes
    } else if (sortField === 'status') {
      aValue = STATUS_ORDER[a.status]
      bValue = STATUS_ORDER[b.status]
    } else {
      aValue = new Date(a.created_at).getTime()
      bValue = new Date(b.created_at).getTime()
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
    return 0
  })

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-border bg-secondary hover:bg-secondary">
              <TableHead className={headerCellClass}>
                <button
                  type="button"
                  onClick={() => handleSort('originalName')}
                  className="inline-flex items-center gap-1.5 uppercase tracking-wider transition-colors hover:text-foreground"
                  aria-label="Сортировать по названию"
                >
                  Название
                  <ArrowUpDown className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </TableHead>
              <TableHead className={headerCellClass}>
                <button
                  type="button"
                  onClick={() => handleSort('type')}
                  className="inline-flex items-center gap-1.5 uppercase tracking-wider transition-colors hover:text-foreground"
                  aria-label="Сортировать по типу"
                >
                  Тип
                  <ArrowUpDown className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </TableHead>
              <TableHead className={headerCellClass}>
                <button
                  type="button"
                  onClick={() => handleSort('sizeBytes')}
                  className="inline-flex items-center gap-1.5 uppercase tracking-wider transition-colors hover:text-foreground"
                  aria-label="Сортировать по размеру"
                >
                  Размер
                  <ArrowUpDown className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </TableHead>
              <TableHead className={headerCellClass}>
                <button
                  type="button"
                  onClick={() => handleSort('status')}
                  className="inline-flex items-center gap-1.5 uppercase tracking-wider transition-colors hover:text-foreground"
                  aria-label="Сортировать по статусу"
                >
                  Статус
                  <ArrowUpDown className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </TableHead>
              <TableHead className={headerCellClass}>
                <button
                  type="button"
                  onClick={() => handleSort('created_at')}
                  className="inline-flex items-center gap-1.5 uppercase tracking-wider transition-colors hover:text-foreground"
                  aria-label="Сортировать по дате загрузки"
                >
                  Загружен
                  <ArrowUpDown className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedMaterials.map((material) => (
              <TableRow key={material.id} className="border-b border-border bg-card hover:bg-card">
                <TableCell className="px-5 py-4 font-extrabold text-foreground">
                  <div className="flex items-center gap-2">
                    <TypeIcon type={material.type} />
                    {material.status === 'UPLOADED' ? (
                      <button
                        type="button"
                        onClick={() => onOpen(material)}
                        className="truncate rounded-sm text-left text-foreground transition-colors hover:text-accent-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label={`Открыть материал ${material.originalName}`}
                      >
                        {material.originalName}
                      </button>
                    ) : (
                      <span className="truncate text-muted-foreground">{material.originalName}</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="px-5 py-4 font-medium">
                  {getTypeLabel(material.type)}
                </TableCell>
                <TableCell className="px-5 py-4 text-muted-foreground">
                  {formatFileSize(material.sizeBytes)}
                </TableCell>
                <TableCell className="px-5 py-4">
                  <StatusIcon status={material.status} />
                </TableCell>
                <TableCell className="px-5 py-4 text-muted-foreground">
                  {formatMaterialDate(material.created_at)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
