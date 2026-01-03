import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { PlansTable } from '@/components/plans/PlansTable'
import { CreatePlanDialog } from '@/components/plans/CreatePlanDialog'
import { plansApi } from '@/api/plans'

export const Plans = () => {
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null)
  const [filter, setFilter] = useState<'all' | 'active' | 'deleted'>('all')
  const queryClient = useQueryClient()

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['plans', filter],
    queryFn: () => plansApi.getAll(filter),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => plansApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] })
      setDeleteDialogOpen(false)
      setSelectedPlanId(null)
    },
  })

  const handleDeleteClick = (id: number) => {
    setSelectedPlanId(id)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = () => {
    if (selectedPlanId !== null) {
      deleteMutation.mutate(selectedPlanId)
    }
  }

  const selectedPlan = plans.find((p) => p.id === selectedPlanId) || null

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold">Тарифы</h1>
        <Button onClick={() => setCreateDialogOpen(true)} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Создать тариф
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Label htmlFor="plan-filter">Фильтр:</Label>
          <Select value={filter} onValueChange={(value: 'all' | 'active' | 'deleted') => setFilter(value)}>
            <SelectTrigger id="plan-filter" className="w-[180px]">
              <SelectValue placeholder="Выберите фильтр" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все</SelectItem>
              <SelectItem value="active">Активные</SelectItem>
              <SelectItem value="deleted">Удаленные</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="text-muted-foreground">Загрузка...</div>
        </div>
      ) : (
        <PlansTable
          plans={plans}
          onDelete={handleDeleteClick}
          isDeleting={deleteMutation.isPending}
        />
      )}

      <CreatePlanDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Удалить тариф</DialogTitle>
            <DialogDescription>
              Вы уверены, что хотите удалить <strong>{selectedPlan?.plan_name}</strong>? Это
              действие нельзя отменить.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Отмена
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Удаление...' : 'Удалить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

