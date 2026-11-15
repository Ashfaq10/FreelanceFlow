import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Plus, Clock, Trash2, FileText } from 'lucide-react'
import toast from 'react-hot-toast'
import { Card, Button, Table, EmptyState, ErrorState } from '../../components/ui'
import { timeLogs as timeLogApi, clients as clientApi } from '../../api/endpoints'
import { formatCurrency as formatMoney } from '../../utils/formatters'
import { useCurrency } from '../../hooks/useCurrency'
import TimeLogModal from './TimeLogModal'
import TimerCard from './TimerCard'
import { fetchAllPages } from '../../utils/pagination'
import { parseDateOnly, todayISO } from '../../utils/dates'

function TimeTracker() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [selectedLogs, setSelectedLogs] = useState([])
  const [billing, setBilling] = useState(false)
  const [timeLogs, setTimeLogs] = useState([])
  const [clientList, setClients] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editingLog, setEditingLog] = useState(null)
  const [saving, setSaving] = useState(false)
  const [isTracking, setIsTracking] = useState(false)
  const [trackingTime, setTrackingTime] = useState(0)
  const [trackingClient, setTrackingClient] = useState(null)
  const [trackingDescription, setTrackingDescription] = useState('')

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: {
      client: '',
      description: '',
      hours: '',
      date: todayISO(),
      hourly_rate: '',
    },
  })

  useEffect(() => {
    fetchTimeLogs()
    fetchClients()
  }, [])

  useEffect(() => {
    let interval
    if (isTracking) {
      interval = setInterval(() => {
        setTrackingTime((prev) => prev + 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isTracking])

  const fetchTimeLogs = async () => {
    setError(false)
    try {
      // Totals below sum these rows, so they must be all of them, not page one (BUG-7).
      setTimeLogs(await fetchAllPages(timeLogApi.list))
    } catch (err) {
      console.error('Failed to fetch time logs:', err)
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  const toggleLog = (id) =>
    setSelectedLogs((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]))

  const handleBill = async () => {
    setBilling(true)
    try {
      const { data } = await timeLogApi.bill({ time_logs: selectedLogs })
      setSelectedLogs([])
      toast.success(`${data.invoice_number} created from your hours`)
      navigate(`/invoices/${data.id}`)
    } catch (error) {
      toast.error(error.response?.data?.error || 'Could not bill those hours')
    } finally {
      setBilling(false)
    }
  }

  const fetchClients = async () => {
    try {
      const clientData = await fetchAllPages(clientApi.list)
      setClients(clientData.map((c) => ({ value: c.id, label: c.name || c.company_name })))
    } catch (error) {
      console.error('Failed to fetch clients:', error)
    }
  }

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const startTracking = () => {
    if (!trackingClient) {
      toast.error('Please select a client first')
      return
    }
    setIsTracking(true)
    toast.success('Timer started')
  }

  const stopTracking = () => {
    setIsTracking(false)
    const hours = (trackingTime / 3600).toFixed(2)
    setValue('client', trackingClient)
    setValue('description', trackingDescription)
    setValue('hours', hours)
    setShowModal(true)
  }

  const openModal = (log = null) => {
    if (log) {
      setEditingLog(log)
      reset({
        client: log.client,
        description: log.description,
        hours: log.hours,
        date: log.date,
        hourly_rate: log.hourly_rate || '',
      })
    } else {
      setEditingLog(null)
      reset({
        client: '',
        description: '',
        hours: '',
        date: todayISO(),
        hourly_rate: '',
      })
    }
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingLog(null)
    setTrackingTime(0)
    setTrackingDescription('')
    reset()
  }

  const onSubmit = async (data) => {
    setSaving(true)
    try {
      const payload = {
        ...data,
        hours: parseFloat(data.hours),
        hourly_rate: data.hourly_rate ? parseFloat(data.hourly_rate) : null,
      }

      if (editingLog) {
        await timeLogApi.update(editingLog.id, payload)
        toast.success('Time log updated')
      } else {
        await timeLogApi.create(payload)
        toast.success('Time log created')
      }
      fetchTimeLogs()
      closeModal()
    } catch {
      toast.error('Failed to save time log')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this time log?')) return

    try {
      await timeLogApi.delete(id)
      toast.success('Time log deleted')
      fetchTimeLogs()
    } catch {
      toast.error('Failed to delete time log')
    }
  }

  const formatDate = (date) => {
    return parseDateOnly(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const currency = useCurrency()
  const formatCurrency = (amount) => formatMoney(amount, currency)

  const totalHours = timeLogs.reduce((sum, log) => sum + parseFloat(log.hours || 0), 0)
  const totalEarnings = timeLogs.reduce((sum, log) => {
    return sum + parseFloat(log.hours || 0) * parseFloat(log.hourly_rate || 0)
  }, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Time Tracker</h1>
          <p className="text-gray-500 dark:text-gray-400">Track billable hours for your clients</p>
        </div>
        <Button onClick={() => openModal()}>
          <Plus className="w-4 h-4 mr-2" />
          Log Time
        </Button>
      </div>

      <TimerCard
        time={formatTime(trackingTime)}
        isTracking={isTracking}
        onStart={startTracking}
        onStop={stopTracking}
        clients={clientList}
        client={trackingClient}
        onClientChange={setTrackingClient}
        description={trackingDescription}
        onDescriptionChange={setTrackingDescription}
      />

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <Card.Content className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Hours Logged</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{totalHours.toFixed(1)}h</p>
              </div>
              <div className="p-3 rounded-lg bg-primary-100 dark:bg-primary-900/30">
                <Clock className="w-6 h-6 text-primary-600 dark:text-primary-400" />
              </div>
            </div>
          </Card.Content>
        </Card>
        <Card>
          <Card.Content className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Billable</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{formatCurrency(totalEarnings)}</p>
              </div>
              <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/30">
                <FileText className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </Card.Content>
        </Card>
      </div>

      {/* Time Logs */}
      <Card>
        <Card.Header className="flex items-center justify-between">
          <Card.Title>Recent Time Logs</Card.Title>
          {selectedLogs.length > 0 && (
            <Button size="sm" onClick={handleBill} loading={billing}>
              <FileText className="w-4 h-4 mr-1.5" />
              Bill {selectedLogs.length} {selectedLogs.length === 1 ? 'entry' : 'entries'}
            </Button>
          )}
        </Card.Header>
        {loading ? (
          <Card.Content>
            <div className="animate-pulse space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded" />
              ))}
            </div>
          </Card.Content>
        ) : timeLogs.length > 0 ? (
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.Head>
                  <span className="sr-only">Select</span>
                </Table.Head>
                <Table.Head>Date</Table.Head>
                <Table.Head>Client</Table.Head>
                <Table.Head>Description</Table.Head>
                <Table.Head>Hours</Table.Head>
                <Table.Head className="hidden lg:table-cell">Rate</Table.Head>
                <Table.Head>Total</Table.Head>
                <Table.Head>
                  <span className="sr-only">Actions</span>
                </Table.Head>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {timeLogs.map((log) => (
                <Table.Row key={log.id}>
                  <Table.Cell>
                    {/* Only unbilled, rated hours can go on an invoice (FEAT-1). */}
                    <input
                      type="checkbox"
                      aria-label={`Select ${log.description}`}
                      className="w-4 h-4 accent-primary-600 disabled:opacity-30"
                      disabled={log.is_billed || !log.hourly_rate}
                      checked={selectedLogs.includes(log.id)}
                      onChange={() => toggleLog(log.id)}
                    />
                  </Table.Cell>
                  <Table.Cell className="text-gray-500 dark:text-gray-400">{formatDate(log.date)}</Table.Cell>
                  <Table.Cell>
                    {log.client_name}
                    {log.is_billed ? ' · billed' : ''}
                  </Table.Cell>
                  <Table.Cell className="max-w-[9rem] lg:max-w-xs truncate">{log.description}</Table.Cell>
                  <Table.Cell>
                    <span className="font-medium">{parseFloat(log.hours).toFixed(1)}h</span>
                  </Table.Cell>
                  <Table.Cell className="hidden lg:table-cell">
                    {log.hourly_rate ? formatCurrency(log.hourly_rate) : '-'}
                  </Table.Cell>
                  <Table.Cell>
                    <span className="font-semibold">
                      {log.hourly_rate ? formatCurrency(parseFloat(log.hours) * parseFloat(log.hourly_rate)) : '-'}
                    </span>
                  </Table.Cell>
                  <Table.Cell>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openModal(log)}
                        aria-label="Edit time log"
                        className="p-2 text-gray-500 hover:text-primary-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                      >
                        <Clock className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(log.id)}
                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                        aria-label="Delete time log"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        ) : error ? (
          <ErrorState
            title="Could not load your time logs"
            onRetry={() => {
              setLoading(true)
              fetchTimeLogs()
            }}
          />
        ) : (
          <EmptyState
            icon={Clock}
            title="No time logs yet"
            description="Start tracking your time or log hours manually."
          />
        )}
      </Card>

      <TimeLogModal
        isOpen={showModal}
        onClose={closeModal}
        isEditing={!!editingLog}
        clients={clientList}
        saving={saving}
        form={{ register, errors }}
        onSubmit={handleSubmit(onSubmit)}
      />
    </div>
  )
}

export default TimeTracker
