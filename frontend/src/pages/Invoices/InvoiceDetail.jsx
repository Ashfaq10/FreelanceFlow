import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft, Edit, Send, Download, CheckCircle, Trash2,
  MoreVertical, Palette, LayoutTemplate, ChevronDown, ChevronUp
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Card, Badge, Button, Modal, Skeleton } from '../../components/ui'
import InvoicePreview, { TEMPLATES, COLOR_PALETTES } from '../../components/ui/InvoicePreview'
import { invoices as invoiceApi } from '../../api/endpoints'

const STORAGE_KEY_TEMPLATE = 'invoice_template'
const STORAGE_KEY_COLOR = 'invoice_color'

function InvoiceDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [invoice, setInvoice] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState('')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)

  // Template / colour state (persisted)
  const [templateId, setTemplateId] = useState(
    () => localStorage.getItem(STORAGE_KEY_TEMPLATE) || 'professional'
  )
  const [colorId, setColorId] = useState(
    () => localStorage.getItem(STORAGE_KEY_COLOR) || 'blue'
  )
  const [showDesignPanel, setShowDesignPanel] = useState(false)

  const selectTemplate = (id) => {
    setTemplateId(id)
    localStorage.setItem(STORAGE_KEY_TEMPLATE, id)
  }
  const selectColor = (id) => {
    setColorId(id)
    localStorage.setItem(STORAGE_KEY_COLOR, id)
  }

  useEffect(() => { fetchInvoice() }, [id])

  const fetchInvoice = async () => {
    try {
      const response = await invoiceApi.get(id)
      setInvoice(response.data)
    } catch (error) {
      toast.error('Failed to load invoice')
      navigate('/invoices')
    } finally {
      setLoading(false)
    }
  }

  const handleSend = async () => {
    setActionLoading('send')
    try {
      await invoiceApi.send(id)
      toast.success('Invoice sent to client')
      fetchInvoice()
    } catch { toast.error('Failed to send invoice') }
    finally { setActionLoading('') }
  }

  const handleMarkPaid = async () => {
    setActionLoading('paid')
    try {
      await invoiceApi.markPaid(id)
      toast.success('Invoice marked as paid')
      fetchInvoice()
    } catch { toast.error('Failed to mark as paid') }
    finally { setActionLoading('') }
  }

  const handleDownload = async () => {
    setActionLoading('download')
    try {
      const response = await invoiceApi.getPdf(id, {
        template: templateId,
        color: colorId,
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
    } catch { toast.error('Failed to download PDF') }
    finally { setActionLoading('') }
  }

  const handleDelete = async () => {
    setActionLoading('delete')
    try {
      await invoiceApi.delete(id)
      toast.success('Invoice deleted')
      navigate('/invoices')
    } catch { toast.error('Failed to delete invoice') }
    finally { setActionLoading(''); setShowDeleteModal(false) }
  }

  const getStatusBadge = (status) => {
    const variants = { draft: 'gray', sent: 'info', overdue: 'danger', paid: 'success', cancelled: 'gray' }
    return <Badge variant={variants[status]}>{status}</Badge>
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
              {getStatusBadge(invoice.status)}
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
          {invoice.status === 'sent' && (
            <Button size="sm" onClick={handleMarkPaid} loading={actionLoading === 'paid'}>
              <CheckCircle className="w-4 h-4 mr-1.5" />Mark Paid
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={handleDownload} loading={actionLoading === 'download'}>
            <Download className="w-4 h-4 mr-1.5" />Download PDF
          </Button>

          {/* More menu */}
          <div className="relative">
            <Button variant="ghost" size="sm" onClick={() => setShowDropdown(!showDropdown)}>
              <MoreVertical className="w-4 h-4" />
            </Button>
            {showDropdown && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)} />
                <div className="absolute right-0 mt-2 w-44 bg-white dark:bg-gray-800/95 rounded-2xl shadow-xl border border-gray-200/80 dark:border-white/10 py-1.5 z-20"
                  style={{ backdropFilter: 'blur(16px)' }}>
                  <button
                    onClick={() => { setShowDropdown(false); setShowDeleteModal(true) }}
                    className="flex items-center w-full px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/8 transition-colors"
                  >
                    <Trash2 className="w-4 h-4 mr-3" />Delete Invoice
                  </button>
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
