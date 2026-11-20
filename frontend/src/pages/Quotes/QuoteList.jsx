import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FileSignature, Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import { Card, Button, EmptyState, ErrorState, Skeleton } from '../../components/ui'
import { quotes as quotesApi } from '../../api/endpoints'
import { fetchAllPages } from '../../utils/pagination'
import { formatCurrency } from '../../utils/formatters'
import { parseDateOnly } from '../../utils/dates'

const LABEL = { draft: 'Draft', sent: 'Sent', accepted: 'Accepted', declined: 'Declined', converted: 'Converted' }
const day = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' })

const apiError = (error, fallback) => error.response?.data?.error || error.response?.data?.detail || fallback

/** Proposals: send one, see the answer, turn the accepted ones into invoices (FEAT-4). */
function QuoteList() {
  const navigate = useNavigate()
  const [quotes, setQuotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      setQuotes(await fetchAllPages(quotesApi.list))
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const run = async (action, success) => {
    try {
      const result = await action()
      if (success) toast.success(success)
      await load()
      return result
    } catch (err) {
      toast.error(apiError(err, 'That did not work'))
    }
  }

  const convert = async (quote) => {
    const result = await run(() => quotesApi.convert(quote.id))
    if (result) navigate(`/invoices/${result.data.id}`)
  }

  const copyLink = async (quote) => {
    await navigator.clipboard.writeText(quote.public_url)
    toast.success('Client link copied')
  }

  const download = async (quote) => {
    try {
      const { data } = await quotesApi.pdf(quote.id)
      const url = window.URL.createObjectURL(data)
      const link = document.createElement('a')
      link.href = url
      link.download = `${quote.number}.pdf`
      link.click()
      window.URL.revokeObjectURL(url)
    } catch {
      toast.error('Could not download the PDF')
    }
  }

  const remove = (quote) =>
    window.confirm(`Delete draft ${quote.number}?`) && run(() => quotesApi.delete(quote.id), 'Quote deleted')

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Quotes</h1>
          <p className="text-gray-500 dark:text-gray-400">Send a proposal, then turn it into an invoice</p>
        </div>
        <Link to="/quotes/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            New quote
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
          <ErrorState title="Could not load your quotes" onRetry={load} />
        ) : quotes.length === 0 ? (
          <EmptyState icon={FileSignature} title="No quotes yet" description="Price the work before you do it." />
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-white/8">
            {quotes.map((quote) => {
              const status = quote.is_expired ? 'Expired' : LABEL[quote.status]
              return (
                <li key={quote.id} className="flex flex-wrap items-center justify-between gap-4 p-4">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {quote.number} · {quote.client_name}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {formatCurrency(quote.total, quote.currency)} · {status} · valid until{' '}
                      {day.format(parseDateOnly(quote.valid_until))}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {quote.status === 'draft' && (
                      <Link to={`/quotes/${quote.id}/edit`}>
                        <Button size="sm" variant="secondary">
                          Edit
                        </Button>
                      </Link>
                    )}
                    {['draft', 'sent'].includes(quote.status) && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => run(() => quotesApi.send(quote.id), 'Queued — the quote is being sent')}
                      >
                        {quote.status === 'draft' ? 'Send' : 'Send again'}
                      </Button>
                    )}
                    {quote.status !== 'draft' && (
                      <Button size="sm" variant="secondary" onClick={() => copyLink(quote)}>
                        Copy link
                      </Button>
                    )}
                    <Button size="sm" variant="secondary" onClick={() => download(quote)}>
                      PDF
                    </Button>
                    {['draft', 'sent', 'accepted'].includes(quote.status) && (
                      <Button size="sm" onClick={() => convert(quote)}>
                        Convert to invoice
                      </Button>
                    )}
                    {quote.status === 'converted' && quote.invoice && (
                      <Link to={`/invoices/${quote.invoice}`}>
                        <Button size="sm" variant="secondary">
                          View invoice
                        </Button>
                      </Link>
                    )}
                    {quote.status === 'draft' && (
                      <Button size="sm" variant="danger" onClick={() => remove(quote)}>
                        Delete
                      </Button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Card>
    </div>
  )
}

export default QuoteList
