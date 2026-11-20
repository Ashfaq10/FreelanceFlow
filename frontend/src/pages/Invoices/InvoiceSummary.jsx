import { Save, Send } from 'lucide-react'
import { Card, Button } from '../../components/ui'

/** Live totals beside the form. `totals` are cents from previewTotalsCents. */
function InvoiceSummary({ totals, discountPercent = 0, saving, onSaveAndSend, formatCents }) {
  return (
    <Card className="sticky top-24">
      <Card.Header>
        <Card.Title>Summary</Card.Title>
      </Card.Header>
      <Card.Content>
        <div className="space-y-4">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Subtotal</span>
            <span className="font-medium">{formatCents(totals.subtotal)}</span>
          </div>
          {totals.discount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">
                Discount{discountPercent > 0 ? ` (${discountPercent}%)` : ''}
              </span>
              <span className="font-medium text-emerald-600">-{formatCents(totals.discount)}</span>
            </div>
          )}
          {totals.breakdown
            .filter((row) => row.rate > 0)
            .map((row) => (
              <div key={row.rate} className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">VAT ({row.rate}%)</span>
                <span className="font-medium">{formatCents(row.tax)}</span>
              </div>
            ))}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <div className="flex justify-between text-lg">
              <span className="font-semibold">Total</span>
              <span className="font-bold text-primary-600 dark:text-primary-400">{formatCents(totals.total)}</span>
            </div>
          </div>
        </div>
      </Card.Content>
      <Card.Footer className="flex flex-col gap-3">
        <Button type="submit" loading={saving} className="w-full">
          <Save className="w-4 h-4 mr-2" />
          Save as Draft
        </Button>
        <Button type="button" variant="secondary" onClick={onSaveAndSend} loading={saving} className="w-full">
          <Send className="w-4 h-4 mr-2" />
          Save & Send
        </Button>
      </Card.Footer>
    </Card>
  )
}

export default InvoiceSummary
