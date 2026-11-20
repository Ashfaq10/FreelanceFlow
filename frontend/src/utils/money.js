/**
 * Money math in integer cents, matching the server's ROUND_HALF_UP to the cent (DATA-3).
 *
 * Only for previewing an invoice that has not been saved yet. Anything the server has
 * stored (`line_total`, `subtotal`, `tax_amount`, `total`) must be displayed as sent.
 */

export function toCents(value) {
  const number = Number(value)
  return Number.isFinite(number) ? Math.round(number * 100) : 0
}

export function fromCents(cents) {
  return cents / 100
}

/** Quantity in hundredths x rate in cents, rounded half up in integers: 0.29 x 0.50 is 0.15, as on the server. */
export function lineTotalCents(quantity, rate) {
  const quantityNumber = Number(quantity)
  if (!Number.isFinite(quantityNumber)) return 0
  return Math.floor((Math.round(quantityNumber * 100) * toCents(rate) + 50) / 100)
}

// Percentages in hundredths (12.5% -> 1250) so cents * rate stays an integer: half-up like the server, no float drift.
const hundredths = (value) => {
  const number = Number(value)
  return Number.isFinite(number) ? Math.round(number * 100) : 0
}
const percentOf = (cents, percent) => Math.floor((cents * hundredths(percent) + 5000) / 10000)

/**
 * Draft preview totals, in cents; mirrors Invoice.calculate_totals on the server (FEAT-4).
 * A line's `tax_rate` of '' / null means "use the invoice rate"; lines are grouped by effective rate and the
 * discount is shared across groups by subtotal, the last (lowest) rate absorbing the rounding remainder.
 */
export function previewTotalsCents(items = [], discountAmount = 0, taxRate = 0, discountPercent = 0) {
  const lineCents = items.map((item) => lineTotalCents(item?.quantity, item?.rate))
  const subtotal = lineCents.reduce((sum, cents) => sum + cents, 0)
  const requested = Number(discountPercent) > 0 ? percentOf(subtotal, discountPercent) : toCents(discountAmount)
  const discount = Math.min(Math.max(requested, 0), subtotal)

  const groups = new Map()
  items.forEach((item, index) => {
    const own = item?.tax_rate
    const rate = own === '' || own === null || own === undefined ? Number(taxRate) || 0 : Number(own) || 0
    groups.set(rate, (groups.get(rate) ?? 0) + lineCents[index])
  })

  const ordered = [...groups.entries()].sort((a, b) => b[0] - a[0])
  let shared = 0
  const breakdown = ordered.map(([rate, groupSubtotal], position) => {
    const share =
      position === ordered.length - 1
        ? discount - shared
        : subtotal === 0
          ? 0
          : Math.floor((2 * discount * groupSubtotal + subtotal) / (2 * subtotal))
    shared += share
    const taxable = groupSubtotal - share
    return { rate, taxable, tax: percentOf(taxable, rate) }
  })

  const tax = breakdown.reduce((sum, row) => sum + row.tax, 0)
  return { subtotal, discount, taxable: subtotal - discount, tax, total: subtotal - discount + tax, breakdown }
}
