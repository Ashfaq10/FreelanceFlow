import { useState, useEffect } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { Plus, Search, FileText, Download } from 'lucide-react'
import toast from 'react-hot-toast'
import { Card, Table, Button, EmptyState, ErrorState, Skeleton, Pagination, StatusBadge } from '../../components/ui'
import { invoices as invoiceApi } from '../../api/endpoints'
import { formatCurrency as formatMoney } from '../../utils/formatters'
import { useCurrency } from '../../hooks/useCurrency'

function InvoiceList() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [downloadingId, setDownloadingId] = useState(null)
  const [invoiceList, setInvoices] = useState([])
  const [count, setCount] = useState(0)
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '')
  const page = Number(searchParams.get('page')) || 1
  const [error, setError] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    const fetchInvoices = async () => {
      setLoading(true)
      setError(false)
      try {
        const params = {
          search: searchParams.get('search'),
          status: searchParams.get('status'),
          page: Number(searchParams.get('page')) || 1,
        }
        const response = await invoiceApi.list(params)
        setInvoices(response.data.results || response.data || [])
        setCount(response.data.count ?? (response.data.results || response.data || []).length)
      } catch (err) {
        console.error('Failed to fetch invoices:', err)
        setError(true)
      } finally {
        setLoading(false)
      }
    }
    fetchInvoices()
  }, [searchParams, reloadKey])

  const goToPage = (next) => {
    const params = new URLSearchParams(searchParams)
    if (next > 1) params.set('page', String(next))
    else params.delete('page')
    setSearchParams(params)
  }

  const handleSearch = (e) => {
    e.preventDefault()
    const params = new URLSearchParams(searchParams)
    if (search) {
      params.set('search', search)
    } else {
      params.delete('search')
    }
    setSearchParams(params)
  }

  const handleStatusFilter = (status) => {
    setStatusFilter(status)
    const params = new URLSearchParams(searchParams)
    if (status) {
      params.set('status', status)
    } else {
      params.delete('status')
    }
    setSearchParams(params)
  }

  // Fallback only: an invoice carries its own currency since DATA-7.
  const currency = useCurrency()

  const formatDate = (date) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  const handleDownload = async (e, invoice) => {
    e.stopPropagation()
    setDownloadingId(invoice.id)
    try {
      const response = await invoiceApi.getPdf(invoice.id, {
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      })
      const blob = new Blob([response.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `invoice-${invoice.invoice_number}.pdf`
      a.click()
      window.URL.revokeObjectURL(url)
      toast.success('PDF downloaded')
    } catch {
      toast.error('Failed to download PDF')
    } finally {
      setDownloadingId(null)
    }
  }


  const statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'draft', label: 'Draft' },
    { value: 'sent', label: 'Sent' },
    { value: 'paid', label: 'Paid' },
    { value: 'overdue', label: 'Overdue' },
    { value: 'cancelled', label: 'Cancelled' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Invoices</h1>
          <p className="text-gray-500 dark:text-gray-400">Manage and track your invoices</p>
        </div>
        <Link to="/invoices/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            New Invoice
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <Card.Content className="py-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <form onSubmit={handleSearch} className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  aria-label="Search invoices"
                  placeholder="Search invoices..."
                  className="input pl-10"
                />
              </div>
            </form>
            <div className="flex gap-2 overflow-x-auto">
              {statusOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleStatusFilter(option.value)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
                    statusFilter === option.value
                      ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </Card.Content>
      </Card>

      {/* Invoice List */}
      <Card>
        {loading ? (
          <div className="p-6 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-12 w-12 rounded-lg" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-32 mb-2" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="h-6 w-20" />
              </div>
            ))}
          </div>
        ) : invoiceList.length > 0 ? (
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.Head>Invoice</Table.Head>
                <Table.Head>Client</Table.Head>
                <Table.Head>Date</Table.Head>
                <Table.Head>Due Date</Table.Head>
                <Table.Head>Amount</Table.Head>
                <Table.Head>Status</Table.Head>
                <Table.Head className="text-right">Actions</Table.Head>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {invoiceList.map((invoice) => (
                <Table.Row 
                  key={invoice.id} 
                  onClick={() => navigate(`/invoices/${invoice.id}`)}
                >
                  <Table.Cell>
                    <Link to={`/invoices/${invoice.id}`} className="font-medium text-primary-700 dark:text-primary-300 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded">{invoice.invoice_number}</Link>
                  </Table.Cell>
                  <Table.Cell>{invoice.client_name}</Table.Cell>
                  <Table.Cell className="text-gray-500 dark:text-gray-400">
                    {formatDate(invoice.issue_date)}
                  </Table.Cell>
                  <Table.Cell className="text-gray-500 dark:text-gray-400">
                    {formatDate(invoice.due_date)}
                  </Table.Cell>
                  <Table.Cell>
                    <span className="font-semibold">{formatMoney(invoice.total, invoice.currency || currency)}</span>
                  </Table.Cell>
                  <Table.Cell><StatusBadge status={invoice.status} /></Table.Cell>
                  <Table.Cell className="text-right">
                    <button
                      type="button"
                      onClick={(e) => handleDownload(e, invoice)}
                      disabled={downloadingId === invoice.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors disabled:opacity-50"
                      title="Download PDF"
                    >
                      <Download className="w-4 h-4" />
                      {downloadingId === invoice.id ? '…' : 'PDF'}
                    </button>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        ) : error ? (
          <ErrorState title="Could not load your invoices" onRetry={() => setReloadKey(k => k + 1)} />
        ) : (
          <EmptyState
            icon={FileText}
            title="No invoices found"
            description="Get started by creating your first invoice."
            action
            actionLabel="Create Invoice"
            onAction={() => window.location.href = '/invoices/new'}
          />
        )}
        <Pagination page={page} count={count} onPageChange={goToPage} />
      </Card>
    </div>
  )
}

export default InvoiceList
