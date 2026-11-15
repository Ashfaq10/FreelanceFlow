import api from './client'

export const auth = {
  login: (data) => api.post('/api/auth/login/', data),
  signup: (data) => api.post('/api/auth/signup/', data),
  logout: () => api.post('/api/auth/logout/'),
  getUser: () => api.get('/api/auth/user/'),
  updateProfile: (data) => api.patch('/api/auth/user/', data),
  resetPassword: (email) => api.post('/api/auth/password/reset/', { email }),
  confirmPasswordReset: (data) => api.post('/api/auth/password/reset/confirm/', data),
}

export const invoices = {
  list: (params) => api.get('/api/invoices/', { params }),
  get: (id) => api.get(`/api/invoices/${id}/`),
  create: (data) => api.post('/api/invoices/', data),
  update: (id, data) => api.patch(`/api/invoices/${id}/`, data),
  delete: (id) => api.delete(`/api/invoices/${id}/`),
  send: (id) => api.post(`/api/invoices/${id}/send/`),
  markPaid: (id) => api.post(`/api/invoices/${id}/mark-paid/`),
  getPdf: (id, params = {}) => api.get(`/api/invoices/${id}/pdf/`, { responseType: 'blob', params }),
  checkout: (id) => api.post(`/api/invoices/${id}/checkout/`),
  recordPayment: (id, data) => api.post(`/api/invoices/${id}/payments/`, data),
}

export const clients = {
  list: (params) => api.get('/api/clients/', { params }),
  get: (id) => api.get(`/api/clients/${id}/`),
  create: (data) => api.post('/api/clients/', data),
  update: (id, data) => api.patch(`/api/clients/${id}/`, data),
  delete: (id) => api.delete(`/api/clients/${id}/`),
  archive: (id) => api.patch(`/api/clients/${id}/`, { is_archived: true }),
}

export const timeLogs = {
  list: (params) => api.get('/api/time-logs/', { params }),
  get: (id) => api.get(`/api/time-logs/${id}/`),
  create: (data) => api.post('/api/time-logs/', data),
  update: (id, data) => api.patch(`/api/time-logs/${id}/`, data),
  delete: (id) => api.delete(`/api/time-logs/${id}/`),
  bill: (data) => api.post('/api/time-logs/bill/', data),
}

export const dashboard = {
  getSummary: () => api.get('/api/dashboard/summary/'),
  getMonthlyRevenue: (months = 12) => api.get('/api/dashboard/monthly-revenue/', { params: { months } }),
}

export const settings = {
  get: () => api.get('/api/settings/'),
  update: (data) => api.patch('/api/settings/', data),
  uploadLogo: (file) => {
    const formData = new FormData()
    formData.append('logo', file)
    return api.post('/api/auth/logo/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
}
