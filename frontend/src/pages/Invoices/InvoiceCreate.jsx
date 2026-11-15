import { useState, useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useForm, useFieldArray } from 'react-hook-form'
import { ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import { Card, Input, Select } from '../../components/ui'
import { useAuth } from '../../context/AuthContext'
import { invoices as invoiceApi, clients as clientApi } from '../../api/endpoints'
import { formatCurrency as formatMoney } from '../../utils/formatters'
import { fromCents, previewTotalsCents } from '../../utils/money'
import { fetchAllPages } from '../../utils/pagination'
import LineItemsEditor from './LineItemsEditor'
import InvoiceSummary from './InvoiceSummary'

function InvoiceCreate() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [clientList, setClients] = useState([])
  const isEditing = !!id

  const now = new Date()

  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: {
      // "Create invoice" from a client page arrives as ?client=<id> (BUG-12).
      client: searchParams.get('client') || '',
      reference_number: '',
      issue_date: toDateTimeLocal(now),
      due_date: toDateTimeLocal(new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)),
      discount_amount: 0,
      tax_rate: 0,
      notes: '',
      items: [{ description: '', quantity: 1, rate: 0 }],
    },
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
    name: 'items',
  })

  const items = watch('items')
  const discountAmount = parseFloat(watch('discount_amount')) || 0
  const taxRate = parseFloat(watch('tax_rate')) || 0

  useEffect(() => {
    const fetchClients = async () => {
      try {
        // Every client, not just the first page: client #21 could not be selected (BUG-7).
        const clientData = await fetchAllPages(clientApi.list)
        setClients(clientData.map((c) => ({ value: c.id, label: c.name || c.company_name })))
        // The <select> drops a value whose option did not exist yet, so re-apply it here (BUG-12).
        const preselected = searchParams.get('client')
        if (preselected && !isEditing) setValue('client', preselected)
      } catch (error) {
        console.error('Failed to fetch clients:', error)
      }
    }

    const fetchInvoice = async () => {
      setLoading(true)
      try {
        const response = await invoiceApi.get(id)
        const invoice = response.data
        reset({
          client: invoice.client,
          reference_number: invoice.reference_number || '',
          issue_date: toDateTimeLocal(new Date(invoice.issue_date)),
          due_date: toDateTimeLocal(new Date(invoice.due_date)),
          discount_amount: invoice.discount_amount ?? 0,
          tax_rate: invoice.tax_rate ?? 0,
          notes: invoice.notes || '',
          items:
            invoice.items?.length > 0
              ? invoice.items.map((item) => ({
                  description: item.description,
                  quantity: Number(item.quantity),
                  rate: item.rate ?? item.unit_price ?? 0,
                }))
              : [{ description: '', quantity: 1, rate: 0 }],
        })
      } catch {
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
  }, [id, isEditing, reset, navigate, searchParams, setValue])

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

    const validItems = data.items.filter((item) => item.description?.trim() && Number(item.rate) >= 0)
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
        // Decimal strings, not floats: the server stores Decimals and 0.1 + 0.2 must not creep in (DATA-3).
        discount_amount: String(data.discount_amount || 0),
        tax_rate: String(data.tax_rate || 0),
        notes: data.notes || '',
        items: validItems.map((item) => ({
          description: item.description.trim(),
          quantity: String(item.quantity),
          rate: String(item.rate || 0),
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
          aria-label="Back to invoices"
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
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-4 xl:gap-6">
                  <Select
                    label="Client"
                    options={clientList}
                    placeholder="Select a client"
                    error={errors.client?.message}
                    {...register('client', { required: 'Client is required' })}
                  />
                  <Input label="Reference Number" placeholder="REF-0001" {...register('reference_number')} />
                  <Input
                    label="Invoice Date"
                    type="datetime-local"
                    step="1"
                    error={errors.issue_date?.message}
                    {...register('issue_date', { required: 'Issue date is required' })}
                  />
                  <Input
                    label="Due Date"
                    type="datetime-local"
                    step="1"
                    error={errors.due_date?.message}
                    {...register('due_date', { required: 'Due date is required' })}
                  />
                  <Input label="Discount" type="number" step="0.01" min="0" {...register('discount_amount')} />
                  <Input label="VAT / Tax (%)" type="number" step="0.01" min="0" max="100" {...register('tax_rate')} />
                </div>
              </Card.Content>
            </Card>

            <LineItemsEditor
              register={register}
              fields={fields}
              append={append}
              remove={remove}
              items={items}
              formatCents={formatCents}
            />

            {/* Notes */}
            <Card>
              <Card.Content>
                <label htmlFor="invoice-notes" className="label">
                  Notes
                </label>
                <textarea
                  id="invoice-notes"
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
            <InvoiceSummary
              totals={previewTotals}
              discountAmount={discountAmount}
              taxRate={taxRate}
              saving={saving}
              formatCents={formatCents}
              onSaveAndSend={handleSubmit((data) => onSubmit(data, true))}
            />
          </div>
        </div>
      </form>
    </div>
  )
}

export default InvoiceCreate
