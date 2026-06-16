import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Mail, ArrowLeft, CheckCircle2, Zap, Sun, Moon } from 'lucide-react'
import toast from 'react-hot-toast'
import { auth } from '../../api/endpoints'
import { Button } from '../../components/ui'

function ForgotPassword() {
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('darkMode') === 'true')

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark')
    else document.documentElement.classList.remove('dark')
  }, [])

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
      await auth.resetPassword(data.email)
      setSubmitted(true)
    } catch (error) {
      toast.error('Failed to send reset email. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen relative flex flex-col items-center justify-center bg-surface-light dark:bg-surface-dark px-4">
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
        <div className="w-full max-w-md text-center animate-scale-in">
          <div className="w-16 h-16 mx-auto mb-5 rounded-2xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, rgba(16,185,129,.15) 0%, rgba(52,211,153,.08) 100%)', boxShadow: '0 4px 16px rgba(16,185,129,.2)' }}
          >
            <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Check your email</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm">
            We've sent a password reset link to your email address.
          </p>
          <Link to="/login" className="btn btn-primary inline-flex mt-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to sign in
          </Link>
        </div>
      </div>
    )
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reset your password</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5">
            Enter your email and we'll send you a reset link.
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800/60 rounded-2xl p-8 border border-gray-200/80 dark:border-white/8"
          style={{ backdropFilter: 'blur(12px)', boxShadow: '0 4px 32px rgba(0,0,0,.08)' }}
        >
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
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

            <Button type="submit" loading={loading} className="w-full" size="lg">
              Send reset link
            </Button>
          </form>
        </div>

        <div className="text-center mt-6">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  )
}

export default ForgotPassword
