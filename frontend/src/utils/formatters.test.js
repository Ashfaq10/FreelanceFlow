import { describe, expect, it } from 'vitest'
import { formatCompactCurrency, toChartRows } from './formatters'

describe('chart helpers (BUG-19)', () => {
  it("turns the API's string amounts into numbers, which recharts needs to plot anything", () => {
    const rows = toChartRows([{ month: '2026-04', total: '10837.00', count: 2 }])

    expect(rows).toEqual([{ month: '2026-04', total: 10837, count: 2 }])
    expect(typeof rows[0].total).toBe('number')
  })

  it('copes with no data', () => {
    expect(toChartRows(undefined)).toEqual([])
  })

  it('gives axis ticks distinct labels instead of a repeating "$1k"', () => {
    const labels = [0, 3000, 6000, 9000, 12000].map((v) => formatCompactCurrency(v, 'USD'))

    expect(labels).toEqual(['$0', '$3K', '$6K', '$9K', '$12K'])
    expect(new Set(labels).size).toBe(5)
  })

  it('uses the invoice currency', () => {
    expect(formatCompactCurrency(1500, 'EUR')).toBe('€1.5K')
  })
})
