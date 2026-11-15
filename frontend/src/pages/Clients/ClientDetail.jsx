import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { 
  ArrowLeft, 
  Edit, 
  Archive,
  Mail, 
  Phone, 
  MapPin,
  FileText,
  MoreVertical
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Card, Badge, Button, Modal, Skeleton, Table } from '../../components/ui'
import { clients as clientApi, invoices as invoiceApi } from '../../api/endpoints'

function ClientDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [client, setClient] = useState(null)
  const [clientInvoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [showArchiveModal, setShowArchiveModal] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [archiving, setArchiving] = useState(false)

  useEffect(() => {
    const fetchClient = async () => {
      try {
        const response = await clientApi.get(id)
        setClient(response.data)
      } catch (error) {
        toast.error('Failed to load client')
        navigate('/clients')
      } finally {
        setLoading(false)
      }
    }

    const fetchClientInvoices = async () => {
      try {
        const response = await invoiceApi.list({ client: id })
        setInvoices(response.data.results || response.data || [])
      } catch (error) {
        console.error('Failed to fetch invoices:', error)
      }
    }

    fetchClient()
    fetchClientInvoices()
  }, [id, navigate])

  const handleArchive = async () => {
    setArchiving(true)
    try {
      await clientApi.archive(id)
      toast.success('Client archived')
      navigate('/clients')
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to archive client')
    } finally {
      setArchiving(false)
      setShowArchiveModal(false)
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0)
  }

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getStatusBadge = (status) => {
    const variants = {
      draft: 'gray',
      sent: 'info',
      overdue: 'danger',
      paid: 'success',
      cancelled: 'gray',
    }
    return <Badge variant={variants[status]}>{status}</Badge>
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="w-10 h-10 rounded-lg" />
          <div>
            <Skeleton className="h-6 w-48 mb-2" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Skeleton.Card />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/clients')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
              <span className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                {(client.name || client.company || 'C').charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {client.name || client.company}
              </h1>
              {client.company && client.name && (
                <p className="text-gray-500 dark:text-gray-400">{client.company}</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link to={`/clients/${id}/edit`}>
            <Button variant="secondary">
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
          </Link>
          <Link to={`/invoices/new?client=${id}`}>
            <Button>
              <FileText className="w-4 h-4 mr-2" />
              Create Invoice
            </Button>
          </Link>
          
          <div className="relative">
            <Button 
              variant="ghost"
              onClick={() => setShowDropdown(!showDropdown)}
            >
              <MoreVertical className="w-5 h-5" />
            </Button>
            {showDropdown && (
              <>
                <div 
                  className="fixed inset-0 z-10"
                  onClick={() => setShowDropdown(false)}
                />
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-20">
                  <button
                    onClick={() => {
                      setShowDropdown(false)
                      setShowArchiveModal(true)
                    }}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <Archive className="w-4 h-4 mr-3" />
                    Archive Client
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Client Info */}
        <div className="space-y-6">
          <Card>
            <Card.Header>
              <Card.Title>Contact Information</Card.Title>
            </Card.Header>
            <Card.Content className="space-y-4">
              {client.email && (
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-gray-400" />
                  <a 
                    href={`mailto:${client.email}`}
                    className="text-primary-600 hover:underline"
                  >
                    {client.email}
                  </a>
                </div>
              )}
              {client.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-gray-400" />
                  <a 
                    href={`tel:${client.phone}`}
                    className="text-primary-600 hover:underline"
                  >
                    {client.phone}
                  </a>
                </div>
              )}
              {(client.address || client.city) && (
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    {client.address && <p>{client.address}</p>}
                    {(client.city || client.state || client.zip_code) && (
                      <p>
                        {client.city}{client.city && client.state && ', '}{client.state} {client.zip_code}
                      </p>
                    )}
                    {client.country && <p>{client.country}</p>}
                  </div>
                </div>
              )}
            </Card.Content>
          </Card>

          <Card>
            <Card.Header>
              <Card.Title>Summary</Card.Title>
            </Card.Header>
            <Card.Content className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Total Billed</span>
                <span className="font-semibold">{formatCurrency(client.total_billed)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Total Paid</span>
                <span className="font-semibold text-green-600">{formatCurrency(client.total_paid)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Outstanding</span>
                <span className="font-semibold text-yellow-600">{formatCurrency(client.outstanding)}</span>
              </div>
            </Card.Content>
          </Card>

          {client.notes && (
            <Card>
              <Card.Header>
                <Card.Title>Notes</Card.Title>
              </Card.Header>
              <Card.Content>
                <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                  {client.notes}
                </p>
              </Card.Content>
            </Card>
          )}
        </div>

        {/* Invoices */}
        <div className="lg:col-span-2">
          <Card>
            <Card.Header className="flex items-center justify-between">
              <Card.Title>Invoices</Card.Title>
              <Link 
                to={`/invoices/new?client=${id}`}
                className="text-sm text-primary-600 hover:text-primary-700"
              >
                Create Invoice
              </Link>
            </Card.Header>
            {clientInvoices.length > 0 ? (
              <Table>
                <Table.Header>
                  <Table.Row>
                    <Table.Head>Invoice</Table.Head>
                    <Table.Head>Date</Table.Head>
                    <Table.Head>Amount</Table.Head>
                    <Table.Head>Status</Table.Head>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {clientInvoices.map((invoice) => (
                    <Table.Row 
                      key={invoice.id} 
                      onClick={() => navigate(`/invoices/${invoice.id}`)}
                    >
                      <Table.Cell>
                        <span className="font-medium">{invoice.invoice_number}</span>
                      </Table.Cell>
                      <Table.Cell className="text-gray-500 dark:text-gray-400">
                        {formatDate(invoice.issue_date)}
                      </Table.Cell>
                      <Table.Cell>
                        <span className="font-semibold">{formatCurrency(invoice.total)}</span>
                      </Table.Cell>
                      <Table.Cell>{getStatusBadge(invoice.status)}</Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table>
            ) : (
              <Card.Content>
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                  <p>No invoices yet</p>
                  <Link 
                    to={`/invoices/new?client=${id}`}
                    className="text-primary-600 hover:text-primary-700 text-sm"
                  >
                    Create the first invoice
                  </Link>
                </div>
              </Card.Content>
            )}
          </Card>
        </div>
      </div>

      {/* Archive Modal: invoices and payments are never deleted (DATA-1) */}
      <Modal
        isOpen={showArchiveModal}
        onClose={() => setShowArchiveModal(false)}
        title="Archive Client"
      >
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Archive <strong>{client?.name || client?.company}</strong>? They disappear from the client list and from new
          invoices. Their invoices, payments and history stay exactly as they are.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setShowArchiveModal(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleArchive}
            loading={archiving}
          >
            Archive Client
          </Button>
        </div>
      </Modal>
    </div>
  )
}

export default ClientDetail
