import { describe, expect, it } from 'vitest'
import { fromCents, lineTotalCents, previewTotalsCents } from './money'

describe('lineTotalCents', () => {
  it('rounds half up like the server', () => {
    // 1.50 × 0.33 = 0.495; float math shows 0.49, the server stores 0.50.
    expect(fromCents(lineTotalCents(1.5, 0.33))).toBe(0.5)
  })

  it('handles fractional quantities exactly', () => {
    expect(fromCents(lineTotalCents(2.5, 100))).toBe(250)
  })

  it('treats empty input as zero', () => {
    expect(lineTotalCents('', '')).toBe(0)
    expect(lineTotalCents(undefined, 10)).toBe(0)
  })
})

describe('previewTotalsCents', () => {
  it('quantizes tax and keeps subtotal - discount + tax === total', () => {
    const { subtotal, tax, total } = previewTotalsCents([{ quantity: 1, rate: 1.25 }], 0, 10)

    expect(fromCents(subtotal)).toBe(1.25)
    expect(fromCents(tax)).toBe(0.13) // 0.125 → 0.13
    expect(total).toBe(subtotal + tax)
  })

  it('applies the discount before tax and never below zero', () => {
    const { total } = previewTotalsCents([{ quantity: 1, rate: 100 }], 10, 20)

    expect(fromCents(total)).toBe(108)
  })

  it('caps the discount at the subtotal', () => {
    const { discount, total } = previewTotalsCents([{ quantity: 1, rate: 50 }], 80, 0)

    expect(fromCents(discount)).toBe(50)
    expect(total).toBe(0)
  })
})

describe('previewTotalsCents with several rates and a percentage discount (FEAT-4)', () => {
  it('taxes each rate separately and shares the discount by subtotal', () => {
    const { breakdown, tax, total } = previewTotalsCents(
      [
        { quantity: 1, rate: 100, tax_rate: '20' },
        { quantity: 1, rate: 300, tax_rate: '5' },
      ],
      40
    )

    expect(breakdown).toEqual([
      { rate: 20, taxable: 9000, tax: 1800 },
      { rate: 5, taxable: 27000, tax: 1350 },
    ])
    expect(fromCents(tax)).toBe(31.5)
    expect(fromCents(total)).toBe(391.5)
  })

  it('lets blank lines inherit the invoice rate and an explicit 0 stay exempt', () => {
    const { tax } = previewTotalsCents(
      [
        { quantity: 1, rate: 100, tax_rate: '' },
        { quantity: 1, rate: 100, tax_rate: '0' },
      ],
      0,
      10
    )

    expect(fromCents(tax)).toBe(10)
  })

  it('computes a percentage discount in cents, half up', () => {
    const { discount, total } = previewTotalsCents([{ quantity: 1, rate: 200 }], 0, 10, 12.5)

    expect(fromCents(discount)).toBe(25)
    expect(fromCents(total)).toBe(192.5)
  })

  it('never loses a cent of discount to rounding', () => {
    const { breakdown, discount } = previewTotalsCents(
      [
        { quantity: 1, rate: 10, tax_rate: '10' },
        { quantity: 1, rate: 10, tax_rate: '5' },
        { quantity: 1, rate: 10, tax_rate: '0' },
      ],
      0.01
    )

    expect(breakdown.reduce((sum, row) => sum + row.taxable, 0)).toBe(3000 - discount)
  })
})

describe('regressions found in review', () => {
  it('rounds a line the way the server does for quantities that are not exact in binary floats', () => {
    // 0.29 x 0.50 = 0.145 -> 0.15; float math gave 0.14
    expect(fromCents(lineTotalCents(0.29, 0.5))).toBe(0.15)
    expect(fromCents(lineTotalCents(0.29, 7.5))).toBe(2.18)
    expect(fromCents(lineTotalCents(0.29, 14.5))).toBe(4.21)
  })

  it('does not produce NaN when free lines carry different rates', () => {
    const totals = previewTotalsCents(
      [
        { quantity: 1, rate: 0, tax_rate: '20' },
        { quantity: 1, rate: 0, tax_rate: '5' },
      ],
      0
    )

    expect(totals.total).toBe(0)
    expect(Number.isNaN(totals.tax)).toBe(false)
  })
})
