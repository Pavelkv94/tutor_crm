import type { QueryClient } from '@tanstack/react-query'

/**
 * Вызывать после любой операции, которая может двинуть деньги или статусы оплаты занятий.
 *
 * Сервер сам распределяет баланс по занятиям: отмена возвращает оплату на баланс, прогул её
 * сжигает, перенос переносит, а новое занятие может автоматически стать оплаченным из остатка.
 * Фронтенд об этих изменениях не узнаёт, поэтому после денежных и «занятийных» мутаций
 * инвалидируем всё, что могло поменяться.
 */
export const invalidateMoneyQueries = (queryClient: QueryClient, studentId?: number | null) => {
  queryClient.invalidateQueries({ queryKey: ['lessons'] })
  queryClient.invalidateQueries({ queryKey: ['payments'] })
  queryClient.invalidateQueries({ queryKey: ['students'] })
  if (studentId !== undefined && studentId !== null) {
    queryClient.invalidateQueries({ queryKey: ['student', studentId] })
  }
}
