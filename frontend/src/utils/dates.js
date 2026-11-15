/**
 * `new Date('2026-11-15')` is parsed as UTC midnight, so west of UTC it renders as the 14th,
 * and `toISOString()` defaults can land on the wrong day near midnight (BUG-13).
 */

/** Parse a `YYYY-MM-DD` string as a local date; pass anything else through to Date. */
export function parseDateOnly(value) {
  if (typeof value === 'string') {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
    if (match) {
      const [, year, month, day] = match
      return new Date(Number(year), Number(month) - 1, Number(day))
    }
  }
  return new Date(value)
}

/** Today as `YYYY-MM-DD` in the user's own timezone. */
export function todayISO(date = new Date()) {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}
