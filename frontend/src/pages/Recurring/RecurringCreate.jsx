import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFieldArray, useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Card, Button, Input, Select } from '../../components/ui'
import LineItemsEditor from '../Invoices/LineItemsEditor'
import { clients as clientApi, recurring as recurringApi } from '../../api/endpoints'
import { fetchAllPages } from '../../utils/pagination'
import { formatCurrency } from '../../utils/formatters'
import { fromCents } from '../../utils/money'
import { todayISO } from '../../utils/dates'
import { useCurrency } from '../../hooks/useCurrency'

const FREQUENCIES = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
]

/** New schedule: the invoice template and when it runs. The server stamps out each invoice (FEAT-4). */
function RecurringCreate() {
  const navigate = useNavigate()
  const currency = useCurrency()
  const [clients, setClients] = useState([])
  const [saving, setSaving] = useState(false)
  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      client: '',
      frequency: 'monthly',
      start_date: todayISO(),
      end_date: '',
      net_days: 30,
      auto_send: false,
      tax_rate: 0,
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

  const onSubmit = async (data) => {
    const items = data.items.filter((item) => item.description?.trim())
    if (items.length === 0) {
      toast.error('Add at least one line item')
      return
    }
    setSaving(true)
    try {
      await recurringApi.create({
        client: data.client,
        frequency: data.frequency,
        start_date: data.start_date,
        end_date: data.end_date || null,
        net_days: Number(data.net_days) || 0,
        auto_send: data.auto_send,
        tax_rate: String(data.tax_rate || 0),
        notes: data.notes || '',
        items: items.map((item) => ({
          description: item.description.trim(),
          quantity: String(item.quantity),
          rate: String(item.rate || 0),
          tax_rate: item.tax_rate === '' || item.tax_rate == null ? null : String(item.tax_rate),
        })),
      })
      toast.success('Schedule created')
      navigate('/recurring')
    } catch (error) {
      const body = error.response?.data
      toast.error(body?.error || Object.values(body || {}).flat()[0] || 'Could not create the schedule')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">New recurring invoice</h1>
        <p className="text-gray-500 dark:text-gray-400">The first invoice is made on the start date.</p>
      </div>
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
              <Select label="Repeats" options={FREQUENCIES} {...register('frequency')} />
              <Input
                label="Starts"
                type="date"
                {...register('start_date', { required: 'Start date is required' })}
                error={errors.start_date?.message}
              />
              <Input label="Ends (optional)" type="date" {...register('end_date')} />
              <Input label="Payment terms (days)" type="number" min="0" max="365" {...register('net_days')} />
              <Input label="VAT / Tax (%)" type="number" step="0.01" min="0" max="100" {...register('tax_rate')} />
            </div>
            <label className="mt-4 flex items-start gap-3 text-sm">
              <input type="checkbox" className="mt-1" {...register('auto_send')} />
              <span>
                <span className="font-medium text-gray-900 dark:text-white">
                  Email each invoice to the client automatically
                </span>
                <span className="block text-gray-600 dark:text-gray-400">
                  Otherwise each one waits as a draft for you to review.
                </span>
              </span>
            </label>
          </Card.Content>
        </Card>

        <LineItemsEditor
          register={register}
          fields={fields}
          append={append}
          remove={remove}
          items={watch('items')}
          formatCents={(cents) => formatCurrency(fromCents(cents), currency)}
        />

        <Card>
          <Card.Content>
            <label htmlFor="recurring-notes" className="label">
              Notes on every invoice
            </label>
            <textarea id="recurring-notes" rows={3} className="input" {...register('notes')} />
          </Card.Content>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="secondary" onClick={() => navigate('/recurring')}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            Create schedule
          </Button>
        </div>
      </form>
    </div>
  )
}

export default RecurringCreate
