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
