import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { settingsApi } from '@/api/settings'
import { formatEurRate, parseEurRate } from '@/lib/exchange-rate'
import { showSuccessToast } from '@/lib/toast'
import type { UpdateSchoolSettingsInput } from '@/types'

interface EditExchangeRateDialogProps {
  onOpenChange: (open: boolean) => void
  /** Текущий курс в сотых. */
  eurRate: number
}

/**
 * Монтируется только на время открытия — поэтому поле инициализируется прямо в useState,
 * без useEffect: синхронный setState в эффекте ESLint запрещает.
 */
export const EditExchangeRateDialog = ({ onOpenChange, eurRate }: EditExchangeRateDialogProps) => {
  const [rate, setRate] = useState(() => formatEurRate(eurRate))
  const queryClient = useQueryClient()

  const parsed = parseEurRate(rate)
  const isFormValid = parsed !== null

  const updateMutation = useMutation({
    mutationFn: (data: UpdateSchoolSettingsInput) => settingsApi.update(data),
    onSuccess: () => {
      showSuccessToast('Курс евро обновлён')
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      onOpenChange(false)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (parsed === null) return
    updateMutation.mutate({ eur_rate: parsed })
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Курс евро</DialogTitle>
          <DialogDescription>
            Сколько белорусских рублей в одном евро. По этому курсу считаются счета учеников с
            планами в BYN, которые платят через Stripe.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-2 py-4">
            <Label htmlFor="eurRate">1 € в BYN</Label>
            <Input
              id="eurRate"
              inputMode="decimal"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              placeholder="0.00"
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              Например, 3.50. Нулевой курс отключает ссылки на оплату для BYN-счетов.
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={updateMutation.isPending || !isFormValid}>
              {updateMutation.isPending ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
