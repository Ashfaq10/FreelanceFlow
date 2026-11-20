import { useState } from 'react'
import { Download, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { Card, Button, Input } from '../../components/ui'
import { auth } from '../../api/endpoints'
import { useAuth } from '../../context/AuthContext'

/** Export everything, or close the account. Lives outside the settings <form>: Enter must not save settings. */
function DataTab() {
  const { logout } = useAuth()
  const [exporting, setExporting] = useState(false)
  const [password, setPassword] = useState('')
  const [deleting, setDeleting] = useState(false)

  const exportData = async () => {
    setExporting(true)
    try {
      const { data } = await auth.exportData()
      const url = window.URL.createObjectURL(data)
      const link = document.createElement('a')
      link.href = url
      link.download = 'freelanceflow-export.json'
      link.click()
      window.URL.revokeObjectURL(url)
    } catch {
      toast.error('Could not export your data. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  const deleteAccount = async () => {
    setDeleting(true)
    try {
      await auth.deleteAccount(password)
      toast.success('Your account has been deleted.')
      await logout()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not delete your account.')
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <Card.Header>
          <Card.Title>Export your data</Card.Title>
          <Card.Description>
            One JSON file with your profile, clients, invoices (payments, credit notes, activity) and time logs.
          </Card.Description>
        </Card.Header>
        <Card.Footer>
          <Button type="button" variant="secondary" onClick={exportData} loading={exporting}>
            <Download className="w-4 h-4 mr-2" />
            Download my data
          </Button>
        </Card.Footer>
      </Card>

      <Card>
        <Card.Header>
          <Card.Title>Delete your account</Card.Title>
          <Card.Description>
            Your profile, drafts, time logs and stored PDFs are erased and you can no longer sign in. Invoices you have
            issued, their payments and the clients they name are kept, because accounting records must be. This cannot
            be undone.
          </Card.Description>
        </Card.Header>
        <Card.Content>
          <Input
            label="Confirm with your password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Card.Content>
        <Card.Footer>
          <Button type="button" variant="danger" onClick={deleteAccount} loading={deleting} disabled={!password}>
            <Trash2 className="w-4 h-4 mr-2" />
            Delete my account
          </Button>
        </Card.Footer>
      </Card>
    </div>
  )
}

export default DataTab
