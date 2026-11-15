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

/** Multiply by the rate in cents so 1.5 × 0.33 lands on 0.50, like the server. */
export function lineTotalCents(quantity, rate) {
  const quantityNumber = Number(quantity)
  return Number.isFinite(quantityNumber) ? Math.round(quantityNumber * toCents(rate)) : 0
}

/** Draft preview totals, in cents. */
export function previewTotalsCents(items = [], discountAmount = 0, taxRate = 0) {
  const subtotal = items.reduce((sum, item) => sum + lineTotalCents(item?.quantity, item?.rate), 0)
  const discount = Math.min(Math.max(toCents(discountAmount), 0), subtotal)
  const taxable = subtotal - discount
  const rate = Number(taxRate)
  const tax = Number.isFinite(rate) ? Math.round((taxable * rate) / 100) : 0

  return { subtotal, discount, taxable, tax, total: taxable + tax }
}
