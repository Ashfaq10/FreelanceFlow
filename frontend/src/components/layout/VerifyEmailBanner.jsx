import { useState } from 'react'
import toast from 'react-hot-toast'
import { auth } from '../../api/endpoints'
import { useAuth } from '../../context/AuthContext'

/** Until the address is confirmed the server refuses to send invoices; say so before the user hits that wall. */
function VerifyEmailBanner() {
  const { user } = useAuth()
  const [sending, setSending] = useState(false)
  if (!user || user.email_verified !== false) return null

  const resend = async () => {
    setSending(true)
    try {
      await auth.resendVerification()
      toast.success('Sent. Check your inbox.')
    } catch {
      toast.error('Could not send the email. Try again in a little while.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div
      role="status"
      className="bg-amber-50 text-amber-900 dark:bg-amber-500/10 dark:text-amber-200 px-4 py-2 text-sm"
    >
      Confirm your email address to send invoices. We sent a link to {user.email}.{' '}
      <button type="button" onClick={resend} disabled={sending} className="font-semibold underline">
        Resend email
      </button>
    </div>
  )
}

export default VerifyEmailBanner
