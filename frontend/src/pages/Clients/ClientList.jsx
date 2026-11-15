import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Plus, Search, Users, Mail, Phone } from 'lucide-react'
import { Card, Button, EmptyState, Skeleton } from '../../components/ui'
import { clients as clientApi } from '../../api/endpoints'
import { formatCurrency as formatMoney } from '../../utils/formatters'
import { useCurrency } from '../../hooks/useCurrency'

function ClientList() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [clientList, setClients] = useState([])
  const [search, setSearch] = useState(searchParams.get('search') || '')

  useEffect(() => {
    const fetchClients = async () => {
      setLoading(true)
      try {
        const params = {
          search: searchParams.get('search'),
        }
        const response = await clientApi.list(params)
        setClients(response.data.results || response.data || [])
      } catch (error) {
        console.error('Failed to fetch clients:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchClients()
  }, [searchParams])

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

  const currency = useCurrency()
  const formatCurrency = (amount) => formatMoney(amount, currency)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Clients</h1>
          <p className="text-gray-500 dark:text-gray-400">Manage your client relationships</p>
        </div>
        <Link to="/clients/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Client
          </Button>
        </Link>
      </div>

      {/* Search */}
      <Card>
        <Card.Content className="py-4">
          <form onSubmit={handleSearch}>
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search clients..."
                className="input pl-10"
              />
            </div>
          </form>
        </Card.Content>
      </Card>

      {/* Client List */}
      <Card>
        {loading ? (
          <div className="p-6 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-32 mb-2" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="h-6 w-20" />
              </div>
            ))}
          </div>
        ) : clientList.length > 0 ? (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {clientList.map((client) => (
              <Link
                key={client.id}
                to={`/clients/${client.id}`}
                className="flex items-center gap-4 p-6 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                    <span className="text-lg font-semibold text-primary-600 dark:text-primary-400">
                      {(client.name || client.company || 'C').charAt(0).toUpperCase()}
                    </span>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white truncate">
                    {client.name || client.company}
                  </p>
                  <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                    {client.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="w-4 h-4" />
                        {client.email}
                      </span>
                    )}
                    {client.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-4 h-4" />
                        {client.phone}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total Billed</p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(client.total_billed)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Users}
            title="No clients yet"
            description="Get started by adding your first client."
            action
            actionLabel="Add Client"
            onAction={() => window.location.href = '/clients/new'}
          />
        )}
      </Card>
    </div>
  )
}

export default ClientList
