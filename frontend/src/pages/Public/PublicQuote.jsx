import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { Download, Check, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { Card, Button, Skeleton, ErrorState, Wordmark } from '../../components/ui'
import api from '../../api/client'
import { formatCurrency as formatMoney } from '../../utils/formatters'
import { taxRowsOf } from '../../components/invoice/format'
import { parseDateOnly } from '../../utils/dates'

const STATUS_NOTE = {
  accepted: 'You accepted this quote. Thank you.',
  declined: 'You declined this quote.',
  converted: 'You accepted this quote and it has been turned into an invoice.',
}

/** The page a client opens from the quote email: read, then accept or decline. No account (FEAT-4). */
function PublicQuote() {
  const { token } = useParams()
  const [quote, setQuote] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [answering, setAnswering] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      setQuote((await api.get(`/api/public/quotes/${token}/`)).data)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    load()
  }, [load])

  const money = (amount) => formatMoney(amount, quote?.currency || 'USD')
  const day = (value) => parseDateOnly(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  const answer = async (action) => {
    setAnswering(action)
    try {
      await api.post(`/api/public/quotes/${token}/${action}/`)
      await load()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not record your answer')
    } finally {
      setAnswering('')
    }
  }

  const download = async () => {
    try {
      const { data } = await api.get(`/api/public/quotes/${token}/pdf/`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([data], { type: 'application/pdf' }))
      const link = document.createElement('a')
      link.href = url
      link.download = `quote-${quote.number}.pdf`
      link.click()
      window.URL.revokeObjectURL(url)
    } catch {
      toast.error('Could not download the PDF')
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton.Card />
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <ErrorState
          title="This quote link is not valid"
          description="It may have been withdrawn, or the link may be incomplete. Ask the sender for a new one."
          onRetry={load}
        />
      </div>
    )
  }

  const open = quote.status === 'sent' && !quote.is_expired

  return (
    <main className="min-h-screen bg-surface-light dark:bg-surface-dark py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="sr-only">Quote {quote.number}</h1>
        <Wordmark />
        <Card>
          <Card.Header>
            <Card.Title>
              Quote {quote.number} from {quote.business_name}
            </Card.Title>
            <Card.Description>
              For {quote.client_name} · valid until {day(quote.valid_until)}
            </Card.Description>
          </Card.Header>
          <Card.Content>
            {STATUS_NOTE[quote.status] && (
              <p role="status" className="mb-4 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 px-3 py-2 text-sm text-emerald-800 dark:text-emerald-200">
                {STATUS_NOTE[quote.status]}
              </p>
            )}
            {quote.is_expired && (
              <p role="status" className="mb-4 rounded-lg bg-amber-50 dark:bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-200">
                This quote has expired. Ask {quote.business_name} for a new one.
              </p>
            )}
            <table className="w-full text-sm mb-6">
              <thead>
                <tr className="text-left text-gray-500 dark:text-gray-400">
                  <th className="py-2 font-medium">Description</th>
                  <th className="py-2 pl-3 font-medium text-right">Qty</th>
                  <th className="py-2 pl-3 font-medium text-right hidden sm:table-cell">Rate</th>
                  <th className="py-2 pl-3 font-medium text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/8">
                {quote.items.map((item) => (
                  <tr key={item.id}>
                    <td className="py-2">{item.description}</td>
                    <td className="py-2 pl-3 text-right">{item.quantity}</td>
                    <td className="py-2 pl-3 text-right hidden sm:table-cell">{money(item.unit_price)}</td>
                    <td className="py-2 pl-3 text-right font-medium">{money(item.line_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-end">
              <dl className="w-56 space-y-1 text-sm">
                <div className="flex justify-between"><dt>Subtotal</dt><dd>{money(quote.subtotal)}</dd></div>
                {Number(quote.discount_amount) > 0 && (
                  <div className="flex justify-between"><dt>Discount</dt><dd>-{money(quote.discount_amount)}</dd></div>
                )}
                {taxRowsOf(quote).map((row) => (
                  <div key={row.rate} className="flex justify-between"><dt>Tax ({Number(row.rate)}%)</dt><dd>{money(row.tax)}</dd></div>
                ))}
                <div className="flex justify-between font-semibold text-base pt-1 border-t border-gray-200 dark:border-white/10">
                  <dt>Total</dt><dd>{money(quote.total)}</dd>
                </div>
              </dl>
            </div>
            {quote.notes && <p className="mt-6 text-sm text-gray-500 dark:text-gray-400 whitespace-pre-line">{quote.notes}</p>}
          </Card.Content>
        </Card>

        <div className="flex flex-wrap gap-3 justify-end">
          <Button variant="secondary" onClick={download}>
            <Download className="w-4 h-4 mr-1.5" />
            Download PDF
          </Button>
          {open && (
            <>
              <Button variant="secondary" onClick={() => answer('decline')} loading={answering === 'decline'}>
                <X className="w-4 h-4 mr-1.5" />
                Decline
              </Button>
              <Button onClick={() => answer('accept')} loading={answering === 'accept'}>
                <Check className="w-4 h-4 mr-1.5" />
                Accept quote
              </Button>
            </>
          )}
        </div>
        <p className="text-center text-xs text-gray-600 dark:text-gray-400">Questions? Contact {quote.business_email || quote.business_name}.</p>
      </div>
    </main>
  )
}

export default PublicQuote
