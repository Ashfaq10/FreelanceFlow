import { createContext, useContext, useState, useEffect } from 'react'
import api from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const token = localStorage.getItem('token')
    if (token) {
      try {
        const response = await api.get('/api/auth/user/')
        setUser(response.data)
      } catch (error) {
        // Only a 401 means the token is dead; a 500 or a dropped connection must not log the user out (BUG-8).
        if (error.response?.status === 401) {
          localStorage.removeItem('token')
          setUser(null)
        }
      }
    }
    setLoading(false)
  }

  const login = async (email, password) => {
    const response = await api.post('/api/auth/login/', { email, password })
    const { token, user } = response.data
    localStorage.setItem('token', token)
    setUser(user)
    return user
  }

  const signup = async (email, password1, password2) => {
    const response = await api.post('/api/auth/signup/', { email, password1, password2 })
    const { token, user } = response.data
    localStorage.setItem('token', token)
    setUser(user)
    return user
  }

  const logout = async () => {
    try {
      await api.post('/api/auth/logout/')
    } catch {
      // Ignore logout errors
    }
    localStorage.removeItem('token')
    setUser(null)
  }

  const updateUser = (userData) => {
    setUser((prev) => ({ ...prev, ...userData }))
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, updateUser, checkAuth }}>
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
