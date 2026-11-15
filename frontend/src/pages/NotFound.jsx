import { Link } from 'react-router-dom'
import { Wordmark } from '../components/ui'

function NotFound() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 px-6 text-center bg-surface-light dark:bg-surface-dark">
      <Wordmark />
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-gray-900 dark:text-white">Page not found</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          That address does not exist, or the invoice link is incomplete.
        </p>
      </div>
      <Link to="/" className="btn btn-primary">
        Go to your dashboard
      </Link>
    </main>
  )
}

export default NotFound
