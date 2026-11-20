import { formatCurrency } from '../../utils/formatters'
import { fromCents, lineTotalCents } from '../../utils/money'

// ── Helper ────────────────────────────────────────────────────────────
/** Always pass the invoice's currency; defaulting to USD is how five templates ended up showing `$` (BUG-5). */
export const fmt = (amount, currency = 'USD') => formatCurrency(amount, currency)

/** Saved items carry the server's rounded line_total; unsaved drafts fall back to cent-exact math (DATA-3). */
export function itemLineTotal(item) {
  if (item.line_total !== undefined && item.line_total !== null) return Number(item.line_total)
  return fromCents(lineTotalCents(item.quantity, item.rate ?? item.unit_price))
}

/** Tax rows to print: one per rate on the saved invoice (FEAT-4); older payloads only carry a single rate. */
export function taxRowsOf(invoice) {
  const rows = invoice.tax_breakdown ?? [{ rate: invoice.tax_rate, tax: invoice.tax_amount }]
  return rows.filter((row) => Number(row.rate) > 0)
}

export function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

export function fmtDateTime(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  })
}

export function formatAddress(address) {
  if (!address) return ''
  if (address.includes('\n') || address.includes('\r')) return address
  const parts = address
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
  if (parts.length <= 2) return address
  const firstLine = parts.slice(0, -2).join(', ')
  const secondLine = parts.slice(-2).join(', ')
  return `${firstLine}\n${secondLine}`
}
