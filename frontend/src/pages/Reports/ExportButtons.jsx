import { useState } from 'react'
import { Download } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '../../components/ui'
import { exports as exportsApi } from '../../api/endpoints'

const FILES = [
  { kind: 'invoices', label: 'Invoices' },
  { kind: 'payments', label: 'Payments' },
  { kind: 'time-logs', label: 'Time logs' },
]

/** Accountant hand-off: one CSV per kind, downloaded through the API so the session cookie applies. */
function ExportButtons() {
  const [busy, setBusy] = useState('')

  const download = async (kind) => {
    setBusy(kind)
    try {
      const { data } = await exportsApi.download(kind)
      const url = window.URL.createObjectURL(data)
      const link = document.createElement('a')
      link.href = url
      link.download = `freelanceflow-${kind}.csv`
      link.click()
      window.URL.revokeObjectURL(url)
    } catch {
      toast.error('Could not export. Please try again.')
    } finally {
      setBusy('')
    }
  }

  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Export CSV">
      {FILES.map(({ kind, label }) => (
        <Button key={kind} variant="secondary" size="sm" onClick={() => download(kind)} loading={busy === kind}>
          <Download className="w-4 h-4 mr-1.5" />
          {label} CSV
        </Button>
      ))}
    </div>
  )
}

export default ExportButtons
