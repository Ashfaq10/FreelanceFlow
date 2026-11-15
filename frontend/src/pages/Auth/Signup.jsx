import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import { Button, Input } from '../../components/ui'
import AuthShell, { AUTH_SUBMIT } from '../../components/auth/AuthShell'
import PasswordField from '../../components/auth/PasswordField'

const LINK =
  'font-semibold text-primary-700 hover:text-primary-800 dark:text-primary-300 dark:hover:text-primary-200 underline-offset-4 hover:underline'

function Signup() {
  const { signup } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm()
  const password = watch('password1')

  const onSubmit = async (data) => {
    setLoading(true)
    try {
      await signup(data.email, data.password1, data.password2)
      toast.success('Account created')
      navigate('/')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not create your account')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Free to start. Add a client and send your first invoice."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className={LINK}>
            Sign in
          </Link>
        </>
      }
    >
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

        <PasswordField
          label="Password"
          autoComplete="new-password"
          hint="Use at least 8 characters."
          error={errors.password1?.message}
          {...register('password1', {
            required: 'Choose a password',
            minLength: { value: 8, message: 'Use at least 8 characters' },
          })}
        />

        <PasswordField
          label="Confirm password"
          autoComplete="new-password"
          error={errors.password2?.message}
          {...register('password2', {
            required: 'Type the password again',
            validate: (value) => value === password || 'The passwords do not match',
          })}
        />

        <Button type="submit" loading={loading} size="lg" className={AUTH_SUBMIT}>
          Create account
        </Button>
      </form>
    </AuthShell>
  )
}

export default Signup
