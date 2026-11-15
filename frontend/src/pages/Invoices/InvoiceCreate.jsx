import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm, useFieldArray } from 'react-hook-form'
import { Plus, Trash2, Save, Send, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import { Card, Button, Input, Select } from '../../components/ui'
import { useAuth } from '../../context/AuthContext'
import { invoices as invoiceApi, clients as clientApi } from '../../api/endpoints'
import { formatCurrency as formatMoney } from '../../utils/formatters'
import { fromCents, lineTotalCents, previewTotalsCents } from '../../utils/money'

function InvoiceCreate() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [clientList, setClients] = useState([])
  const isEditing = !!id

  const now = new Date()

  const { register, control, handleSubmit, watch, reset, formState: { errors } } = useForm({
    defaultValues: {
      client: '',
      reference_number: '',
      issue_date: toDateTimeLocal(now),
      due_date: toDateTimeLocal(new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)),
      discount_amount: 0,
      tax_rate: 0,
      notes: '',
      items: [{ description: '', quantity: 1, rate: 0 }]
    }
  })

  function toDateTimeLocal(value) {
    const date = value instanceof Date ? value : new Date(value)
    if (Number.isNaN(date.getTime())) return ''
    const offset = date.getTimezoneOffset()
    const local = new Date(date.getTime() - offset * 60000)
    return local.toISOString().slice(0, 19)
  }

  function toApiDateTime(value) {
    if (!value) return null
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return null
    return date.toISOString()
  }

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items'
  })

  const items = watch('items')
  const discountAmount = parseFloat(watch('discount_amount')) || 0
  const taxRate = parseFloat(watch('tax_rate')) || 0

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const response = await clientApi.list()
        const clientData = response.data.results || response.data || []
        setClients(clientData.map(c => ({ value: c.id, label: c.name || c.company_name })))
      } catch (error) {
        console.error('Failed to fetch clients:', error)
      }
    }

    const fetchInvoice = async () => {
      setLoading(true)
      try {
        const response = await invoiceApi.get(id)
        const invoice = response.data
        const editNow = new Date()
        reset({
          client: invoice.client,
          reference_number: invoice.reference_number || '',
          issue_date: toDateTimeLocal(editNow),
          due_date: toDateTimeLocal(new Date(editNow.getTime() + 30 * 24 * 60 * 60 * 1000)),
          discount_amount: invoice.discount_amount ?? 0,
          tax_rate: invoice.tax_rate ?? 0,
          notes: invoice.notes || '',
          items: invoice.items?.length > 0
            ? invoice.items.map((item) => ({
                description: item.description,
                quantity: Number(item.quantity),
                rate: item.rate ?? item.unit_price ?? 0,
              }))
            : [{ description: '', quantity: 1, rate: 0 }],
        })
      } catch (error) {
        toast.error('Failed to load invoice')
        navigate('/invoices')
      } finally {
        setLoading(false)
      }
    }

    fetchClients()
    if (isEditing) {
      fetchInvoice()
    }
  }, [id, isEditing, reset, navigate])

  // Draft preview only: the server recomputes and returns the authoritative amounts (DATA-3).
  const previewTotals = previewTotalsCents(items, discountAmount, taxRate)

  const formatCurrency = (amount) => formatMoney(amount, user?.default_currency || 'USD')

  const formatCents = (cents) => formatCurrency(fromCents(cents))

  const formatApiError = (error) => {
    const data = error.response?.data
    if (!data) return 'Failed to save invoice'
    if (typeof data === 'string') return data
    if (data.message) return data.message
    if (data.detail) return data.detail
    if (Array.isArray(data)) return data.join(', ')
    return Object.entries(data)
      .map(([key, value]) => {
        const label = key === 'items' ? 'Line items' : key
        const text = Array.isArray(value) ? value.join(', ') : String(value)
        return `${label}: ${text}`
      })
      .join('; ')
  }

  const onSubmit = async (data, sendAfterSave = false) => {
    if (!data.client) {
      toast.error('Please select a client')
      return
    }

    const validItems = data.items.filter(
      (item) => item.description?.trim() && Number(item.rate) >= 0
    )
    if (validItems.length === 0) {
      toast.error('Add at least one line item with a description and rate')
      return
    }

    setSaving(true)
    try {
      const payload = {
        client: data.client,
        reference_number: data.reference_number || '',
        issue_date: toApiDateTime(data.issue_date),
        due_date: toApiDateTime(data.due_date),
        discount_amount: parseFloat(data.discount_amount) || 0,
        tax_rate: parseFloat(data.tax_rate) || 0,
        notes: data.notes || '',
        status: 'draft',
        items: validItems.map((item) => ({
          description: item.description.trim(),
          quantity: Math.max(1, parseInt(item.quantity, 10) || 1),
          rate: parseFloat(item.rate) || 0,
        })),
      }

      let response
      if (isEditing) {
        response = await invoiceApi.update(id, payload)
        toast.success('Invoice updated')
      } else {
        response = await invoiceApi.create(payload)
        toast.success('Invoice created')
      }

      const invoiceId = response.data?.id
      if (!invoiceId) {
        toast.error('Invoice saved but could not open details')
        navigate('/invoices')
        return
      }

      if (sendAfterSave) {
        await invoiceApi.send(invoiceId)
        toast.success('Invoice sent to client')
      }

      navigate(`/invoices/${invoiceId}`)
    } catch (error) {
      toast.error(formatApiError(error))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/invoices')}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {isEditing ? 'Edit Invoice' : 'Create Invoice'}
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            {isEditing ? 'Update invoice details' : 'Fill in the invoice details below'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit((data) => onSubmit(data, false))}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Client & Dates */}
            <Card>
              <Card.Content>
                <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
                  <Select
                    label="Client"
                    options={clientList}
                    placeholder="Select a client"
                    error={errors.client?.message}
                    {...register('client', { required: 'Client is required' })}
                  />
                  <Input
                    label="Reference Number"
                    placeholder="REF-0001"
                    {...register('reference_number')}
                  />
                  <Input
                    label="Invoice Date"
                    type="datetime-local"
                    step="1"
                    error={errors.issue_date?.message}
                    {...register('issue_date', { required: 'Issue date is required' })}
                  />
                  <Input
                    label="Payment Date"
                    type="datetime-local"
                    step="1"
                    error={errors.due_date?.message}
                    {...register('due_date', { required: 'Due date is required' })}
                  />
                  <Input
                    label="Discount"
                    type="number"
                    step="0.01"
                    min="0"
                    {...register('discount_amount')}
                  />
                  <Input
                    label="VAT / Tax (%)"
                    type="number"
                    step="0.01"
                    min="0"
                    {...register('tax_rate')}
                  />
                </div>
              </Card.Content>
            </Card>

            {/* Line Items */}
            <Card>
              <Card.Header>
                <Card.Title>Line Items</Card.Title>
              </Card.Header>
              <Card.Content>
                <div className="space-y-4">
                  <div className="hidden md:grid grid-cols-12 gap-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                    <div className="col-span-6">Description</div>
                    <div className="col-span-2">Quantity</div>
                    <div className="col-span-2">Rate</div>
                    <div className="col-span-1">Amount</div>
                    <div className="col-span-1"></div>
                  </div>

                  {fields.map((field, index) => (
                    <div key={field.id} className="grid grid-cols-12 gap-4 items-start">
                      <div className="col-span-12 md:col-span-6">
                        <input
                          {...register(`items.${index}.description`, { required: 'Required' })}
                          placeholder="Description"
                          className="input"
                        />
                      </div>
                      <div className="col-span-4 md:col-span-2">
                        <input
                          type="number"
                          min="1"
                          step="1"
                          {...register(`items.${index}.quantity`, { 
                            required: 'Required',
                            min: { value: 1, message: 'Min 1' }
                          })}
                          placeholder="Qty"
                          className="input"
                        />
                      </div>
                      <div className="col-span-4 md:col-span-2">
                        <input
                          type="number"
                          step="0.01"
                          {...register(`items.${index}.rate`, { 
                            required: 'Required',
                            min: { value: 0, message: 'Min 0' }
                          })}
                          placeholder="Rate"
                          className="input"
                        />
                      </div>
                      <div className="col-span-3 md:col-span-1 flex items-center h-10">
                        <span className="text-sm font-medium">
                          {formatCents(lineTotalCents(items[index]?.quantity, items[index]?.rate))}
                        </span>
                      </div>
                      <div className="col-span-1 flex items-center h-10">
                        {fields.length > 1 && (
                          <button
                            type="button"
                            onClick={() => remove(index)}
                            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => append({ description: '', quantity: 1, rate: 0 })}
                    className="flex items-center gap-2 text-primary-600 hover:text-primary-700 text-sm font-medium"
                  >
                    <Plus className="w-4 h-4" />
                    Add Line Item
                  </button>
                </div>
              </Card.Content>
            </Card>

            {/* Notes */}
            <Card>
              <Card.Content>
                <label className="label">Notes</label>
                <textarea
                  {...register('notes')}
                  rows={4}
                  placeholder="Additional notes or payment instructions..."
                  className="input"
                />
              </Card.Content>
            </Card>
          </div>

          {/* Summary Sidebar */}
          <div className="space-y-6">
            <Card className="sticky top-24">
              <Card.Header>
                <Card.Title>Summary</Card.Title>
              </Card.Header>
              <Card.Content>
                <div className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Subtotal</span>
                    <span className="font-medium">{formatCents(previewTotals.subtotal)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Discount</span>
                      <span className="font-medium text-emerald-600">-{formatCents(previewTotals.discount)}</span>
                    </div>
                  )}
                  {taxRate > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">VAT ({taxRate}%)</span>
                      <span className="font-medium">{formatCents(previewTotals.tax)}</span>
                    </div>
                  )}
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                    <div className="flex justify-between text-lg">
                      <span className="font-semibold">Total</span>
                      <span className="font-bold text-primary-600">{formatCents(previewTotals.total)}</span>
                    </div>
                  </div>
                </div>
              </Card.Content>
              <Card.Footer className="flex flex-col gap-3">
                <Button type="submit" loading={saving} className="w-full">
                  <Save className="w-4 h-4 mr-2" />
                  Save as Draft
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleSubmit((data) => onSubmit(data, true))}
                  loading={saving}
                  className="w-full"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Save & Send
                </Button>
              </Card.Footer>
            </Card>
          </div>
        </div>
      </form>
    </div>
  )
}

export default InvoiceCreate
