import { Card } from '../../components/ui'

const LABELS = {
  created: 'Created',
  sent: 'Sent to client',
  viewed: 'Viewed by client',
  reminder: 'Reminder sent',
  payment: 'Payment received',
  credit: 'Credit note issued',
  refund: 'Refunded',
  paid: 'Paid in full',
  overdue: 'Became overdue',
  cancelled: 'Cancelled',
}

const stamp = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })

/** What happened to this invoice and when; the server writes the events (FEAT-4). */
function ActivityTimeline({ events = [] }) {
  if (events.length === 0) return null
  return (
    <Card>
      <Card.Header>
        <Card.Title>Activity</Card.Title>
      </Card.Header>
      <Card.Content>
        <ol className="space-y-3 text-sm">
          {events.map((event) => (
            <li key={event.id} className="flex items-baseline justify-between gap-4">
              <span className="text-gray-900 dark:text-white">
                {LABELS[event.kind] ?? event.kind}
                {event.detail && <span className="text-gray-600 dark:text-gray-400"> · {event.detail}</span>}
              </span>
              <time dateTime={event.created_at} className="shrink-0 text-gray-500 dark:text-gray-400">
                {stamp.format(new Date(event.created_at))}
              </time>
            </li>
          ))}
        </ol>
      </Card.Content>
    </Card>
  )
}

export default ActivityTimeline
