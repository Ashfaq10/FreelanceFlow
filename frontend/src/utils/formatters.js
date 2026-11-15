/** The one money formatter. `options` takes Intl overrides, e.g. whole-number dashboard figures. */
export function formatCurrency(amount, currency = 'USD', options = {}) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
    ...options,
  }).format(amount || 0)
}

/** Short axis labels such as $1.2K. */
export const formatCompactCurrency = (amount, currency = 'USD') =>
  formatCurrency(amount, currency, { notation: 'compact', minimumFractionDigits: 0, maximumFractionDigits: 1 })

/** The API sends amounts as strings and recharts plots nothing for a string, so chart rows need numbers. */
export const toChartRows = (rows) => (rows || []).map((row) => ({ ...row, total: Number(row.total) }))

export function formatDate(date, options = {}) {
  const defaultOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...options,
  }
  return new Date(date).toLocaleDateString('en-US', defaultOptions)
}

export function formatDateTime(date) {
  return new Date(date).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function formatNumber(number, decimals = 0) {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(number || 0)
}

export function formatPercent(value, decimals = 0) {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value / 100)
}
