import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Plus, Clock, Trash2, Play, Pause, FileText } from 'lucide-react'
import toast from 'react-hot-toast'
import { Card, Button, Input, Select, Table, EmptyState, ErrorState, Modal } from '../../components/ui'
import { timeLogs as timeLogApi, clients as clientApi } from '../../api/endpoints'
import { formatCurrency as formatMoney } from '../../utils/formatters'
import { useCurrency } from '../../hooks/useCurrency'
import { fetchAllPages } from '../../utils/pagination'
import { parseDateOnly, todayISO } from '../../utils/dates'

function TimeTracker() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [timeLogs, setTimeLogs] = useState([])
  const [clientList, setClients] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editingLog, setEditingLog] = useState(null)
  const [saving, setSaving] = useState(false)
  const [isTracking, setIsTracking] = useState(false)
  const [trackingTime, setTrackingTime] = useState(0)
  const [trackingClient, setTrackingClient] = useState(null)
  const [trackingDescription, setTrackingDescription] = useState('')

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm({
    defaultValues: {
      client: '',
      description: '',
      hours: '',
      date: todayISO(),
      hourly_rate: ''
    }
  })

  useEffect(() => {
    fetchTimeLogs()
    fetchClients()
  }, [])

  useEffect(() => {
    let interval
    if (isTracking) {
      interval = setInterval(() => {
        setTrackingTime(prev => prev + 1)
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

  const fetchClients = async () => {
    try {
      const clientData = await fetchAllPages(clientApi.list)
      setClients(clientData.map(c => ({ value: c.id, label: c.name || c.company_name })))
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
        hourly_rate: log.hourly_rate || ''
      })
    } else {
      setEditingLog(null)
      reset({
        client: '',
        description: '',
        hours: '',
        date: todayISO(),
        hourly_rate: ''
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
        hourly_rate: data.hourly_rate ? parseFloat(data.hourly_rate) : null
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
    } catch (error) {
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
    } catch (error) {
      toast.error('Failed to delete time log')
    }
  }

  const formatDate = (date) => {
    return parseDateOnly(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const currency = useCurrency()
  const formatCurrency = (amount) => formatMoney(amount, currency)

  const totalHours = timeLogs.reduce((sum, log) => sum + parseFloat(log.hours || 0), 0)
  const totalEarnings = timeLogs.reduce((sum, log) => {
    return sum + (parseFloat(log.hours || 0) * parseFloat(log.hourly_rate || 0))
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

      {/* Timer Card */}
      <Card>
        <Card.Content className="py-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-center gap-6">
              <div className="text-4xl font-mono font-bold text-gray-900 dark:text-white">
                {formatTime(trackingTime)}
              </div>
              <div className="flex gap-3">
                {!isTracking ? (
                  <Button onClick={startTracking} className="rounded-full w-12 h-12 p-0">
                    <Play className="w-5 h-5" />
                  </Button>
                ) : (
                  <Button onClick={stopTracking} variant="danger" className="rounded-full w-12 h-12 p-0">
                    <Pause className="w-5 h-5" />
                  </Button>
                )}
              </div>
            </div>
            <div className="flex-1 max-w-md space-y-3">
              <Select
                options={clientList}
                placeholder="Select client"
                value={trackingClient}
                onChange={(e) => setTrackingClient(e.target.value)}
                disabled={isTracking}
              />
              <input
                type="text"
                value={trackingDescription}
                onChange={(e) => setTrackingDescription(e.target.value)}
                placeholder="What are you working on?"
                className="input"
                disabled={isTracking}
              />
            </div>
          </div>
        </Card.Content>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <Card.Content className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Hours Logged</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {totalHours.toFixed(1)}h
                </p>
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
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(totalEarnings)}
                </p>
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
        <Card.Header>
          <Card.Title>Recent Time Logs</Card.Title>
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
                <Table.Head>Date</Table.Head>
                <Table.Head>Client</Table.Head>
                <Table.Head>Description</Table.Head>
                <Table.Head>Hours</Table.Head>
                <Table.Head>Rate</Table.Head>
                <Table.Head>Total</Table.Head>
                <Table.Head></Table.Head>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {timeLogs.map((log) => (
                <Table.Row key={log.id}>
                  <Table.Cell className="text-gray-500 dark:text-gray-400">
                    {formatDate(log.date)}
                  </Table.Cell>
                  <Table.Cell>{log.client_name}</Table.Cell>
                  <Table.Cell className="max-w-xs truncate">
                    {log.description}
                  </Table.Cell>
                  <Table.Cell>
                    <span className="font-medium">{parseFloat(log.hours).toFixed(1)}h</span>
                  </Table.Cell>
                  <Table.Cell>
                    {log.hourly_rate ? formatCurrency(log.hourly_rate) : '-'}
                  </Table.Cell>
                  <Table.Cell>
                    <span className="font-semibold">
                      {log.hourly_rate 
                        ? formatCurrency(parseFloat(log.hours) * parseFloat(log.hourly_rate))
                        : '-'
                      }
                    </span>
                  </Table.Cell>
                  <Table.Cell>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openModal(log)}
                        className="p-2 text-gray-500 hover:text-primary-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                      >
                        <Clock className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(log.id)}
                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
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
          <ErrorState title="Could not load your time logs" onRetry={() => { setLoading(true); fetchTimeLogs() }} />
        ) : (
          <EmptyState
            icon={Clock}
            title="No time logs yet"
            description="Start tracking your time or log hours manually."
          />
        )}
      </Card>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={closeModal}
        title={editingLog ? 'Edit Time Log' : 'Log Time'}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Select
            label="Client"
            options={clientList}
            placeholder="Select a client"
            error={errors.client?.message}
            {...register('client', { required: 'Client is required' })}
          />
          
          <Input
            label="Description"
            placeholder="What did you work on?"
            error={errors.description?.message}
            {...register('description', { required: 'Description is required' })}
          />
          
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Hours"
              type="number"
              step="0.25"
              min="0.25"
              placeholder="1.5"
              error={errors.hours?.message}
              {...register('hours', { 
                required: 'Hours is required',
                min: { value: 0.25, message: 'Minimum 0.25 hours' }
              })}
            />
            <Input
              label="Date"
              type="date"
              error={errors.date?.message}
              {...register('date', { required: 'Date is required' })}
            />
          </div>
          
          <Input
            label="Hourly Rate (optional)"
            type="number"
            step="0.01"
            placeholder="75.00"
            {...register('hourly_rate')}
          />

          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {editingLog ? 'Update' : 'Save'} Time Log
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default TimeTracker
