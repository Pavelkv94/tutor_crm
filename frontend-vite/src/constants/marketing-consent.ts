/**
 * Ответ про использование фото/видео — состояние из трёх значений: сам ответ лежит в
 * `marketing_consent`, а факт ответа — в `marketing_consent_at`. «Не спрашивали» не равно
 * отказу: только в этом состоянии вопрос показывается ученику на странице оплаты.
 */
export type MarketingConsentValue = 'yes' | 'no' | 'unasked'

export const MARKETING_CONSENT_OPTIONS: { value: MarketingConsentValue; label: string }[] = [
  { value: 'yes', label: 'Да' },
  { value: 'no', label: 'Нет' },
  { value: 'unasked', label: 'Не спрашивали' },
]

export const toMarketingConsentValue = (student: {
  marketing_consent: boolean
  marketing_consent_at: string | null
}): MarketingConsentValue => {
  if (!student.marketing_consent_at) return 'unasked'
  return student.marketing_consent ? 'yes' : 'no'
}

/** null возвращает ученика в «не спрашивали» — вопрос снова появится на странице оплаты. */
export const fromMarketingConsentValue = (value: MarketingConsentValue): boolean | null =>
  value === 'unasked' ? null : value === 'yes'
