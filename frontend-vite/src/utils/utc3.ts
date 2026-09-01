/**
 * Helpers for displaying UTC+0 dates from the API in the school timezone (UTC+3).
 *
 * The shift is applied to the timestamp, so day/month/year overflow is handled
 * by Date itself (e.g. 31.12 21:10 UTC becomes 1 января 00:10 of the next year).
 */

const UTC3_OFFSET_MS = 3 * 60 * 60 * 1000

const MONTHS = [
  'Января', 'Февраля', 'Марта', 'Апреля', 'Мая', 'Июня',
  'Июля', 'Августа', 'Сентября', 'Октября', 'Ноября', 'Декабря',
]

const pad = (value: number): string => value.toString().padStart(2, '0')

/**
 * Convert a UTC+0 date to UTC+3 and get its parts
 * @param utcDate - ISO date string in UTC+0
 * @returns Date parts in UTC+3 (month is 0-based)
 */
export const getUTC3DateParts = (utcDate: string) => {
  const date = new Date(new Date(utcDate).getTime() + UTC3_OFFSET_MS)

  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth(),
    day: date.getUTCDate(),
    hours: date.getUTCHours(),
    minutes: date.getUTCMinutes(),
  }
}

/** Format a UTC+0 date as UTC+3 time, e.g. "09:30" */
export const formatUTC3Time = (utcDate: string): string => {
  const { hours, minutes } = getUTC3DateParts(utcDate)
  return `${pad(hours)}:${pad(minutes)}`
}

/** Format a UTC+0 date as UTC+3 date, e.g. "5 Января 2026" */
export const formatUTC3Date = (utcDate: string): string => {
  const { year, month, day } = getUTC3DateParts(utcDate)
  return `${day} ${MONTHS[month]} ${year}`
}

/** Format a UTC+0 date as numeric UTC+3 date, e.g. "05.01.2026" */
export const formatUTC3DateNumeric = (utcDate: string): string => {
  const { year, month, day } = getUTC3DateParts(utcDate)
  return `${pad(day)}.${pad(month + 1)}.${year}`
}

/** Format a UTC+0 date as UTC+3 date and time, e.g. "5 Января 2026, 09:30" */
export const formatUTC3DateTime = (utcDate: string): string => {
  return `${formatUTC3Date(utcDate)}, ${formatUTC3Time(utcDate)}`
}
