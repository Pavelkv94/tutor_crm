import { useState } from 'react'
import { format } from 'date-fns'
import { ArrowUpDown, Trash2, Pencil } from 'lucide-react'
import { Cake } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Student } from '@/types'

interface StudentsTableProps {
  students: Student[]
  onDelete: (id: number) => void
  onEdit: (id: number) => void
  onAssignLessons: (id: number) => void
  onReport: (id: number) => void
  isDeleting: boolean
  showBalance?: boolean
  showActions?: boolean
}

type SortField = 'name' | 'class' | 'birth_date'
type SortDirection = 'asc' | 'desc'

export const StudentsTable = ({
  students,
  onDelete,
  onEdit,
  onAssignLessons,
  onReport,
  isDeleting,
  showBalance = false,
  showActions = false,
}: StudentsTableProps) => {
  const [sortField, setSortField] = useState<SortField | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const isBirthdayToday = (birthDate: string | null | undefined): boolean => {
    if (!birthDate) return false
    const today = new Date()
    const birth = new Date(birthDate)
    return birth.getMonth() === today.getMonth() && birth.getDate() === today.getDate()
  }

  const sortedStudents = [...students].sort((a, b) => {
    if (!sortField) return 0

    let aValue: string | number
    let bValue: string | number

    if (sortField === 'name') {
      aValue = a.name.toLowerCase()
      bValue = b.name.toLowerCase()
    } else if (sortField === 'class') {
      aValue = a.class
      bValue = b.class
    } else {
      // Handle null birth_date - put null dates at the end
      aValue = a.birth_date ? new Date(a.birth_date).getTime() : Number.MAX_SAFE_INTEGER
      bValue = b.birth_date ? new Date(b.birth_date).getTime() : Number.MAX_SAFE_INTEGER
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
    return 0
  })

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-2"
                onClick={() => handleSort('name')}
              >
                Имя
                <ArrowUpDown className="h-4 w-4" />
              </Button>
            </TableHead>
            <TableHead>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-2"
                onClick={() => handleSort('class')}
              >
                Класс
                <ArrowUpDown className="h-4 w-4" />
              </Button>
            </TableHead>
            <TableHead>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-2"
                onClick={() => handleSort('birth_date')}
              >
                Дата рождения
                <ArrowUpDown className="h-4 w-4" />
              </Button>
            </TableHead>
            {showBalance && <TableHead>Баланс</TableHead>}
            <TableHead>Дата создания</TableHead>
            <TableHead>Дата архивации</TableHead>
            <TableHead className="text-right">Действия</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedStudents.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={
                  showBalance ? 7 : 5
                }
                className="text-center text-muted-foreground"
              >
                Ученики не найдены
              </TableCell>
            </TableRow>
          ) : (
            sortedStudents.map((student) => {
              const isDeleted = !!student.deleted_at
              const hasBirthdayToday = isBirthdayToday(student.birth_date)
              return (
                <TableRow key={student.id}>
                  <TableCell className={cn("font-medium", isDeleted && "opacity-50")}>
                    <div className="flex items-center gap-2">
                      {hasBirthdayToday && (
                        <Cake className="h-4 w-4 text-pink-500" title="День рождения сегодня!" />
                      )}
                      {student.name}
                    </div>
                  </TableCell>
                  <TableCell className={cn(isDeleted && "opacity-50")}>
                    {student.class}
                  </TableCell>
                  <TableCell className={cn(isDeleted && "opacity-50")}>
                    {student.birth_date
                      ? format(new Date(student.birth_date), 'MMM dd, yyyy')
                      : '-'}
                  </TableCell>
                  {showBalance && (
                    <TableCell className={cn(isDeleted && "opacity-50")}>
                      {student.balance !== undefined ? student.balance : '-'}
                    </TableCell>
                  )}
                  <TableCell className={cn(isDeleted && "opacity-50")}>
                    {student.created_at
                      ? format(new Date(student.created_at), 'MMM dd, yyyy')
                      : '-'}
                  </TableCell>
                  <TableCell className={cn(isDeleted && "opacity-50")}>
                    {student.deleted_at
                      ? format(new Date(student.deleted_at), 'MMM dd, yyyy')
                      : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onReport(student.id)}
                        className="border-orange-500 text-orange-500 hover:bg-orange-50 hover:text-orange-600"
                      >
                        Отчет
                      </Button>
                      {showActions && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onAssignLessons(student.id)}
                          disabled={isDeleted}
                          className="border-green-500 text-green-500 hover:bg-green-50 hover:text-green-600 disabled:opacity-50"
                        >
                          Регулярные занятия
                        </Button>
                      )}
                      {showActions && !isDeleted && (
                        <>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => onEdit(student.id)}
                            className="border-purple-500 text-purple-500 hover:bg-purple-50 hover:text-purple-600"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => onDelete(student.id)}
                            disabled={isDeleting}
                            className="border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>
    </div>
  )
}

