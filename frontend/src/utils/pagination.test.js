import { describe, expect, it, vi } from 'vitest'
import { fetchAllPages } from './pagination'

describe('fetchAllPages', () => {
  it('follows next until the last page', async () => {
    const fetcher = vi.fn(({ page }) =>
      Promise.resolve({
        data: {
          results: page === 1 ? [{ id: 1 }, { id: 2 }] : [{ id: 3 }],
          next: page === 1 ? 'http://api/next' : null,
        },
      })
    )

    const rows = await fetchAllPages(fetcher)

    expect(rows.map((r) => r.id)).toEqual([1, 2, 3])
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('asks for the largest page the API allows', async () => {
    const fetcher = vi.fn(() => Promise.resolve({ data: { results: [], next: null } }))

    await fetchAllPages(fetcher, { search: 'acme' })

    expect(fetcher).toHaveBeenCalledWith({ search: 'acme', page: 1, page_size: 100 })
  })

  it('accepts a bare array from a non-paginated endpoint', async () => {
    const fetcher = vi.fn(() => Promise.resolve({ data: [{ id: 7 }] }))

    expect(await fetchAllPages(fetcher)).toEqual([{ id: 7 }])
  })
})
