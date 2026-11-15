import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { parseDateOnly, todayISO } from './dates'

// The bug only shows west of UTC; Node re-reads process.env.TZ per Date call.
const originalTZ = process.env.TZ
beforeAll(() => { process.env.TZ = 'America/Los_Angeles' })
afterAll(() => { process.env.TZ = originalTZ })

describe('parseDateOnly', () => {
  it('keeps the calendar day a date-only string names', () => {
    const parsed = parseDateOnly('2026-11-15')

    expect(parsed.getFullYear()).toBe(2026)
    expect(parsed.getMonth()).toBe(10) // November
    expect(parsed.getDate()).toBe(15) // new Date('2026-11-15') would say the 14th here
  })

  it('passes timestamps through', () => {
    expect(parseDateOnly('2026-11-15T09:00:00Z').getTime()).toBe(Date.parse('2026-11-15T09:00:00Z'))
  })
})

describe('todayISO', () => {
  it('uses local calendar fields, not UTC', () => {
    // 31 December 2026, 17:00 local: toISOString() would already say 2027-01-01.
    expect(todayISO(new Date(2026, 11, 31, 17, 0))).toBe('2026-12-31')
  })
})
