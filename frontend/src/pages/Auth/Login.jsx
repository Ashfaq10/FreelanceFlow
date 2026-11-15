import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Mail, Lock, Eye, EyeOff, CheckCircle2, Sun, Moon } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import { Button, Wordmark } from '../../components/ui'

const features = [
  'Create beautiful, professional invoices in seconds',
  'Track time and bill clients accurately',
  'Get paid faster with automated reminders',
  'Understand your business with rich reports',
]

function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('darkMode') === 'true'
  })

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

  const { register, handleSubmit, formState: { errors } } = useForm()

  const onSubmit = async (data) => {
    setLoading(true)
    try {
      await login(data.email, data.password)
      toast.success('Welcome back!')
      navigate('/')
    } catch (error) {
      const message = error.response?.data?.message || 'Invalid email or password'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex relative">
      {/* Dark mode toggle — top right */}
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
      {/* ── Left Panel: Branding ────────────────────── */}
      <div
        className="hidden lg:flex lg:w-1/2 xl:w-[55%] flex-col justify-center items-start p-10 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #0f1521 0%, #141d2e 30%, #1d4ed8 60%, #06b6d4 100%)',
        }}
      >
        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        {/* Glow orbs */}
        <div className="absolute top-1/4 -left-20 w-80 h-80 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #60a5fa, transparent 70%)' }}
        />
        <div className="absolute bottom-1/4 right-10 w-60 h-60 rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, #22d3ee, transparent 70%)' }}
        />

        {/* Centered content */}
        <div className="relative z-10 space-y-8 max-w-md">
          {/* Wordmark on the dark panel */}
          <Wordmark variant="light" />

          {/* Headline + description */}
          <div>
            <h2 className="text-4xl xl:text-5xl font-bold text-white leading-tight">
              Your freelance business,
              <br />
              <span className="text-transparent" style={{ WebkitTextStroke: '1px rgba(255,255,255,0.5)' }}>
                simplified.
              </span>
            </h2>
            <p className="mt-4 text-lg text-blue-200/80 leading-relaxed">
              Everything you need to manage clients, track time, and get paid — in one beautiful workspace.
            </p>
          </div>

          {/* Feature list */}
          <ul className="space-y-3">
            {features.map((f, i) => (
              <li key={i} className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-blue-300 flex-shrink-0 mt-0.5" />
                <span className="text-blue-100 text-sm">{f}</span>
              </li>
            ))}
          </ul>
        </div>

      </div>

      {/* ── Right Panel: Form ───────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-surface-light dark:bg-surface-dark">
        <div className="mb-8 lg:hidden">
          <Wordmark />
        </div>

        <div className="w-full max-w-md animate-fade-up">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Welcome back</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Sign in to your account to continue</p>
          </div>

          {/* Form card */}
          <div className="bg-white dark:bg-gray-800/60 rounded-2xl p-8 border border-gray-200/80 dark:border-white/8"
            style={{
              backdropFilter: 'blur(12px)',
              boxShadow: '0 4px 32px rgba(0,0,0,.08)',
            }}
          >
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* Email */}
              <div>
                <label className="label">Email address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400 pointer-events-none" />
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
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    {...register('password', { required: 'Password is required' })}
                    className={`input pl-10 pr-11 ${errors.password ? 'border-red-400' : ''}`}
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
                {errors.password && (
                  <p className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400">{errors.password.message}</p>
                )}
              </div>

              {/* Remember + Forgot */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:checked:bg-primary-500"
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-400">Remember me</span>
                </label>
                <Link
                  to="/forgot-password"
                  className="text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>

              <Button type="submit" loading={loading} className="w-full" size="lg">
                Sign in
              </Button>
            </form>
          </div>

          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
            Don&apos;t have an account?{' '}
            <Link to="/signup" className="font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-colors">
              Create one free
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Login
