import api from './client'

export const auth = {
  updateProfile: (data) => api.patch('/api/auth/user/', data),
  resetPassword: (email) => api.post('/api/auth/password/reset/', { email }),
  confirmPasswordReset: (data) => api.post('/api/auth/password/reset/confirm/', data),
  verifyEmail: (token) => api.post('/api/auth/verify-email/', { token }),
  resendVerification: () => api.post('/api/auth/verify-email/resend/'),
  exportData: () => api.get('/api/auth/export/', { responseType: 'blob' }),
  deleteAccount: (password) => api.post('/api/auth/delete/', { password }),
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
  cancel: (id, reason = '') => api.post(`/api/invoices/${id}/cancel/`, { reason }),
  createCreditNote: (id, data) => api.post(`/api/invoices/${id}/credit-notes/`, data),
  getCreditNotePdf: (noteId) => api.get(`/api/credit-notes/${noteId}/pdf/`, { responseType: 'blob' }),
  duplicate: (id) => api.post(`/api/invoices/${id}/duplicate/`),
  remind: (id) => api.post(`/api/invoices/${id}/remind/`),
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
  create: (data) => api.post('/api/time-logs/', data),
  update: (id, data) => api.patch(`/api/time-logs/${id}/`, data),
  delete: (id) => api.delete(`/api/time-logs/${id}/`),
  bill: (data) => api.post('/api/time-logs/bill/', data),
}

export const dashboard = {
  getSummary: () => api.get('/api/dashboard/summary/'),
  getMonthlyRevenue: (months = 12) => api.get('/api/dashboard/monthly-revenue/', { params: { months } }),
}

export const recurring = {
  list: (params) => api.get('/api/recurring/', { params }),
  create: (data) => api.post('/api/recurring/', data),
  update: (id, data) => api.patch(`/api/recurring/${id}/`, data),
  delete: (id) => api.delete(`/api/recurring/${id}/`),
}

export const exports = {
  download: (kind) => api.get(`/api/exports/${kind}/`, { responseType: 'blob' }),
}

export const settings = {
  uploadLogo: (file) => {
    const formData = new FormData()
    formData.append('logo', file)
    return api.post('/api/auth/logo/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}
