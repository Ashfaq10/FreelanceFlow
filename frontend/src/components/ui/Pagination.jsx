import { ChevronLeft, ChevronRight } from 'lucide-react'

/** Page controls for a DRF list response (`count`, `next`, `previous`). */
function Pagination({ page, pageSize = 20, count = 0, onPageChange }) {
  const totalPages = Math.max(Math.ceil(count / pageSize), 1)
  if (count <= pageSize) return null

  const first = (page - 1) * pageSize + 1
  const last = Math.min(page * pageSize, count)

  return (
    <div className="flex items-center justify-between px-5 py-3 border-t border-gray-200/70 dark:border-white/8">
      <p className="text-xs text-gray-500 dark:text-gray-400">
        {first}–{last} of {count}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Previous page"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-white/8 disabled:opacity-40 disabled:hover:bg-transparent"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          Page {page} of {totalPages}
        </span>
        <button
          type="button"
          aria-label="Next page"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-white/8 disabled:opacity-40 disabled:hover:bg-transparent"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

export default Pagination
