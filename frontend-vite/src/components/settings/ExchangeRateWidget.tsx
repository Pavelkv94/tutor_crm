import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Pencil } from 'lucide-react'
import { settingsApi } from '@/api/settings'
import { formatEurRate } from '@/lib/exchange-rate'
import { EditExchangeRateDialog } from '@/components/settings/EditExchangeRateDialog'

/**
 * Курс евро в сайдбаре. Настройка админская, поэтому и запрос уходит только у админа —
 * иначе преподаватель получил бы 401, а axios-интерсептор принял бы его за истёкший токен.
 */
export const ExchangeRateWidget = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsApi.get(),
  })

  const eurRate = settings?.eur_rate ?? 0

  return (
    <>
      <div
        className="mx-2.5 mt-4 flex items-center gap-2.5 rounded-xl px-2.5 py-2"
        style={{ background: 'rgba(255,255,255,0.08)' }}
      >
        <div className="min-w-0 flex-1 leading-tight">
          <div className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>
            Курс евро
          </div>
          <div className="truncate text-base font-bold" style={{ color: '#fff' }}>
            {formatEurRate(eurRate)}
          </div>
        </div>
        <button
          onClick={() => setIsDialogOpen(true)}
          title="Изменить курс евро"
          aria-label="Изменить курс евро"
          className="flex h-8 w-8 flex-shrink-0 cursor-pointer items-center justify-center rounded-lg border-none transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300"
          style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.8)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.18)'
            e.currentTarget.style.color = '#fff'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
            e.currentTarget.style.color = 'rgba(255,255,255,0.8)'
          }}
        >
          <Pencil className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      {isDialogOpen && <EditExchangeRateDialog onOpenChange={setIsDialogOpen} eurRate={eurRate} />}
    </>
  )
}
