import { AlertTriangle } from 'lucide-react'
import EmptyState from './EmptyState'

/** Shown when a fetch failed — "nothing here yet" would be a lie (BUG-15). */
function ErrorState({ title = 'Could not load this', description = 'Something went wrong. Check your connection and try again.', onRetry }) {
  return (
    <EmptyState
      icon={AlertTriangle}
      title={title}
      description={description}
      action={!!onRetry}
      actionLabel="Try again"
      onAction={onRetry}
    />
  )
}

export default ErrorState
