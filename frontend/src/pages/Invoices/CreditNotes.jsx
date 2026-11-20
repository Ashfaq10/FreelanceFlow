import { useState } from 'react'
import { FileDown, Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button, Card, Input, Modal } from '../../components/ui'
import { invoices as invoiceApi } from '../../api/endpoints'
import { formatCurrency } from '../../utils/formatters'

const reasonOf = (error, fallback) => error.response?.data?.error || error.response?.data?.reason?.[0] || fallback

/** Credit notes lower what is still owed on a sent invoice; the server keeps them append-only (FEAT-4). */
function CreditNotes({ invoice, onChange }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ amount: '', reason: '' })
  const [saving, setSaving] = useState(false)
  const money = (value) => formatCurrency(value, invoice.currency)
  const canIssue = ['sent', 'overdue'].includes(invoice.status)
  const notes = invoice.credit_notes ?? []
  if (!canIssue && notes.length === 0) return null

  const issue = async () => {
    setSaving(true)
    try {
      await invoiceApi.createCreditNote(invoice.id, form)
      const { data } = await invoiceApi.get(invoice.id)
      onChange(data)
      setOpen(false)
      setForm({ amount: '', reason: '' })
      toast.success('Credit note issued')
    } catch (error) {
      toast.error(reasonOf(error, 'Could not issue the credit note'))
    } finally {
      setSaving(false)
    }
  }

  const download = async (note) => {
    try {
      const { data } = await invoiceApi.getCreditNotePdf(note.id)
      const url = window.URL.createObjectURL(data)
      const link = document.createElement('a')
      link.href = url
      link.download = `${note.number}.pdf`
      link.click()
      window.URL.revokeObjectURL(url)
    } catch {
      toast.error('Could not download the credit note')
    }
  }

  return (
    <>
      <Card>
        <Card.Header className="flex items-center justify-between">
          <Card.Title>Credit notes</Card.Title>
          {canIssue && (
            <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
              <Plus className="w-4 h-4 mr-1.5" />
              Issue credit note
            </Button>
          )}
        </Card.Header>
        <Card.Content>
          {notes.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">None yet.</p>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-white/8 text-sm">
              {notes.map((note) => (
                <li key={note.id} className="flex items-center justify-between gap-4 py-2">
                  <span className="text-gray-600 dark:text-gray-400">
                    {note.number} · {note.reason}
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="font-medium">−{money(note.amount)}</span>
                    <button
                      type="button"
                      aria-label={`Download ${note.number}`}
                      onClick={() => download(note)}
                      className="text-gray-500 hover:text-gray-900 dark:hover:text-white"
                    >
                      <FileDown className="w-4 h-4" />
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card.Content>
      </Card>

      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title="Issue credit note"
        description={`${money(invoice.amount_due)} still due on ${invoice.invoice_number}. A credit cannot be edited or deleted.`}
      >
        <div className="space-y-4">
          <Input
            label="Amount"
            type="number"
            step="0.01"
            min="0.01"
            max={invoice.amount_due}
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
          />
          <Input
            label="Reason"
            maxLength={255}
            value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
          />
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={issue} loading={saving} disabled={!form.amount || !form.reason.trim()}>
            Issue credit note
          </Button>
        </div>
      </Modal>
    </>
  )
}

export default CreditNotes
