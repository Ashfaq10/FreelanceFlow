import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { auth } from '../../api/endpoints'
import { Button, Input } from '../../components/ui'
import AuthShell, { AUTH_SUBMIT } from '../../components/auth/AuthShell'

const LINK =
  'font-semibold text-primary-700 hover:text-primary-800 dark:text-primary-300 dark:hover:text-primary-200 underline-offset-4 hover:underline'

function ForgotPassword() {
  const [loading, setLoading] = useState(false)
  const [sentTo, setSentTo] = useState('')
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm()

  const onSubmit = async (data) => {
    setLoading(true)
    try {
      await auth.resetPassword(data.email)
      setSentTo(data.email)
    } catch {
      toast.error('Could not send the reset email. Try again in a moment.')
    } finally {
      setLoading(false)
    }
  }

  const back = (
    <Link to="/login" className={LINK}>
      Back to sign in
    </Link>
  )

  if (sentTo) {
    return (
      <AuthShell
        title="Check your email"
        subtitle={`If ${sentTo} has an account, a reset link is on its way. It works once.`}
        footer={back}
      >
        <Button type="button" variant="secondary" size="lg" className="w-full" onClick={() => setSentTo('')}>
          Use a different email
        </Button>
      </AuthShell>
    )
  }

  return (
    <AuthShell title="Reset your password" subtitle="Enter your email and we will send you a link." footer={back}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          error={errors.email?.message}
          {...register('email', {
            required: 'Enter your email',
            pattern: {
              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
              message: 'That email address looks incomplete',
            },
          })}
        />
        <Button type="submit" loading={loading} size="lg" className={AUTH_SUBMIT}>
          Send reset link
        </Button>
      </form>
    </AuthShell>
  )
}

export default ForgotPassword
