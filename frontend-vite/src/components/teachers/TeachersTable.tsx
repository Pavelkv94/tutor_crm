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
import { useAuth } from '@/contexts/AuthContext'
import type { Teacher } from '@/types'

interface TeachersTableProps {
  teachers: Teacher[]
  onEdit: (id: number) => void
  onDelete: (id: number) => void
  onGenerateTelegramLink: (id: number) => void
	onSalaryReport: (id: number) => void
}

export const TeachersTable = ({ teachers, onEdit, onDelete, onGenerateTelegramLink, onSalaryReport }: TeachersTableProps) => {
	const { user } = useAuth()

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Имя</TableHead>
            <TableHead>Логин</TableHead>
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
              <TableCell colSpan={8} className="text-center text-muted-foreground">
                Преподаватели не найдены
              </TableCell>
            </TableRow>
          ) : (
            teachers.map((teacher) => {
              const isDeleted = !!teacher.deleted_at
              const telegramLink = teacher.telegrams?.[0]?.username
                ? `https://t.me/${teacher.telegrams[0].username}`
                : null
							// Check if current user is viewing their own row
							const isCurrentUser = user && teacher.id === parseInt(user.id, 10)
              return (
                <TableRow
                  key={teacher.id}
                  className={cn(isDeleted && 'opacity-50 pointer-events-none')}
                >
                  <TableCell className="font-medium">{teacher.name}</TableCell>
                  <TableCell>{teacher.login}</TableCell>
                  <TableCell>
                    {telegramLink ? (
                      <a
                        href={telegramLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        {telegramLink}
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
												<Button variant="outline" size="icon" onClick={() => onSalaryReport(teacher.id)} className="border-orange-500 text-orange-500 hover:bg-orange-50 hover:text-orange-600" title="Рассчет зарплаты">
													<BarChart className="h-4 w-4" />
												</Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => onGenerateTelegramLink(teacher.id)}
                          className="border-green-500 text-green-500 hover:bg-green-50 hover:text-green-600"
                          title="Сгенерировать ссылку Telegram"
                        >
                          <Link className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => onEdit(teacher.id)}
                          className="border-blue-500 text-blue-500 hover:bg-blue-50 hover:text-blue-600"
													title="Редактировать"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
												{!isCurrentUser && (
													<Button
														variant="outline"
														size="icon"
														onClick={() => onDelete(teacher.id)}
														className="border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive"
														title="Удалить"
													>
														<Trash2 className="h-4 w-4" />
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
  )
}

