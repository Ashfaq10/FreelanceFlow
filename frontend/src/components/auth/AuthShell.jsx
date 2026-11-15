import { useEffect, useState } from 'react'
import { Sun, Moon } from 'lucide-react'
import { Wordmark } from '../ui'
import SampleInvoice from './SampleInvoice'

/** Solid primary button for the auth pages; the app-wide gradient and glow stay inside the app. */
export const AUTH_SUBMIT = '!bg-none !bg-primary-600 hover:!bg-primary-700 !shadow-none hover:!translate-y-0 w-full'

/**
 * Shared frame for sign in, sign up and password recovery (one look for the whole flow).
 * Left: a sample invoice going from sent to paid. Right: the form, directly on the page.
 */
function AuthShell({ title, subtitle, footer, children }) {
  // Same storage key as before; one theme provider is still UX-5.
  const [dark, setDark] = useState(() => localStorage.getItem('darkMode') === 'true')

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])

  const toggleTheme = () => {
    const next = !dark
    setDark(next)
    localStorage.setItem('darkMode', String(next))
  }

  return (
    <div className="min-h-screen flex bg-surface-light dark:bg-surface-dark">
      <aside className="hidden lg:flex lg:w-[46%] xl:w-1/2 bg-primary-900 text-white flex-col px-14 py-12">
        <Wordmark variant="light" />
        <div className="flex-1 flex flex-col justify-center py-10">
          <h2 className="text-4xl xl:text-5xl font-semibold tracking-tight leading-[1.08] max-w-md">
            Send the invoice. Get paid.
          </h2>
          <div className="mt-10">
            <SampleInvoice />
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center justify-between px-6 sm:px-10 pt-6">
          <Wordmark size="sm" className="lg:invisible" />
          <button
            type="button"
            onClick={toggleTheme}
            aria-pressed={dark}
            aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            className="p-2.5 rounded-xl text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          >
            {dark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </header>

        <main className="flex-1 flex items-center justify-center px-6 sm:px-10 py-10">
          <div className="w-full max-w-sm">
            <h1 className="text-3xl font-semibold tracking-tight text-gray-900 dark:text-white">{title}</h1>
            {subtitle && <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{subtitle}</p>}
            <div className="mt-8">{children}</div>
            {footer && <p className="mt-8 text-sm text-gray-600 dark:text-gray-400">{footer}</p>}
          </div>
        </main>
      </div>
    </div>
  )
}

export default AuthShell
