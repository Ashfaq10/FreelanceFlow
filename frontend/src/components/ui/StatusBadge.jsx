import Badge from './Badge'

const VARIANTS = { draft: 'gray', sent: 'info', overdue: 'danger', paid: 'success', cancelled: 'gray' }

/** One place that decides how an invoice status looks (was copied into four pages). */
function StatusBadge({ status }) {
  return <Badge variant={VARIANTS[status] || 'gray'}>{status}</Badge>
}

export default StatusBadge
