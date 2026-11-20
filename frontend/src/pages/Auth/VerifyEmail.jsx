import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { auth } from '../../api/endpoints'
import { useAuth } from '../../context/AuthContext'
import AuthShell from '../../components/auth/AuthShell'

const LINK =
  'font-semibold text-primary-700 hover:text-primary-800 dark:text-primary-300 dark:hover:text-primary-200 underline-offset-4 hover:underline'

/** Landing page of the link in the verification email; works signed in or out. */
function VerifyEmail() {
  const { token } = useParams()
  const { user, checkAuth } = useAuth()
  const [state, setState] = useState('checking')

  useEffect(() => {
    let cancelled = false
    auth
      .verifyEmail(token)
      .then(() => {
        if (cancelled) return
        setState('done')
        if (user) checkAuth() // clears the banner without a reload
      })
      .catch(() => !cancelled && setState('failed'))
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- confirm once per link, not whenever the user object changes
  }, [token])

  return (
    <AuthShell
      title={state === 'done' ? 'Email confirmed' : state === 'failed' ? 'Link not valid' : 'Confirming your email…'}
      subtitle={
        state === 'done'
          ? 'You can send invoices to your clients now.'
          : state === 'failed'
            ? 'It may have expired. Sign in and ask for a new one from the banner at the top.'
            : 'One moment.'
      }
      footer={
        <Link to={user ? '/' : '/login'} className={LINK}>
          {user ? 'Go to your dashboard' : 'Go to sign in'}
        </Link>
      }
    />
  )
}

export default VerifyEmail
