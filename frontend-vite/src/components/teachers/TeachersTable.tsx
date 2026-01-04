import { Edit, Trash2 } from 'lucide-react'
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
import type { Teacher } from '@/types'

interface TeachersTableProps {
  teachers: Teacher[]
  onEdit: (id: number) => void
  onDelete: (id: number) => void
}

export const TeachersTable = ({ teachers, onEdit, onDelete }: TeachersTableProps) => {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Имя</TableHead>
            <TableHead>Логин</TableHead>
            <TableHead>Telegram ID</TableHead>
            <TableHead>Ссылка Telegram</TableHead>
            <TableHead>Часовой пояс</TableHead>
            <TableHead>Роль</TableHead>
            <TableHead>Дата создания</TableHead>
            <TableHead>Дата архивации</TableHead>
            <TableHead className="text-right">Действия</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {teachers.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="text-center text-muted-foreground">
                Преподаватели не найдены
              </TableCell>
            </TableRow>
          ) : (
            teachers.map((teacher) => {
              const isDeleted = !!teacher.deleted_at
              return (
                <TableRow
                  key={teacher.id}
                  className={cn(isDeleted && 'opacity-50 pointer-events-none')}
                >
                  <TableCell className="font-medium">{teacher.name}</TableCell>
                  <TableCell>{teacher.login}</TableCell>
                  <TableCell>{teacher.telegram_id || '-'}</TableCell>
                  <TableCell>
                    {teacher.telegram_link ? (
                      <a
                        href={teacher.telegram_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        {teacher.telegram_link}
                      </a>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>{teacher.timezone}</TableCell>
                  <TableCell>
                    {teacher.role === 'ADMIN' ? 'Администратор' : teacher.role === 'TEACHER' ? 'Преподаватель' : teacher.role}
                  </TableCell>
                  <TableCell>
                    {teacher.created_at
                      ? format(new Date(teacher.created_at), 'MMM dd, yyyy')
                      : '-'}
                  </TableCell>
                  <TableCell>
                    {teacher.deleted_at
                      ? format(new Date(teacher.deleted_at), 'MMM dd, yyyy')
                      : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    {!isDeleted && (
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => onEdit(teacher.id)}
                          className="border-blue-500 text-blue-500 hover:bg-blue-50 hover:text-blue-600"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => onDelete(teacher.id)}
                          className="border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
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
  )
}

