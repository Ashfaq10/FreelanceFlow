import { createContext, useContext, useState, useEffect } from 'react'
import api from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  // The profile load failed for a reason other than "not signed in" (500, offline): the session may still be good.
  const [sessionUnknown, setSessionUnknown] = useState(false)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    // shortcut: drops the pre-SEC-5 token still sitting in browsers that used the old login; delete this line later.
    localStorage.removeItem('token')
    try {
      const response = await api.get('/api/auth/user/')
      setUser(response.data)
      setSessionUnknown(false)
    } catch (error) {
      // Only a 401 means "signed out"; a 500 or a dropped connection must not log the user out (BUG-8).
      if (error.response?.status === 401) setUser(null)
      else setSessionUnknown(true)
    }
    setLoading(false)
  }

  const login = async (email, password) => {
    const response = await api.post('/api/auth/login/', { email, password })
    setUser(response.data.user)
    return response.data.user
  }

  const signup = async (email, password1, password2) => {
    const response = await api.post('/api/auth/signup/', { email, password1, password2 })
    setUser(response.data.user)
    return response.data.user
  }

  const logout = async () => {
    try {
      await api.post('/api/auth/logout/')
    } catch {
      // Ignore logout errors
    }
    setUser(null)
    setSessionUnknown(false)
  }

  const updateUser = (userData) => {
    setUser((prev) => ({ ...prev, ...userData }))
  }

  return (
    <AuthContext.Provider value={{ user, loading, sessionUnknown, login, signup, logout, updateUser, checkAuth }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components -- hook lives beside its provider by design
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
