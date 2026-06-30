import { useState } from 'react'
import { Trash2, ArrowUpDown } from 'lucide-react'
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
import type { Plan } from '@/types'

interface PlansTableProps {
  plans: Plan[]
  onDelete: (id: number) => void
  isDeleting: boolean
}

type SortField = 'plan_currency'
type SortDirection = 'asc' | 'desc'

const currencyFlags: Record<string, string> = {
  USD: '🇺🇸',
  EUR: '🇪🇺',
  PLN: '🇵🇱',
  BYN: '🇧🇾',
  RUB: '🇷🇺',
}

const formatPlanDate = (date: string | null): string => {
  if (!date) return '—'
  return format(new Date(date), 'dd.MM.yyyy')
}

const PlanTypeBadge = ({ planType }: { planType: string }) => {
  if (planType === 'INDIVIDUAL') {
    return (
      <span className="inline-flex rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
        Индивидуальный
      </span>
    )
  }

  if (planType === 'PAIR') {
    return (
      <span className="inline-flex rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
        Парный
      </span>
    )
  }

  return <span className="text-sm">{planType}</span>
}

export const PlansTable = ({ plans, onDelete, isDeleting }: PlansTableProps) => {
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

  const sortedPlans = [...plans].sort((a, b) => {
    if (!sortField) return 0

    const aValue = a.plan_currency.toLowerCase()
    const bValue = b.plan_currency.toLowerCase()

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
    return 0
  })

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-border bg-secondary hover:bg-secondary">
            <TableHead className="h-auto px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Название
            </TableHead>
            <TableHead className="h-auto px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Цена
            </TableHead>
            <TableHead className="h-auto px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <button
                type="button"
                onClick={() => handleSort('plan_currency')}
                className="inline-flex items-center gap-1.5 uppercase tracking-wider transition-colors hover:text-foreground"
                aria-label="Сортировать по валюте"
              >
                Валюта
                <ArrowUpDown className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </TableHead>
            <TableHead className="h-auto px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Длит. (мин)
            </TableHead>
            <TableHead className="h-auto px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Тип
            </TableHead>
            <TableHead className="h-auto px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Архивация
            </TableHead>
            <TableHead className="h-auto w-16 px-5 py-3.5" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedPlans.length === 0 ? (
            <TableRow className="border-b-0 hover:bg-card">
              <TableCell colSpan={7} className="px-5 py-10 text-center text-muted-foreground">
                Тарифы не найдены
              </TableCell>
            </TableRow>
          ) : (
            sortedPlans.map((plan) => {
              const isDeleted = !!plan.deleted_at

              return (
                <TableRow
                  key={plan.id}
                  className={cn(
                    'border-b border-border bg-card hover:bg-card',
                    isDeleted && 'opacity-45',
                  )}
                >
                  <TableCell className="px-5 py-4 font-extrabold text-foreground">
                    {plan.plan_name}
                  </TableCell>
                  <TableCell className="px-5 py-4 font-extrabold text-foreground">
                    {plan.plan_price.toLocaleString()}
                  </TableCell>
                  <TableCell className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{plan.plan_currency}</span>
                      {currencyFlags[plan.plan_currency] && (
                        <span className="text-base leading-none" aria-hidden="true">
                          {currencyFlags[plan.plan_currency]}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="px-5 py-4 font-medium">{plan.duration}</TableCell>
                  <TableCell className="px-5 py-4">
                    <PlanTypeBadge planType={plan.plan_type} />
                  </TableCell>
                  <TableCell className="px-5 py-4 text-muted-foreground">
                    {formatPlanDate(plan.deleted_at)}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-right">
                    {!isDeleted && (
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => onDelete(plan.id)}
                        disabled={isDeleting}
                        aria-label={`Удалить тариф ${plan.plan_name}`}
                        className="h-9 w-9 rounded-lg border-red-200 bg-card text-red-500 hover:border-red-300 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </Button>
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
