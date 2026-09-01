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

/** Минорных единиц в одной единице валюты: 4000 означает 40,00 PLN. */
export const MONEY_MINOR_UNITS = 100

/**
 * «34,00» из 3400 — сумма без валюты. Копейки печатаются всегда, даже нулевые: суммы
 * читаются столбиком, и плавающее число знаков сбивает.
 */
export const formatMoneyValue = (amountMinor: number): string =>
  (amountMinor / MONEY_MINOR_UNITS).toLocaleString('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

/**
 * Суммы приходят с бэкенда в минорных единицах валюты: 4000 означает 40,00 PLN.
 * Валюта может отсутствовать (нулевой баланс) — тогда показываем только число.
 */
export const formatMoney = (amountMinor: number, currency: string | null | undefined): string => {
  const symbol = getCurrencySymbol(currency)
  const formatted = formatMoneyValue(amountMinor)
  return symbol ? `${formatted} ${symbol}` : formatted
}

/**
 * «34», «34,5» и «34.50» одинаково валидны — запятая на русской раскладке ближе.
 * Возвращает минорные единицы, null при мусоре. Тот же разбор, что у parseEurRate
 * в lib/exchange-rate.ts, но для сумм.
 */
export const parseMoney = (input: string): number | null => {
  const normalized = input.trim().replace(',', '.')
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null
  return Math.round(parseFloat(normalized) * MONEY_MINOR_UNITS)
}
