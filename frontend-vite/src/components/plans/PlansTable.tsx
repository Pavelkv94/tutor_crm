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
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Название</TableHead>
            <TableHead>Цена</TableHead>
            <TableHead>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-2"
                onClick={() => handleSort('plan_currency')}
              >
                Валюта
                <ArrowUpDown className="h-4 w-4" />
              </Button>
            </TableHead>
            <TableHead>Длительность (мин)</TableHead>
            <TableHead>Тип</TableHead>
            <TableHead>Дата создания</TableHead>
            <TableHead>Дата архивации</TableHead>
            <TableHead className="text-right">Действия</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedPlans.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-muted-foreground">
                Тарифы не найдены
              </TableCell>
            </TableRow>
          ) : (
            sortedPlans.map((plan) => {
              const isDeleted = !!plan.deleted_at
              return (
                <TableRow
                  key={plan.id}
                  className={cn(isDeleted && 'opacity-50 pointer-events-none')}
                >
                  <TableCell className="font-medium">{plan.plan_name}</TableCell>
                  <TableCell>{plan.plan_price.toLocaleString()}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span>{plan.plan_currency}</span>
                      {currencyFlags[plan.plan_currency] && (
                        <span>{currencyFlags[plan.plan_currency]}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{plan.duration}</TableCell>
                  <TableCell>
                    {plan.plan_type === 'INDIVIDUAL' ? 'Индивидуальный' : plan.plan_type === 'PAIR' ? 'Парный' : plan.plan_type}
                  </TableCell>
                  <TableCell>
                    {plan.created_at
                      ? format(new Date(plan.created_at), 'MMM dd, yyyy')
                      : '-'}
                  </TableCell>
                  <TableCell>
                    {plan.deleted_at
                      ? format(new Date(plan.deleted_at), 'MMM dd, yyyy')
                      : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    {!isDeleted && (
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => onDelete(plan.id)}
                        disabled={isDeleting}
                        className="border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" />
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

