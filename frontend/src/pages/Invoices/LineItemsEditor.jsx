import { Plus, Trash2 } from 'lucide-react'
import { Card } from '../../components/ui'
import { lineTotalCents } from '../../utils/money'

/** The editable lines of an invoice. Amounts shown here are previews; the server recomputes them (DATA-3). */
function LineItemsEditor({ register, fields, append, remove, items, formatCents }) {
  return (
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
                  aria-label={`Line ${index + 1} description`}
                  className="input"
                />
              </div>
              <div className="col-span-4 md:col-span-2">
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  {...register(`items.${index}.quantity`, {
                    required: 'Required',
                    min: { value: 0.01, message: 'Min 0.01' },
                  })}
                  placeholder="Qty"
                  aria-label={`Line ${index + 1} quantity`}
                  className="input"
                />
              </div>
              <div className="col-span-4 md:col-span-2">
                <input
                  type="number"
                  step="0.01"
                  {...register(`items.${index}.rate`, {
                    required: 'Required',
                    min: { value: 0, message: 'Min 0' },
                  })}
                  placeholder="Rate"
                  aria-label={`Line ${index + 1} rate`}
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
                    aria-label={`Remove line ${index + 1}`}
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
            className="flex items-center gap-2 text-primary-600 dark:text-primary-400 hover:text-primary-700 text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Line Item
          </button>
        </div>
      </Card.Content>
    </Card>
  )
}

export default LineItemsEditor
