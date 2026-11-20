import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { Download, CreditCard } from 'lucide-react'
import toast from 'react-hot-toast'
import { Card, Button, Badge, Skeleton, ErrorState, Wordmark } from '../../components/ui'
import api from '../../api/client'
import { formatCurrency as formatMoney } from '../../utils/formatters'
import { taxRowsOf } from '../../components/invoice/format'

/** The page a client opens from the invoice email: no account, token in the URL (FEAT-3). */
function PublicInvoice() {
  const { token } = useParams()
  const [invoice, setInvoice] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [paying, setPaying] = useState(false)

  const fetchInvoice = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const { data } = await api.get(`/api/public/invoices/${token}/`)
      setInvoice(data)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { fetchInvoice() }, [fetchInvoice])

  const money = (amount) => formatMoney(amount, invoice?.currency || 'USD')

  const handlePay = async () => {
    setPaying(true)
    try {
      const { data } = await api.post(`/api/public/invoices/${token}/checkout/`)
      window.location.href = data.url
    } catch (error) {
      toast.error(error.response?.data?.error || 'Payment could not be started')
      setPaying(false)
    }
  }

  const handleDownload = async () => {
    try {
      const response = await api.get(`/api/public/invoices/${token}/pdf/`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }))
      const link = document.createElement('a')
      link.href = url
      link.download = `invoice-${invoice.invoice_number}.pdf`
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
          title="This invoice link is not valid"
          description="It may have been cancelled, or the link may be incomplete. Ask the sender for a new one."
          onRetry={fetchInvoice}
        />
      </div>
    )
  }

  const statusVariant = { sent: 'info', overdue: 'danger', paid: 'success' }[invoice.status] || 'gray'

  return (
    <div className="min-h-screen bg-surface-light dark:bg-surface-dark py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Wordmark />
          <Badge variant={statusVariant}>{invoice.status}</Badge>
        </div>

        <Card>
          <Card.Header>
            <Card.Title>Invoice {invoice.invoice_number}</Card.Title>
            <Card.Description>
              From {invoice.business_name} to {invoice.client_name} · due{' '}
              {new Date(invoice.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </Card.Description>
          </Card.Header>
          <Card.Content>
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
                {invoice.items.map(item => (
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
                <div className="flex justify-between"><dt>Subtotal</dt><dd>{money(invoice.subtotal)}</dd></div>
                {Number(invoice.discount_amount) > 0 && (
                  <div className="flex justify-between"><dt>Discount</dt><dd>-{money(invoice.discount_amount)}</dd></div>
                )}
                {taxRowsOf(invoice).map((row) => (
                  <div key={row.rate} className="flex justify-between"><dt>Tax ({Number(row.rate)}%)</dt><dd>{money(row.tax)}</dd></div>
                ))}
                <div className="flex justify-between font-semibold text-base pt-1 border-t border-gray-200 dark:border-white/10">
                  <dt>Total</dt><dd>{money(invoice.total)}</dd>
                </div>
                {Number(invoice.amount_paid) > 0 && (
                  <div className="flex justify-between text-green-600"><dt>Paid</dt><dd>{money(invoice.amount_paid)}</dd></div>
                )}
                <div className="flex justify-between font-semibold">
                  <dt>Due</dt><dd>{money(invoice.amount_due)}</dd>
                </div>
              </dl>
            </div>

            {invoice.notes && (
              <p className="mt-6 text-sm text-gray-500 dark:text-gray-400 whitespace-pre-line">{invoice.notes}</p>
            )}
          </Card.Content>
        </Card>

        <div className="flex flex-wrap gap-3 justify-end">
          <Button variant="secondary" onClick={handleDownload}>
            <Download className="w-4 h-4 mr-1.5" />Download PDF
          </Button>
          {invoice.status !== 'paid' && (
            <Button onClick={handlePay} loading={paying}>
              <CreditCard className="w-4 h-4 mr-1.5" />Pay {money(invoice.amount_due)}
            </Button>
          )}
        </div>

        <p className="text-center text-xs text-gray-400">
          Questions? Contact {invoice.business_email || invoice.business_name}.
        </p>
      </div>
    </div>
  )
}

export default PublicInvoice
