import { startOfMonth } from 'date-fns'
import type { Currency } from '@/constants/currency'
import type { Plan, Student } from '@/types'

/**
 * Клиентское зеркало ПЕРВОГО правила бэкенда (BalanceService.assertLessonCurrencyAllowed):
 * ненулевой остаток на балансе запрещает занятия по планам в другой валюте.
 *
 * Второе правило («в этом месяце уже есть занятия в другой валюте») здесь намеренно не
 * повторяется: клиент не видит занятия ученика у других преподавателей и надёжно посчитать
 * его не может. Его проверяет сервер, а текст его 400 показывает глобальный тост.
 */
export const getAllowedPlanCurrency = (
  student: Pick<Student, 'balance' | 'balance_currency'> | undefined | null,
  lessonDate?: Date | null,
): Currency | null => {
  if (!student || student.balance === 0) return null
  // Прошлые месяцы сервер не проверяет — не ограничиваем и мы.
  if (lessonDate && startOfMonth(lessonDate) < startOfMonth(new Date())) return null
  return student.balance_currency
}

/** Бесплатные, пробные и нулевые по цене занятия сервер из проверки исключает. */
export const isPlanSelectable = (
  plan: Pick<Plan, 'plan_currency' | 'plan_price'>,
  allowedCurrency: Currency | null,
  options: { isFree?: boolean; isTrial?: boolean } = {},
): boolean => {
  if (options.isFree || options.isTrial || plan.plan_price <= 0) return true
  if (!allowedCurrency) return true
  return plan.plan_currency === allowedCurrency
}
