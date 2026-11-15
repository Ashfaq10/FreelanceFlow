import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const STORAGE_KEY = 'theme'
const CHOICES = ['light', 'dark', 'system']
const DARK_QUERY = '(prefers-color-scheme: dark)'

function readChoice() {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (CHOICES.includes(saved)) return saved
  // Before this key existed the choice lived in `darkMode`.
  return localStorage.getItem('darkMode') === 'true' ? 'dark' : 'light'
}

const systemPrefersDark = () => typeof window.matchMedia === 'function' && window.matchMedia(DARK_QUERY).matches

const ThemeContext = createContext(null)

/** One owner for light / dark / system: the toggle, Settings and every page read it from here (UX-5). */
export function ThemeProvider({ children }) {
  const [choice, setChoice] = useState(readChoice)
  const [systemDark, setSystemDark] = useState(systemPrefersDark)

  const dark = choice === 'dark' || (choice === 'system' && systemDark)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])

  useEffect(() => {
    if (choice !== 'system' || typeof window.matchMedia !== 'function') return undefined
    const query = window.matchMedia(DARK_QUERY)
    const onChange = (event) => setSystemDark(event.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [choice])

  const setTheme = useCallback((next) => {
    if (!CHOICES.includes(next)) return
    localStorage.setItem(STORAGE_KEY, next)
    setChoice(next)
  }, [])

  const toggle = useCallback(() => setTheme(dark ? 'light' : 'dark'), [dark, setTheme])

  const value = useMemo(() => ({ choice, dark, setTheme, toggle }), [choice, dark, setTheme, toggle])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components -- hook lives beside its provider by design
export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used within a ThemeProvider')
  return context
}
