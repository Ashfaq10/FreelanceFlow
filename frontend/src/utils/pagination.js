/**
 * DRF paginates at 20. Screens that need every row (selects, totals) must follow `next`,
 * or they silently work with the first page only (BUG-7).
 */
export async function fetchAllPages(fetcher, params = {}) {
  const rows = []
  let page = 1

  for (;;) {
    const response = await fetcher({ ...params, page, page_size: 100 })
    const data = response.data

    // A non-paginated endpoint returns a bare array.
    if (Array.isArray(data)) return data

    rows.push(...(data.results || []))
    if (!data.next) return rows
    page += 1
  }
}
