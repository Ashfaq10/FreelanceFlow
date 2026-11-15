import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import { Button, Input } from '../../components/ui'
import AuthShell, { AUTH_SUBMIT } from '../../components/auth/AuthShell'
import PasswordField from '../../components/auth/PasswordField'

const LINK = 'font-semibold text-primary-700 hover:text-primary-800 dark:text-primary-300 dark:hover:text-primary-200 underline-offset-4 hover:underline'

function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm()

  const onSubmit = async (data) => {
    setLoading(true)
    try {
      await login(data.email, data.password)
      toast.success('Welcome back!')
      navigate('/')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      title="Sign in"
      subtitle="Pick up where you left off."
      footer={<>New to FreelanceFlow? <Link to="/signup" className={LINK}>Create an account</Link></>}
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
            pattern: { value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i, message: 'That email address looks incomplete' },
          })}
        />

        <PasswordField
          label="Password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password', { required: 'Enter your password' })}
        />

        <div className="flex justify-end -mt-2">
          <Link to="/forgot-password" className={`text-sm ${LINK}`}>Forgot password?</Link>
        </div>

        <Button type="submit" loading={loading} size="lg" className={AUTH_SUBMIT}>Sign in</Button>
      </form>
    </AuthShell>
  )
}

export default Login
