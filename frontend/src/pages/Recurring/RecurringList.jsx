import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Repeat } from 'lucide-react'
import toast from 'react-hot-toast'
import { Card, Button, EmptyState, ErrorState, Skeleton } from '../../components/ui'
import { recurring as recurringApi } from '../../api/endpoints'
import { fetchAllPages } from '../../utils/pagination'
import { formatCurrency } from '../../utils/formatters'
import { useCurrency } from '../../hooks/useCurrency'
import { parseDateOnly } from '../../utils/dates'

const FREQUENCY = { weekly: 'Weekly', monthly: 'Monthly', quarterly: 'Quarterly', yearly: 'Yearly' }
const day = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' })
const when = (value) => (value ? day.format(parseDateOnly(value)) : '—')

/** Schedules that make an invoice by themselves (FEAT-4). */
function RecurringList() {
  const [schedules, setSchedules] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const currency = useCurrency()

  const load = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      setSchedules(await fetchAllPages(recurringApi.list))
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const toggle = async (schedule) => {
    try {
      await recurringApi.update(schedule.id, { is_active: !schedule.is_active })
      await load()
    } catch {
      toast.error('Could not update the schedule')
    }
  }

  const remove = async (schedule) => {
    if (
      !window.confirm(
        `Delete the ${FREQUENCY[schedule.frequency].toLowerCase()} schedule for ${schedule.client_name}? Invoices it already made stay.`
      )
    )
      return
    try {
      await recurringApi.delete(schedule.id)
      await load()
    } catch {
      toast.error('Could not delete the schedule')
    }
  }

  const amount = (schedule) =>
    formatCurrency(
      schedule.lines.reduce((sum, line) => sum + Number(line.quantity) * Number(line.rate), 0),
      currency
    )

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Recurring invoices</h1>
          <p className="text-gray-500 dark:text-gray-400">Invoices that make themselves on a schedule</p>
        </div>
        <Link to="/recurring/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            New schedule
          </Button>
        </Link>
      </div>

      <Card>
        {loading ? (
          <div className="p-6 space-y-3">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
          </div>
        ) : error ? (
          <ErrorState title="Could not load your schedules" onRetry={load} />
        ) : schedules.length === 0 ? (
          <EmptyState
            icon={Repeat}
            title="No recurring invoices"
            description="Set one up for a retainer client and stop retyping the same invoice."
          />
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-white/8">
            {schedules.map((schedule) => (
              <li key={schedule.id} className="flex flex-wrap items-center justify-between gap-4 p-4">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {schedule.client_name} · {FREQUENCY[schedule.frequency]}
                    {!schedule.is_active && (
                      <span className="ml-2 text-sm text-amber-700 dark:text-amber-300">Paused</span>
                    )}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {amount(schedule)} before tax · next {when(schedule.next_run)}
                    {schedule.auto_send ? ' · sent automatically' : ' · saved as a draft'}
                    {schedule.end_date ? ` · until ${when(schedule.end_date)}` : ''}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => toggle(schedule)}>
                    {schedule.is_active ? 'Pause' : 'Resume'}
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => remove(schedule)}>
                    Delete
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}

export default RecurringList
