import axios from 'axios'
import toast from 'react-hot-toast'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Token ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const { status } = error.response
      
      // A 401 from /api/auth/* means "those credentials are wrong", not "your session expired";
      // redirecting there wiped the login page's own error message (BUG-1).
      const isAuthRequest = (error.config?.url || '').includes('/api/auth/')
      const hadToken = !!localStorage.getItem('token')

      if (status === 401) {
        if (hadToken && !isAuthRequest) {
          localStorage.removeItem('token')
          window.location.href = '/login'
        }
      } else if (status === 403) {
        toast.error('You do not have permission to perform this action')
      } else if (status === 404) {
        toast.error('Resource not found')
      } else if (status >= 500) {
        toast.error('Server error. Please try again later.')
      }
    } else if (error.request) {
      toast.error('Network error. Please check your connection.')
    }
    
    return Promise.reject(error)
  }
)

export default api
