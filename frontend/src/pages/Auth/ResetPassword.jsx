import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Lock, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'
import { auth } from '../../api/endpoints'
import { Button, Input, Wordmark } from '../../components/ui'

function ResetPassword() {
  const { uid, token } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const { register, handleSubmit, watch, formState: { errors } } = useForm()

  const onSubmit = async (data) => {
    setLoading(true)
    try {
      await auth.confirmPasswordReset({ uid, token, new_password: data.password })
      toast.success('Password updated. Sign in with your new password.')
      navigate('/login')
    } catch (error) {
      toast.error(error.response?.data?.message || 'This reset link is invalid or has expired.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-surface-light dark:bg-surface-dark">
      <Wordmark className="mb-8" />

      <div className="w-full max-w-md animate-fade-up">
        <div className="mb-7 text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Choose a new password</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5">
            The link works once, so finish here.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="card p-6 space-y-5">
          <div className="relative">
            <Input
              label="New password"
              type={showPassword ? 'text' : 'password'}
              icon={Lock}
              placeholder="••••••••"
              error={errors.password?.message}
              {...register('password', {
                required: 'A new password is required',
                minLength: { value: 8, message: 'At least 8 characters' },
              })}
            />
            <button
              type="button"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-9 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <Input
            label="Confirm new password"
            type={showPassword ? 'text' : 'password'}
            icon={Lock}
            placeholder="••••••••"
            error={errors.confirm?.message}
            {...register('confirm', {
              required: 'Please repeat the password',
              validate: (value) => value === watch('password') || 'The passwords do not match',
            })}
          />

          <Button type="submit" className="w-full" loading={loading}>
            Update password
          </Button>
        </form>

        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
          <Link to="/login" className="font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  )
}

export default ResetPassword
