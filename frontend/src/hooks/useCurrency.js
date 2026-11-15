import { useAuth } from '../context/AuthContext'

/** The signed-in user's currency. Screens must never hardcode `$` (BUG-5). */
export function useCurrency() {
  const { user } = useAuth()
  return user?.default_currency || 'USD'
}
