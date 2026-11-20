import { Save } from 'lucide-react'
import { Card, Button, Input, Select } from '../../components/ui'

const CURRENCIES = [
  { value: 'USD', label: 'USD - US Dollar' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'GBP', label: 'GBP - British Pound' },
  { value: 'CAD', label: 'CAD - Canadian Dollar' },
  { value: 'AUD', label: 'AUD - Australian Dollar' },
  { value: 'INR', label: 'INR - Indian Rupee' },
  { value: 'BDT', label: 'BDT - Bangladeshi Taka' },
]

function InvoicingTab({ register, loading }) {
  return (
    <Card>
      <Card.Header>
        <Card.Title>Invoice Settings</Card.Title>
        <Card.Description>Default settings for new invoices</Card.Description>
      </Card.Header>
      <Card.Content className="space-y-6">
        <Select label="Default Currency" options={CURRENCIES} {...register('default_currency')} />
        <Input
          label="Invoice number prefix"
          maxLength={10}
          pattern="[A-Za-z0-9]+"
          hint="Letters and digits. ACME gives ACME-2026-001. Existing invoices keep their numbers."
          {...register('invoice_prefix')}
        />
        <fieldset className="space-y-4">
          <legend className="label">Payment reminders</legend>
          <label className="flex items-center gap-3 text-sm">
            <input type="checkbox" {...register('reminders_enabled')} />
            Send reminders to clients automatically
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Due-soon notice (days before)"
              type="number"
              min="0"
              max="30"
              hint="0 turns it off."
              {...register('remind_before_days')}
            />
            <Input
              label="Repeat overdue notice (every N days)"
              type="number"
              min="0"
              max="60"
              hint="0 sends the overdue notice once."
              {...register('overdue_repeat_days')}
            />
          </div>
        </fieldset>
        <div>
          <label htmlFor="bank-details" className="label">
            Bank Details (one per line)
          </label>
          <textarea
            id="bank-details"
            className="input min-h-[120px] font-mono text-sm"
            placeholder={'Account Name: Your Company\nAccount Number: 0000-0000000000\nBank Name: Example Bank'}
            {...register('bank_details')}
          />
          <p className="text-sm text-gray-500 mt-1">Shown in the bank details box on PDF invoices.</p>
        </div>
        <div>
          <label htmlFor="invoice-terms" className="label">
            Terms &amp; Conditions (one per line)
          </label>
          <textarea
            id="invoice-terms"
            className="input min-h-[100px] text-sm"
            placeholder="All amounts are in the currency shown on this invoice."
            {...register('invoice_terms')}
          />
        </div>
      </Card.Content>
      <Card.Footer>
        <Button type="submit" loading={loading}>
          <Save className="w-4 h-4 mr-2" />
          Save Changes
        </Button>
      </Card.Footer>
    </Card>
  )
}

export default InvoicingTab
