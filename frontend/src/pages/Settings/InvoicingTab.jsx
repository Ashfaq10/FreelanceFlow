import { Save } from 'lucide-react'
import { Card, Button, Select } from '../../components/ui'

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
          <Select
            label="Default Currency"
            options={CURRENCIES}
            {...register('default_currency')}
          />
          <div>
            <label htmlFor="bank-details" className="label">Bank Details (one per line)</label>
            <textarea
              id="bank-details"
              className="input min-h-[120px] font-mono text-sm"
              placeholder={'Account Name: Your Company\nAccount Number: 0000-0000000000\nBank Name: Example Bank'}
              {...register('bank_details')}
            />
            <p className="text-sm text-gray-500 mt-1">Shown in the bank details box on PDF invoices.</p>
          </div>
          <div>
            <label htmlFor="invoice-terms" className="label">Terms &amp; Conditions (one per line)</label>
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
