import { useState } from 'react'
import { format } from 'date-fns'
import { ArrowUpDown, Trash2, Pencil, Cake } from 'lucide-react'
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
import type { PaymentCurrency, Student } from '@/types'

const PAYMENT_CURRENCY_LABELS: Record<PaymentCurrency, string> = {
	BYN: 'BYN 🇧🇾',
	EUR: 'EUR 🇪🇺',
	PLN: 'PLN 🇵🇱',
}

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

const headerCellClass =
	'h-auto px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-foreground'

const bodyCellClass = 'px-5 py-4'

const formatAgeLabel = (age: number): string => {
  const lastDigit = age % 10
  const lastTwoDigits = age % 100

  if (lastDigit === 1 && lastTwoDigits !== 11) {
    return `${age} год`
  }
  if (lastDigit >= 2 && lastDigit <= 4 && (lastTwoDigits < 10 || lastTwoDigits >= 20)) {
    return `${age} года`
  }
  return `${age} лет`
}

const formatClassWithAge = (student: Student): string => {
  if (student.age === null || student.age === undefined) {
    return String(student.class)
  }
  return `${student.class} (${formatAgeLabel(student.age)})`
}

const formatStudentDate = (date: string | null | undefined): string => {
	if (!date) return '—'
	return format(new Date(date), 'dd.MM.yyyy')
}

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
      aValue = a.birth_date ? new Date(a.birth_date).getTime() : Number.MAX_SAFE_INTEGER
      bValue = b.birth_date ? new Date(b.birth_date).getTime() : Number.MAX_SAFE_INTEGER
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
    return 0
  })

	const columnCount = (showBalance ? 6 : 5) + 2

  return (
		<div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
			<div className="overflow-x-auto">
				<Table>
					<TableHeader>
						<TableRow className="border-b border-border bg-secondary hover:bg-secondary">
							<TableHead className={headerCellClass}>
								<button
									type="button"
									onClick={() => handleSort('name')}
									className="inline-flex items-center gap-1.5 uppercase tracking-wider transition-colors hover:text-foreground"
									aria-label="Сортировать по имени"
								>
									Имя
									<ArrowUpDown className="h-3.5 w-3.5" aria-hidden="true" />
								</button>
							</TableHead>
							<TableHead className={headerCellClass}>
								<button
									type="button"
									onClick={() => handleSort('class')}
									className="inline-flex items-center gap-1.5 uppercase tracking-wider transition-colors hover:text-foreground"
									aria-label="Сортировать по классу"
								>
									Класс
									<ArrowUpDown className="h-3.5 w-3.5" aria-hidden="true" />
								</button>
							</TableHead>
							{showBalance && (
								<TableHead className={headerCellClass}>Регион</TableHead>
							)}
							<TableHead className={headerCellClass}>
								<button
									type="button"
									onClick={() => handleSort('birth_date')}
									className="inline-flex items-center gap-1.5 uppercase tracking-wider transition-colors hover:text-foreground"
									aria-label="Сортировать по дате рождения"
								>
									Дата рождения
									<ArrowUpDown className="h-3.5 w-3.5" aria-hidden="true" />
								</button>
							</TableHead>
							<TableHead className={headerCellClass}>Счет для оплаты</TableHead>
							<TableHead className={headerCellClass}>Маркетинг</TableHead>
							<TableHead className={headerCellClass}>Архивация</TableHead>
							<TableHead className={cn(headerCellClass, 'text-right')}>Действия</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{sortedStudents.length === 0 ? (
							<TableRow className="border-b-0 hover:bg-card">
								<TableCell
									colSpan={columnCount}
									className="px-5 py-10 text-center text-muted-foreground"
								>
									Ученики не найдены
								</TableCell>
							</TableRow>
						) : (
							sortedStudents.map((student) => {
								const isDeleted = !!student.deleted_at
								const hasBirthdayToday = isBirthdayToday(student.birth_date)

								return (
									<TableRow
										key={student.id}
										className={cn(
											'border-b border-border bg-card hover:bg-card',
											isDeleted && 'opacity-45',
										)}
									>
										<TableCell className={cn(bodyCellClass, 'font-extrabold text-foreground')}>
											<div className="flex items-center gap-2">
												{hasBirthdayToday && (
													<div title="День рождения сегодня!">
														<Cake className="h-4 w-4 text-pink-500" aria-hidden="true" />
													</div>
												)}
												{student.name}
											</div>
										</TableCell>
										<TableCell className={cn(bodyCellClass, 'font-medium')}>
											{formatClassWithAge(student)}
										</TableCell>
										{showBalance && (
											<TableCell className={bodyCellClass}>
												<RegionDisplay region={student.timezone} />
											</TableCell>
										)}
										<TableCell className={cn(bodyCellClass, 'text-muted-foreground')}>
											{formatStudentDate(student.birth_date)}
										</TableCell>
										<TableCell className={bodyCellClass}>
											{PAYMENT_CURRENCY_LABELS[student.payment_currency] ?? student.payment_currency ?? '—'}
										</TableCell>
										<TableCell className={bodyCellClass}>
											{student.marketing_consent ? 'Да' : 'Нет'}
										</TableCell>
										<TableCell className={cn(bodyCellClass, 'text-muted-foreground')}>
											{formatStudentDate(student.deleted_at)}
										</TableCell>
										<TableCell className={cn(bodyCellClass, 'text-right')}>
											<div className="flex items-center justify-end gap-2">
												<Button
													variant="outline"
													size="sm"
													onClick={() => onReport(student.id)}
													className="h-8 rounded-lg border-primary bg-card px-3 text-xs font-semibold text-[hsl(45_90%_38%)] hover:bg-primary/10"
												>
													Отчёт
												</Button>
												{showActions && (
													<Button
														variant="outline"
														size="sm"
														onClick={() => onAssignLessons(student.id)}
														disabled={isDeleted}
														className="h-8 rounded-lg border-transparent bg-secondary px-3 text-xs font-semibold text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50"
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
															aria-label={`Редактировать ученика ${student.name}`}
															className="h-9 w-9 rounded-lg border-border bg-card text-accent-foreground hover:bg-accent hover:text-accent-foreground"
														>
															<Pencil className="h-4 w-4" aria-hidden="true" />
														</Button>
														<Button
															variant="outline"
															size="icon"
															onClick={() => onDelete(student.id)}
															disabled={isDeleting}
															aria-label={`Удалить ученика ${student.name}`}
															className="h-9 w-9 rounded-lg border-red-200 bg-card text-red-500 hover:border-red-300 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
														>
															<Trash2 className="h-4 w-4" aria-hidden="true" />
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
    </div>
  )
}
