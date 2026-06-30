import { Edit, Trash2, Link, BarChart } from 'lucide-react'
import { format } from 'date-fns'
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
import { RegionDisplay } from '@/components/shared/RegionDisplay'
import { useAuth } from '@/contexts/AuthContext'
import type { Teacher } from '@/types'

interface TeachersTableProps {
  teachers: Teacher[]
  onEdit: (id: number) => void
  onDelete: (id: number) => void
  onGenerateTelegramLink: (id: number) => void
  onSalaryReport: (id: number) => void
}

const headerCellClass =
  'h-auto px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-foreground'

const bodyCellClass = 'px-5 py-4'

const formatTeacherDate = (date: string | null | undefined): string => {
  if (!date) return '—'
  return format(new Date(date), 'dd.MM.yyyy')
}

const getRoleLabel = (role: string): string => {
  if (role === 'ADMIN') return 'Администратор'
  if (role === 'TEACHER') return 'Преподаватель'
  return role
}

export const TeachersTable = ({
  teachers,
  onEdit,
  onDelete,
  onGenerateTelegramLink,
  onSalaryReport,
}: TeachersTableProps) => {
  const { user } = useAuth()

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-border bg-secondary hover:bg-secondary">
              <TableHead className={headerCellClass}>Имя</TableHead>
              <TableHead className={headerCellClass}>Логин</TableHead>
              <TableHead className={headerCellClass}>Ссылка Telegram</TableHead>
              <TableHead className={headerCellClass}>Регион</TableHead>
              <TableHead className={headerCellClass}>Роль</TableHead>
              <TableHead className={headerCellClass}>Архивация</TableHead>
              <TableHead className={cn(headerCellClass, 'text-right')}>Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {teachers.length === 0 ? (
              <TableRow className="border-b-0 hover:bg-card">
                <TableCell colSpan={7} className="px-5 py-10 text-center text-muted-foreground">
                  Преподаватели не найдены
                </TableCell>
              </TableRow>
            ) : (
              teachers.map((teacher) => {
                const isDeleted = !!teacher.deleted_at
                const telegramLink = teacher.telegrams?.[0]?.username
                  ? `https://t.me/${teacher.telegrams[0].username}`
                  : null
                const isCurrentUser = user && teacher.id === parseInt(user.id, 10)

                return (
                  <TableRow
                    key={teacher.id}
                    className={cn(
                      'border-b border-border bg-card hover:bg-card',
                      isDeleted && 'opacity-45',
                    )}
                  >
                    <TableCell className={cn(bodyCellClass, 'font-extrabold text-foreground')}>
                      {teacher.name}
                    </TableCell>
                    <TableCell className={cn(bodyCellClass, 'font-medium')}>
                      {teacher.login}
                    </TableCell>
                    <TableCell className={bodyCellClass}>
                      {telegramLink ? (
                        <a
                          href={telegramLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-accent-foreground hover:underline"
                        >
                          {telegramLink}
                        </a>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className={bodyCellClass}>
                      <RegionDisplay region={teacher.timezone} />
                    </TableCell>
                    <TableCell className={cn(bodyCellClass, 'font-medium')}>
                      {getRoleLabel(teacher.role)}
                    </TableCell>
                    <TableCell className={cn(bodyCellClass, 'text-muted-foreground')}>
                      {formatTeacherDate(teacher.deleted_at)}
                    </TableCell>
                    <TableCell className={cn(bodyCellClass, 'text-right')}>
                      {!isDeleted && (
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => onSalaryReport(teacher.id)}
                            title="Рассчёт зарплаты"
                            aria-label={`Рассчёт зарплаты для ${teacher.name}`}
                            className="h-9 w-9 rounded-lg border-primary bg-card text-[hsl(45_90%_38%)] hover:bg-primary/10"
                          >
                            <BarChart className="h-4 w-4" aria-hidden="true" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => onGenerateTelegramLink(teacher.id)}
                            title="Сгенерировать ссылку Telegram"
                            aria-label={`Сгенерировать ссылку Telegram для ${teacher.name}`}
                            className="h-9 w-9 rounded-lg border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80"
                          >
                            <Link className="h-4 w-4" aria-hidden="true" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => onEdit(teacher.id)}
                            title="Редактировать"
                            aria-label={`Редактировать преподавателя ${teacher.name}`}
                            className="h-9 w-9 rounded-lg border-border bg-card text-accent-foreground hover:bg-accent hover:text-accent-foreground"
                          >
                            <Edit className="h-4 w-4" aria-hidden="true" />
                          </Button>
                          {!isCurrentUser && (
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => onDelete(teacher.id)}
                              title="Удалить"
                              aria-label={`Удалить преподавателя ${teacher.name}`}
                              className="h-9 w-9 rounded-lg border-red-200 bg-card text-red-500 hover:border-red-300 hover:bg-red-50 hover:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" aria-hidden="true" />
                            </Button>
                          )}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
