import axios from 'axios'
import toast from 'react-hot-toast'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  headers: {
    'Content-Type': 'application/json',
  },
  // The session lives in an HttpOnly cookie; scripts only echo Django's CSRF cookie back on writes (SEC-5).
  xsrfCookieName: 'csrftoken',
  xsrfHeaderName: 'X-CSRFToken',
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const { status } = error.response

      // A 401 from /api/auth/* means "those credentials are wrong" (or "not signed in yet" on page load),
      // not "your session expired"; redirecting there wiped the login page's own error message (BUG-1).
      const isAuthRequest = (error.config?.url || '').includes('/api/auth/')

      if (status === 401) {
        if (!isAuthRequest) window.location.href = '/login'
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
