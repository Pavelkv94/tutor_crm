export const CURRENCY_CODES = ['EUR', 'PLN', 'BYN'] as const

export type Currency = (typeof CURRENCY_CODES)[number]

export const CURRENCIES: ReadonlyArray<{ code: Currency; symbol: string; flag: string }> = [
  { code: 'EUR', symbol: '€', flag: '🇪🇺' },
  { code: 'PLN', symbol: 'zł', flag: '🇵🇱' },
  { code: 'BYN', symbol: 'р', flag: '🇧🇾' },
] as const

export const getCurrency = (code: string | null | undefined) => {
  return CURRENCIES.find((currency) => currency.code === code)
}

export const getCurrencySymbol = (code: string | null | undefined): string => {
  return getCurrency(code)?.symbol ?? ''
}

export const getCurrencyFlag = (code: string | null | undefined): string => {
  return getCurrency(code)?.flag ?? ''
}

/**
 * Суммы приходят целыми единицами валюты: 40 означает 40 PLN, делить на 100 не нужно.
 * Валюта может отсутствовать (нулевой баланс) — тогда показываем только число.
 */
export const formatMoney = (amount: number, currency: string | null | undefined): string => {
  const symbol = getCurrencySymbol(currency)
  const formatted = amount.toLocaleString('ru-RU')
  return symbol ? `${formatted} ${symbol}` : formatted
}
