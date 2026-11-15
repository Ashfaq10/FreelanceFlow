import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft, Edit, Send, Download, CheckCircle, Trash2,
  MoreVertical, Palette, LayoutTemplate, ChevronDown, ChevronUp, CreditCard, Plus, Copy, Bell, Ban,
  Link as LinkIcon
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Card, Button, Modal, Skeleton, Input, Select, StatusBadge } from '../../components/ui'
import InvoicePreview, { TEMPLATES, COLOR_PALETTES } from '../../components/ui/InvoicePreview'
import { invoices as invoiceApi } from '../../api/endpoints'
import { formatCurrency as formatMoney } from '../../utils/formatters'
import { parseDateOnly } from '../../utils/dates'

const STORAGE_KEY_TEMPLATE = 'invoice_template'


function MenuItem({ icon: Icon, label, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center w-full px-4 py-2.5 text-sm transition-colors ${
        danger
          ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/8'
          : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5'
      }`}
    >
      <Icon className="w-4 h-4 mr-3" />{label}
    </button>
  )
}

function InvoiceDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [invoice, setInvoice] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState('')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentForm, setPaymentForm] = useState({ amount: '', method: 'bank', notes: '' })

  const currency = invoice?.currency || 'USD'
  const formatCurrency = (amount) => formatMoney(amount, currency)
  const formatDate = (value) => parseDateOnly(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  // Template / colour state (persisted)
  const [templateId, setTemplateId] = useState(
    () => localStorage.getItem(STORAGE_KEY_TEMPLATE) || 'professional'
  )
  const [colorId, setColorId] = useState('indigo')
  const [showDesignPanel, setShowDesignPanel] = useState(false)

  const selectTemplate = (id) => {
    setTemplateId(id)
    localStorage.setItem(STORAGE_KEY_TEMPLATE, id)
  }
  // The colour lives on the invoice, so the emailed PDF matches the one you download (BUG-16).
  const selectColor = async (color) => {
    const previous = colorId
    setColorId(color)
    try {
      await invoiceApi.update(id, { pdf_color: color })
    } catch (error) {
      setColorId(previous)
      toast.error(apiError(error, 'Could not save the colour'))
    }
  }

  const fetchInvoice = useCallback(async () => {
    try {
      const response = await invoiceApi.get(id)
      setInvoice(response.data)
      setColorId(response.data.pdf_color || 'indigo')
    } catch (error) {
      toast.error('Failed to load invoice')
      navigate('/invoices')
    } finally {
      setLoading(false)
    }
  }, [id, navigate])

  useEffect(() => { fetchInvoice() }, [fetchInvoice])

  const apiError = (error, fallback) =>
    error.response?.data?.error || error.response?.data?.message || fallback

  const handleSend = async () => {
    setActionLoading('send')
    try {
      await invoiceApi.send(id)
      // The task runs in the background; the invoice is only "sent" once its status says so (BUG-9).
      toast.success('Queued — the invoice is being sent to your client')
      fetchInvoice()
    } catch (error) {
      toast.error(apiError(error, 'Failed to send invoice'))
    } finally { setActionLoading('') }
  }

  const handleMarkPaid = async () => {
    setActionLoading('paid')
    try {
      await invoiceApi.markPaid(id)
      toast.success('Invoice marked as paid')
      fetchInvoice()
    } catch (error) { toast.error(apiError(error, 'Failed to mark as paid')) }
    finally { setActionLoading('') }
  }

  const handleDuplicate = async () => {
    setShowDropdown(false)
    try {
      const { data } = await invoiceApi.duplicate(id)
      toast.success(`${data.invoice_number} created as a draft`)
      navigate(`/invoices/${data.id}`)
    } catch (error) {
      toast.error(apiError(error, 'Could not duplicate this invoice'))
    }
  }

  const handleRemind = async () => {
    setShowDropdown(false)
    try {
      await invoiceApi.remind(id)
      toast.success('Queued — a reminder is on its way')
    } catch (error) {
      toast.error(apiError(error, 'Could not send a reminder'))
    }
  }

  const handleCancel = async () => {
    setShowDropdown(false)
    try {
      const { data } = await invoiceApi.cancel(id)
      setInvoice(data)
      toast.success('Invoice cancelled')
    } catch (error) {
      toast.error(apiError(error, 'Could not cancel this invoice'))
    }
  }

  // The tokenised page the client sees; the email links here too (FEAT-3).
  const handleCopyClientLink = async () => {
    setShowDropdown(false)
    try {
      await navigator.clipboard.writeText(invoice.public_url)
      toast.success('Client link copied')
    } catch {
      toast.error('Could not copy the link')
    }
  }

  // Stripe Checkout link for the client; the freelancer copies or opens it (PAY-2).
  const handlePayLink = async () => {
    setActionLoading('paylink')
    try {
      const { data } = await invoiceApi.checkout(id)
      await navigator.clipboard.writeText(data.url).catch(() => {})
      window.open(data.url, '_blank', 'noopener')
      toast.success('Payment link copied and opened')
      fetchInvoice()
    } catch (error) {
      toast.error(apiError(error, 'Could not create a payment link'))
    } finally { setActionLoading('') }
  }

  const handleRecordPayment = async () => {
    setActionLoading('payment')
    try {
      const { data } = await invoiceApi.recordPayment(id, paymentForm)
      setInvoice(data)
      setShowPaymentModal(false)
      setPaymentForm({ amount: '', method: 'bank', notes: '' })
      toast.success('Payment recorded')
    } catch (error) {
      toast.error(apiError(error, 'Could not record the payment'))
    } finally { setActionLoading('') }
  }

  const handleDownload = async () => {
    setActionLoading('download')
    try {
      const response = await invoiceApi.getPdf(id, {
        regenerate: true,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      })
      const blob = new Blob([response.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `invoice-${invoice.invoice_number}.pdf`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (error) { toast.error(apiError(error, 'Failed to download PDF')) }
    finally { setActionLoading('') }
  }

  const handleDelete = async () => {
    setActionLoading('delete')
    try {
      await invoiceApi.delete(id)
      toast.success('Invoice deleted')
      navigate('/invoices')
    } catch (error) {
      toast.error(apiError(error, 'Failed to delete invoice'))
    } finally { setActionLoading(''); setShowDeleteModal(false) }
  }


  const currentColor = COLOR_PALETTES.find(c => c.id === colorId) || COLOR_PALETTES[0]

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="w-10 h-10 rounded-xl" />
          <div><Skeleton className="h-6 w-32 mb-2" /><Skeleton className="h-4 w-48" /></div>
        </div>
        <Skeleton.Card />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-up">
      {/* ── Page Header ──────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/invoices')}
            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/8 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{invoice.invoice_number}</h1>
              <StatusBadge status={invoice.status} />
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">{invoice.client_name}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {invoice.status === 'draft' && (
            <>
              <Link to={`/invoices/${id}/edit`}>
                <Button variant="secondary" size="sm">
                  <Edit className="w-4 h-4 mr-1.5" />Edit
                </Button>
              </Link>
              <Button size="sm" onClick={handleSend} loading={actionLoading === 'send'}>
                <Send className="w-4 h-4 mr-1.5" />Send
              </Button>
            </>
          )}
          {['sent', 'overdue'].includes(invoice.status) && (
            <>
              <Button size="sm" onClick={handleMarkPaid} loading={actionLoading === 'paid'}>
                <CheckCircle className="w-4 h-4 mr-1.5" />Mark Paid
              </Button>
              <Button variant="secondary" size="sm" onClick={handlePayLink} loading={actionLoading === 'paylink'}>
                <CreditCard className="w-4 h-4 mr-1.5" />Payment Link
              </Button>
            </>
          )}
          <Button variant="secondary" size="sm" onClick={handleDownload} loading={actionLoading === 'download'}>
            <Download className="w-4 h-4 mr-1.5" />Download PDF
          </Button>

          {/* More menu: whatever this invoice's status allows (FEAT-2, BUG-10) */}
          <div className="relative">
            <Button variant="ghost" size="sm" onClick={() => setShowDropdown(!showDropdown)}>
              <MoreVertical className="w-4 h-4" />
            </Button>
            {showDropdown && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)} />
                <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-gray-800/95 rounded-2xl shadow-xl border border-gray-200/80 dark:border-white/10 py-1.5 z-20"
                  style={{ backdropFilter: 'blur(16px)' }}>
                  <MenuItem icon={Copy} label="Duplicate" onClick={handleDuplicate} />
                  {['sent', 'overdue', 'paid'].includes(invoice.status) && (
                    <MenuItem icon={LinkIcon} label="Copy client link" onClick={handleCopyClientLink} />
                  )}
                  {['sent', 'overdue'].includes(invoice.status) && (
                    <>
                      <MenuItem icon={Send} label="Send again" onClick={handleSend} />
                      <MenuItem icon={Bell} label="Send reminder" onClick={handleRemind} />
                    </>
                  )}
                  {['draft', 'sent', 'overdue'].includes(invoice.status) && (
                    <MenuItem icon={Ban} label="Cancel invoice" onClick={handleCancel} danger />
                  )}
                  {invoice.status === 'draft' && (
                    <MenuItem icon={Trash2} label="Delete invoice" danger
                      onClick={() => { setShowDropdown(false); setShowDeleteModal(true) }} />
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Design Picker ─────────────────────────────── */}
      <Card>
        <button
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50/80 dark:hover:bg-white/4 transition-colors rounded-2xl"
          onClick={() => setShowDesignPanel(!showDesignPanel)}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: currentColor.primary }}>
              <Palette className="w-4 h-4 text-white" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">Invoice Design</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                {TEMPLATES.find(t => t.id === templateId)?.name} · {COLOR_PALETTES.find(c => c.id === colorId)?.name}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Color swatch row */}
            <div className="hidden sm:flex gap-1">
              {COLOR_PALETTES.map(c => (
                <div key={c.id} className="w-4 h-4 rounded-full border-2 transition-all"
                  style={{
                    background: c.primary,
                    borderColor: c.id === colorId ? '#1f2937' : 'transparent',
                    transform: c.id === colorId ? 'scale(1.2)' : 'scale(1)',
                  }}
                />
              ))}
            </div>
            {showDesignPanel ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </div>
        </button>

        {showDesignPanel && (
          <div className="px-5 pb-5 border-t border-gray-100 dark:border-white/8 pt-4 space-y-5 animate-fade-up">
            {/* Templates */}
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3 flex items-center gap-2">
                <LayoutTemplate className="w-3.5 h-3.5" />Template
              </p>
              <p className="text-xs text-gray-400 mb-3 -mt-2">
                Changes the preview above. The PDF keeps its own layout and uses the colour below.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                {TEMPLATES.map(t => (
                  <button
                    key={t.id}
                    onClick={() => selectTemplate(t.id)}
                    className="group relative px-3 py-3 rounded-xl border-2 text-left transition-all duration-150"
                    style={{
                      borderColor: t.id === templateId ? currentColor.primary : 'transparent',
                      background: t.id === templateId ? currentColor.light : undefined,
                    }}
                  >
                    {t.id !== templateId && (
                      <div className="absolute inset-0 rounded-xl border border-gray-200 dark:border-white/10 group-hover:border-gray-300 dark:group-hover:border-white/20 transition-colors" />
                    )}
                    <p className="text-sm font-bold text-gray-900 dark:text-white" style={{ color: t.id === templateId ? currentColor.primary : undefined }}>{t.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5 leading-tight">{t.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Colors */}
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3 flex items-center gap-2">
                <Palette className="w-3.5 h-3.5" />Colour
              </p>
              <div className="flex flex-wrap gap-2">
                {COLOR_PALETTES.map(c => (
                  <button
                    key={c.id}
                    onClick={() => selectColor(c.id)}
                    title={c.name}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl border-2 transition-all text-sm font-medium"
                    style={{
                      borderColor: c.id === colorId ? c.primary : 'transparent',
                      background: c.id === colorId ? c.light : undefined,
                      color: c.id === colorId ? c.primary : '#6b7280',
                    }}
                  >
                    <div className="w-4 h-4 rounded-full flex-shrink-0 ring-2 ring-white dark:ring-gray-900" style={{ background: c.primary }} />
                    {c.name}
                    {c.id !== colorId && <div className="absolute inset-0 rounded-xl border border-gray-200 dark:border-white/10" style={{ position: 'relative' }} />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* ── Invoice Preview ──────────────────────────── */}
      <Card>
        <Card.Content className="p-8">
          <InvoicePreview invoice={invoice} templateId={templateId} colorId={colorId} />
        </Card.Content>
      </Card>

      {/* ── Payments (PAY-3) ─────────────────────────── */}
      {(invoice.payments?.length > 0 || ['sent', 'overdue'].includes(invoice.status)) && (
        <Card>
          <Card.Header className="flex items-center justify-between">
            <Card.Title>Payments</Card.Title>
            {['sent', 'overdue'].includes(invoice.status) && (
              <Button size="sm" variant="secondary" onClick={() => setShowPaymentModal(true)}>
                <Plus className="w-4 h-4 mr-1.5" />Record Payment
              </Button>
            )}
          </Card.Header>
          <Card.Content>
            <div className="flex gap-8 mb-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-400">Paid</p>
                <p className="text-lg font-semibold text-green-600">{formatCurrency(invoice.amount_paid)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-400">Still due</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">{formatCurrency(invoice.amount_due)}</p>
              </div>
            </div>
            {invoice.payments?.length > 0 ? (
              <ul className="divide-y divide-gray-100 dark:divide-white/8 text-sm">
                {invoice.payments.map(payment => (
                  <li key={payment.id} className="flex items-center justify-between py-2">
                    <span className="text-gray-600 dark:text-gray-400">
                      {formatDate(payment.paid_on)} · {Number(payment.amount) < 0 ? 'refund' : payment.method}{payment.notes && Number(payment.amount) > 0 ? ` · ${payment.notes}` : ''}
                    </span>
                    <span className={`font-medium ${Number(payment.amount) < 0 ? 'text-red-600' : ''}`}>
                      {formatCurrency(payment.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">No payments recorded yet.</p>
            )}
          </Card.Content>
        </Card>
      )}

      {/* ── Record Payment Modal ─────────────────────── */}
      <Modal isOpen={showPaymentModal} onClose={() => setShowPaymentModal(false)} title="Record Payment"
        description={`${formatCurrency(invoice.amount_due)} still due on ${invoice.invoice_number}.`}>
        <div className="space-y-4">
          <Input
            label="Amount"
            type="number"
            step="0.01"
            min="0.01"
            max={invoice.amount_due}
            value={paymentForm.amount}
            onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
          />
          <Select
            label="Method"
            value={paymentForm.method}
            onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}
            options={[
              { value: 'bank', label: 'Bank transfer' },
              { value: 'cash', label: 'Cash' },
              { value: 'check', label: 'Check' },
              { value: 'stripe', label: 'Stripe' },
              { value: 'manual', label: 'Other' },
            ]}
          />
          <Input
            label="Reference (optional)"
            value={paymentForm.notes}
            onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
          />
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setShowPaymentModal(false)}>Cancel</Button>
          <Button onClick={handleRecordPayment} loading={actionLoading === 'payment'}>Record Payment</Button>
        </div>
      </Modal>

      {/* ── Delete Modal ─────────────────────────────── */}
      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Delete Invoice"
        description="This action cannot be undone.">
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Are you sure you want to delete invoice <strong>{invoice?.invoice_number}</strong>?
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
          <Button variant="danger" onClick={handleDelete} loading={actionLoading === 'delete'}>
            Delete Invoice
          </Button>
        </div>
      </Modal>
    </div>
  )
}

export default InvoiceDetail
