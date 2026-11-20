import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Layout from './components/layout/Layout'

const Login = lazy(() => import('./pages/Auth/Login'))
const Signup = lazy(() => import('./pages/Auth/Signup'))
const ForgotPassword = lazy(() => import('./pages/Auth/ForgotPassword'))
const ResetPassword = lazy(() => import('./pages/Auth/ResetPassword'))
const VerifyEmail = lazy(() => import('./pages/Auth/VerifyEmail'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const InvoiceList = lazy(() => import('./pages/Invoices/InvoiceList'))
const InvoiceCreate = lazy(() => import('./pages/Invoices/InvoiceCreate'))
const InvoiceDetail = lazy(() => import('./pages/Invoices/InvoiceDetail'))
const ClientList = lazy(() => import('./pages/Clients/ClientList'))
const ClientDetail = lazy(() => import('./pages/Clients/ClientDetail'))
const ClientCreate = lazy(() => import('./pages/Clients/ClientCreate'))
const TimeTracker = lazy(() => import('./pages/TimeTracker/TimeTracker'))
const Reports = lazy(() => import('./pages/Reports/Reports'))
const Settings = lazy(() => import('./pages/Settings/Settings'))
const PublicInvoice = lazy(() => import('./pages/Public/PublicInvoice'))
const NotFound = lazy(() => import('./pages/NotFound'))

function PageLoader() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center" role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-full border-2 border-primary-200 border-t-primary-600 animate-spin" />
        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Loading...</p>
      </div>
    </div>
  )
}

function PrivateRoute({ children }) {
  const { user, loading, sessionUnknown } = useAuth()

  if (loading) return <PageLoader />

  // A failed profile load (500, offline) leaves `user` null while the session may still be good:
  // let the page render and show its own error instead of bouncing to the login screen (BUG-15).
  return user || sessionUnknown ? children : <Navigate to="/login" />
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) return <PageLoader />

  return user ? <Navigate to="/" /> : children
}

function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public routes */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/signup"
          element={
            <PublicRoute>
              <Signup />
            </PublicRoute>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <PublicRoute>
              <ForgotPassword />
            </PublicRoute>
          }
        />
        <Route
          path="/reset-password/:uid/:token"
          element={
            <PublicRoute>
              <ResetPassword />
            </PublicRoute>
          }
        />
        {/* Works signed in or out: the link comes from an email */}
        <Route path="/verify-email/:token" element={<VerifyEmail />} />
        {/* The client's invoice page: no account, token is the credential (FEAT-3) */}
        <Route path="/pay/:token" element={<PublicInvoice />} />

        {/* Private routes */}
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
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
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  )
}

export default App
