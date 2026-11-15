import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Layout from './components/layout/Layout'
import Login from './pages/Auth/Login'
import Signup from './pages/Auth/Signup'
import ForgotPassword from './pages/Auth/ForgotPassword'
import ResetPassword from './pages/Auth/ResetPassword'
import Dashboard from './pages/Dashboard'
import InvoiceList from './pages/Invoices/InvoiceList'
import InvoiceCreate from './pages/Invoices/InvoiceCreate'
import InvoiceDetail from './pages/Invoices/InvoiceDetail'
import ClientList from './pages/Clients/ClientList'
import ClientDetail from './pages/Clients/ClientDetail'
import ClientCreate from './pages/Clients/ClientCreate'
import TimeTracker from './pages/TimeTracker/TimeTracker'
import Reports from './pages/Reports/Reports'
import Settings from './pages/Settings/Settings'
import PublicInvoice from './pages/Public/PublicInvoice'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-light dark:bg-surface-dark">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-primary-200 border-t-primary-600 animate-spin" />
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Loading...</p>
        </div>
      </div>
    )
  }

  // A failed profile load (500, offline) leaves `user` null while the token is still good:
  // let the page render and show its own error instead of bouncing to the login screen (BUG-15).
  return user || localStorage.getItem('token') ? children : <Navigate to="/login" />
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-light dark:bg-surface-dark">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-primary-200 border-t-primary-600 animate-spin" />
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Loading...</p>
        </div>
      </div>
    )
  }

  return user ? <Navigate to="/" /> : children
}

function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
      <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
      <Route path="/reset-password/:uid/:token" element={<PublicRoute><ResetPassword /></PublicRoute>} />
      {/* The client's invoice page: no account, token is the credential (FEAT-3) */}
      <Route path="/pay/:token" element={<PublicInvoice />} />

      {/* Private routes */}
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="invoices" element={<InvoiceList />} />
        <Route path="invoices/new" element={<InvoiceCreate />} />
        <Route path="invoices/:id" element={<InvoiceDetail />} />
        <Route path="invoices/:id/edit" element={<InvoiceCreate />} />
        <Route path="clients" element={<ClientList />} />
        <Route path="clients/new" element={<ClientCreate />} />
        <Route path="clients/:id" element={<ClientDetail />} />
        <Route path="clients/:id/edit" element={<ClientCreate />} />
        <Route path="time-tracker" element={<TimeTracker />} />
        <Route path="reports" element={<Reports />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  )
}

export default App
