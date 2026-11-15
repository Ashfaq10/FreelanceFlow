import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Mail, Lock, Eye, EyeOff, Zap, Sun, Moon } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import { Button } from '../../components/ui'

function Signup() {
  const { signup } = useAuth()
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('darkMode') === 'true')

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark')
    else document.documentElement.classList.remove('dark')
  }, [darkMode])

  const toggleDark = () => {
    const next = !darkMode
    setDarkMode(next)
    localStorage.setItem('darkMode', next.toString())
    if (next) document.documentElement.classList.add('dark')
    else document.documentElement.classList.remove('dark')
  }

  const { register, handleSubmit, watch, formState: { errors } } = useForm()
  const password = watch('password1')

  const onSubmit = async (data) => {
    setLoading(true)
    try {
      await signup(data.email, data.password1, data.password2)
      toast.success('Account created successfully!')
      navigate('/')
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to create account'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center bg-surface-light dark:bg-surface-dark px-4 py-12">
      {/* Dark mode toggle */}
      <button
        onClick={toggleDark}
        className="absolute top-4 right-4 z-50 p-2.5 rounded-xl bg-white/80 dark:bg-gray-800/80 border border-gray-200/70 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 shadow-sm transition-all hover:scale-105"
        aria-label="Toggle dark mode"
        style={{ backdropFilter: 'blur(8px)' }}
      >
        <div className="relative w-5 h-5">
          <Sun className={`absolute inset-0 w-5 h-5 transition-all duration-300 ${darkMode ? 'opacity-100 rotate-0' : 'opacity-0 rotate-90'}`} />
          <Moon className={`absolute inset-0 w-5 h-5 transition-all duration-300 ${darkMode ? 'opacity-0 -rotate-90' : 'opacity-100 rotate-0'}`} />
        </div>
      </button>
      {/* Logo */}
      <div className="flex items-center gap-2.5 mb-8">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #2563eb 0%, #06b6d4 100%)', boxShadow: '0 4px 12px rgba(37,99,235,.35)' }}
        >
          <Zap className="w-5 h-5 text-white" strokeWidth={2.5} />
        </div>
        <span className="text-xl font-bold gradient-text">FreelanceFlow</span>
      </div>

      <div className="w-full max-w-md animate-fade-up">
        <div className="mb-7 text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Create your account</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5">Start managing your freelance business for free</p>
        </div>

        <div className="bg-white dark:bg-gray-800/60 rounded-2xl p-8 border border-gray-200/80 dark:border-white/8"
          style={{ backdropFilter: 'blur(12px)', boxShadow: '0 4px 32px rgba(0,0,0,.08)' }}
        >
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Email */}
            <div>
              <label className="label">Email address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="email"
                  {...register('email', {
                    required: 'Email is required',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Invalid email address'
                    }
                  })}
                  className={`input pl-10 ${errors.email ? 'border-red-400' : ''}`}
                  placeholder="you@example.com"
                />
              </div>
              {errors.email && (
                <p className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  {...register('password1', {
                    required: 'Password is required',
                    minLength: { value: 8, message: 'At least 8 characters' }
                  })}
                  className={`input pl-10 pr-11 ${errors.password1 ? 'border-red-400' : ''}`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-lg"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password1 && (
                <p className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400">{errors.password1.message}</p>
              )}
            </div>

            {/* Confirm password */}
            <div>
              <label className="label">Confirm password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="password"
                  {...register('password2', {
                    required: 'Please confirm your password',
                    validate: value => value === password || 'Passwords do not match'
                  })}
                  className={`input pl-10 ${errors.password2 ? 'border-red-400' : ''}`}
                  placeholder="••••••••"
                />
              </div>
              {errors.password2 && (
                <p className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400">{errors.password2.message}</p>
              )}
            </div>

            <Button type="submit" loading={loading} className="w-full mt-2" size="lg">
              Create account
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}

export default Signup
