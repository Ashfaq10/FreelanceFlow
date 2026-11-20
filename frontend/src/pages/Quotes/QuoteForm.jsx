import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useFieldArray, useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Card, Button, Input, Select } from '../../components/ui'
import LineItemsEditor from '../Invoices/LineItemsEditor'
import { clients as clientApi, quotes as quotesApi } from '../../api/endpoints'
import { fetchAllPages } from '../../utils/pagination'
import { formatCurrency } from '../../utils/formatters'
import { fromCents, previewTotalsCents } from '../../utils/money'
import { todayISO } from '../../utils/dates'
import { useCurrency } from '../../hooks/useCurrency'

const inThirtyDays = () => todayISO(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000))

/** Create or edit a draft quote. Amounts here are a preview; the server computes the real ones (DATA-3). */
function QuoteForm() {
  const { id } = useParams()
  const isEditing = Boolean(id)
  const navigate = useNavigate()
  const currency = useCurrency()
  const [clients, setClients] = useState([])
  const [saving, setSaving] = useState(false)
  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      client: '',
      issue_date: todayISO(),
      valid_until: inThirtyDays(),
      tax_rate: 0,
      discount_value: 0,
      discount_mode: 'amount',
      notes: '',
      items: [{ description: '', quantity: 1, rate: 0, tax_rate: '' }],
    },
  })
  const { fields, append, remove } = useFieldArray({ control, name: 'items' })

  useEffect(() => {
    fetchAllPages(clientApi.list)
      .then((list) =>
        setClients(list.filter((c) => !c.is_archived).map((c) => ({ value: c.id, label: c.name || c.company })))
      )
      .catch(() => toast.error('Could not load your clients'))
  }, [])

  useEffect(() => {
    if (!isEditing) return
    quotesApi
      .get(id)
      .then(({ data }) => {
        const percent = Number(data.discount_percent) > 0
        reset({
          client: data.client,
          issue_date: data.issue_date,
          valid_until: data.valid_until,
          tax_rate: data.tax_rate,
          discount_mode: percent ? 'percent' : 'amount',
          discount_value: percent ? data.discount_percent : data.discount_amount,
          notes: data.notes,
          items: data.lines.map((line) => ({ ...line, tax_rate: line.tax_rate ?? '' })),
        })
      })
      .catch(() => {
        toast.error('Could not load the quote')
        navigate('/quotes')
      })
  }, [id, isEditing, reset, navigate])

  const items = watch('items')
  const mode = watch('discount_mode')
  const value = parseFloat(watch('discount_value')) || 0
  const totals = previewTotalsCents(
    items,
    mode === 'amount' ? value : 0,
    parseFloat(watch('tax_rate')) || 0,
    mode === 'percent' ? value : 0
  )
  const money = (cents) => formatCurrency(fromCents(cents), currency)

  const onSubmit = async (data) => {
    const lines = data.items.filter((item) => item.description?.trim())
    if (lines.length === 0) {
      toast.error('Add at least one line item')
      return
    }
    const payload = {
      client: data.client,
      issue_date: data.issue_date,
      valid_until: data.valid_until,
      tax_rate: String(data.tax_rate || 0),
      discount_amount: data.discount_mode === 'amount' ? String(data.discount_value || 0) : '0',
      discount_percent: data.discount_mode === 'percent' ? String(data.discount_value || 0) : '0',
      notes: data.notes || '',
      items: lines.map((item) => ({
        description: item.description.trim(),
        quantity: String(item.quantity),
        rate: String(item.rate || 0),
        tax_rate: item.tax_rate === '' || item.tax_rate == null ? null : String(item.tax_rate),
      })),
    }
    setSaving(true)
    try {
      if (isEditing) await quotesApi.update(id, payload)
      else await quotesApi.create(payload)
      toast.success(isEditing ? 'Quote updated' : 'Quote created')
      navigate('/quotes')
    } catch (error) {
      const body = error.response?.data
      toast.error(body?.error || body?.detail || Object.values(body || {}).flat()[0] || 'Could not save the quote')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{isEditing ? 'Edit quote' : 'New quote'}</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
        <Card>
          <Card.Content>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Client"
                options={clients}
                placeholder="Select a client"
                error={errors.client?.message}
                {...register('client', { required: 'Client is required' })}
              />
              <Input label="VAT / Tax (%)" type="number" step="0.01" min="0" max="100" {...register('tax_rate')} />
              <Input label="Issued" type="date" {...register('issue_date', { required: 'Required' })} />
              <Input label="Valid until" type="date" {...register('valid_until', { required: 'Required' })} />
              <div>
                <label htmlFor="quote-discount" className="label">
                  Discount
                </label>
                <div className="flex gap-2">
                  <input
                    id="quote-discount"
                    type="number"
                    step="0.01"
                    min="0"
                    className="input min-w-0"
                    {...register('discount_value')}
                  />
                  <select aria-label="Discount type" className="input w-auto" {...register('discount_mode')}>
                    <option value="amount">Fixed</option>
                    <option value="percent">%</option>
                  </select>
                </div>
              </div>
            </div>
          </Card.Content>
        </Card>

        <LineItemsEditor
          register={register}
          fields={fields}
          append={append}
          remove={remove}
          items={items}
          formatCents={money}
        />

        <Card>
          <Card.Content className="space-y-4">
            <div className="flex justify-between text-lg font-semibold">
              <span>Total</span>
              <span>{money(totals.total)}</span>
            </div>
            <div>
              <label htmlFor="quote-notes" className="label">
                Notes
              </label>
              <textarea id="quote-notes" rows={3} className="input" {...register('notes')} />
            </div>
          </Card.Content>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="secondary" onClick={() => navigate('/quotes')}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            {isEditing ? 'Save quote' : 'Create quote'}
          </Button>
        </div>
      </form>
    </div>
  )
}

export default QuoteForm
