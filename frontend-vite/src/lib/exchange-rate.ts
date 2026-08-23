/**
 * Курс евро хранится и передаётся в сотых долях BYN (500 = 1 € = 5.00 BYN) — на бэке все
 * денежные величины целые, и плавающая точка на границе API не появляется.
 *
 * Поэтому `formatMoney` из constants/currency тут не подходит: он ничего не делит.
 */
const SCALE = 100

export const formatEurRate = (rateHundredths: number): string => (rateHundredths / SCALE).toFixed(2)

/** «5,00» и «5.00» одинаково валидны — запятая на русской раскладке ближе. null при мусоре. */
export const parseEurRate = (input: string): number | null => {
  const normalized = input.trim().replace(',', '.')
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null
  return Math.round(parseFloat(normalized) * SCALE)
}
