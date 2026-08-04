import { Pencil, Trash2, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import type { Course } from '@/types'

interface CoursesTableProps {
  courses: Course[]
  showActions: boolean
  onEdit: (course: Course) => void
  onDelete: (course: Course) => void
  onAccess: (course: Course) => void
  isDeleting: boolean
}

export const CoursesTable = ({
  courses,
  showActions,
  onEdit,
  onDelete,
  onAccess,
  isDeleting,
}: CoursesTableProps) => {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-border bg-secondary hover:bg-secondary">
              <TableHead className="h-auto px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Название
              </TableHead>
              {showActions && (
                <TableHead className="h-auto w-36 px-5 py-3.5 text-right text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Действия
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {courses.map((course) => (
              <TableRow key={course.id} className="border-b border-border bg-card hover:bg-card">
                <TableCell className="px-5 py-4 font-extrabold text-foreground">
                  <Link
                    to={`/materials/${course.id}`}
                    className="rounded-sm text-foreground transition-colors hover:text-accent-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={`Открыть материалы курса ${course.name}`}
                  >
                    {course.name}
                  </Link>
                </TableCell>
                {showActions && (
                  <TableCell className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => onAccess(course)}
                        title="Доступы"
                        aria-label={`Управление доступами курса ${course.name}`}
                        className="h-9 w-9 rounded-lg border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80"
                      >
                        <Users className="h-4 w-4" aria-hidden="true" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => onEdit(course)}
                        title="Редактировать"
                        aria-label={`Редактировать курс ${course.name}`}
                        className="h-9 w-9 rounded-lg border-border bg-card text-accent-foreground hover:bg-accent hover:text-accent-foreground"
                      >
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => onDelete(course)}
                        disabled={isDeleting}
                        title="Удалить"
                        aria-label={`Удалить курс ${course.name}`}
                        className="h-9 w-9 rounded-lg border-red-200 bg-card text-red-500 hover:border-red-300 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
