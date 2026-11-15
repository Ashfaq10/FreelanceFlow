import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { auth } from '../../api/endpoints'
import { Button } from '../../components/ui'
import AuthShell, { AUTH_SUBMIT } from '../../components/auth/AuthShell'
import PasswordField from '../../components/auth/PasswordField'

function ResetPassword() {
  const { uid, token } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
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
    <AuthShell
      title="Choose a new password"
      subtitle="The link works once, so finish here."
      footer={<Link to="/login" className="font-semibold text-primary-700 hover:text-primary-800 dark:text-primary-300 dark:hover:text-primary-200 underline-offset-4 hover:underline">Back to sign in</Link>}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <PasswordField
          label="New password"
          autoComplete="new-password"
          hint="Use at least 8 characters."
          error={errors.password?.message}
          {...register('password', {
            required: 'Choose a new password',
            minLength: { value: 8, message: 'Use at least 8 characters' },
          })}
        />
        <PasswordField
          label="Confirm new password"
          autoComplete="new-password"
          error={errors.confirm?.message}
          {...register('confirm', {
            required: 'Type the password again',
            validate: (value) => value === watch('password') || 'The passwords do not match',
          })}
        />
        <Button type="submit" loading={loading} size="lg" className={AUTH_SUBMIT}>Update password</Button>
      </form>
    </AuthShell>
  )
}

export default ResetPassword
