import type { TeacherBillingDetailsInput } from '@/types'

export const BILLING_DETAILS_FIELDS: {
  key: keyof TeacherBillingDetailsInput
  label: string
  placeholder: string
}[] = [
  { key: 'full_name_latin', label: 'ФИО латиницей', placeholder: 'Demukh Anna Aleksandrovna' },
  { key: 'address', label: 'Адрес', placeholder: 'Orsha, Zadneprovskaya str., 8/121, Belarus' },
  { key: 'passport', label: 'Паспорт', placeholder: 'BM 2712432' },
  { key: 'email', label: 'Email', placeholder: 'teacher@gmail.com' },
  { key: 'bank_name', label: 'Банк', placeholder: 'Belagroprombank' },
  { key: 'bank_account', label: '№ счёта', placeholder: 'BY81BAPB30140000064105565150' },
]

/**
 * Приводит форму к виду, который понимает бэкенд: очищенное поле уходит как null,
 * иначе стереть однажды введённый реквизит было бы нельзя.
 */
export const toBillingDetailsPayload = (
  value: TeacherBillingDetailsInput,
): TeacherBillingDetailsInput =>
  Object.fromEntries(
    BILLING_DETAILS_FIELDS.map((field) => [field.key, (value[field.key] ?? '').trim() || null]),
  ) as TeacherBillingDetailsInput

/** Пустая форма при создании преподавателя не должна заводить карточку реквизитов. */
export const hasBillingDetails = (value: TeacherBillingDetailsInput): boolean =>
  BILLING_DETAILS_FIELDS.some((field) => (value[field.key] ?? '').trim() !== '')
