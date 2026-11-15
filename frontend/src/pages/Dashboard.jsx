import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { DollarSign, Clock, AlertTriangle, TrendingUp, ArrowRight, FileText, Users, Plus } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Card, Badge, StatsCard, Skeleton, ErrorState } from '../components/ui'
import { dashboard, invoices } from '../api/endpoints'
import { formatCurrency as formatMoney } from '../utils/formatters'
import { useCurrency } from '../hooks/useCurrency'

function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState(null)
  const [recentInvoices, setRecentInvoices] = useState([])
  const [chartData, setChartData] = useState([])
  const [failedCount, setFailedCount] = useState(0)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    setLoading(true)
    // One failing endpoint used to blank the whole dashboard (BUG-15).
    const [summaryRes, invoicesRes, revenueRes] = await Promise.allSettled([
      dashboard.getSummary(),
      invoices.list({ page_size: 5 }),
      dashboard.getMonthlyRevenue(12)
    ])

    if (summaryRes.status === 'fulfilled') setStats(summaryRes.value.data)
    if (invoicesRes.status === 'fulfilled') setRecentInvoices(invoicesRes.value.data.results || [])
    if (revenueRes.status === 'fulfilled') setChartData(revenueRes.value.data || [])

    const failures = [summaryRes, invoicesRes, revenueRes].filter(r => r.status === 'rejected')
    failures.forEach(r => console.error('Dashboard request failed:', r.reason))
    setFailedCount(failures.length)
    setLoading(false)
  }

  const currency = useCurrency()
  const formatCurrency = (amount) =>
    formatMoney(amount, currency, { minimumFractionDigits: 0, maximumFractionDigits: 0 })

  const getStatusBadge = (status) => {
    const variants = {
      draft: 'gray',
      sent: 'info',
      overdue: 'danger',
      paid: 'success',
      cancelled: 'gray',
    }
    return <Badge variant={variants[status] || 'gray'}>{status}</Badge>
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div>
          <Skeleton className="h-8 w-52 mb-2 rounded-xl" />
          <Skeleton className="h-4 w-72 rounded-lg" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {[...Array(4)].map((_, i) => (
            <Skeleton.Card key={i} />
          ))}
        </div>
      </div>
    )
  }

  if (failedCount === 3) {
    return <ErrorState title="Could not load your dashboard" onRetry={fetchDashboardData} />
  }

  return (
    <div className="space-y-6 animate-fade-up">
      {failedCount > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200">
          <span className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Some of this page could not be loaded.
          </span>
          <button onClick={fetchDashboardData} className="font-semibold underline underline-offset-2">
            Try again
          </button>
        </div>
      )}
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Dashboard
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-0.5 text-sm">
            Here&apos;s an overview of your business today.
          </p>
        </div>
        <Link to="/invoices/new" className="btn btn-primary hidden sm:inline-flex">
          <Plus className="w-4 h-4 mr-1.5" />
          New Invoice
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatsCard
          title="Total Revenue"
          value={formatCurrency(stats?.total_revenue)}
          icon={DollarSign}
          variant="success"
          subtitle="All time earnings"
        />
        <StatsCard
          title="Outstanding"
          value={formatCurrency(stats?.outstanding_amount)}
          icon={Clock}
          variant="default"
          subtitle="Awaiting payment"
        />
        <StatsCard
          title="Overdue"
          value={formatCurrency(stats?.overdue_amount)}
          icon={AlertTriangle}
          variant="danger"
          subtitle="Needs attention"
        />
        <StatsCard
          title="This Month"
          value={formatCurrency(stats?.this_month_revenue)}
          icon={TrendingUp}
          variant="warning"
          subtitle="Current month"
        />
      </div>

      {/* Chart + Recent Invoices */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Revenue Chart */}
        <Card className="lg:col-span-2">
          <Card.Header className="flex items-center justify-between">
            <div>
              <Card.Title>Revenue Overview</Card.Title>
              <Card.Description>Monthly revenue for the past 12 months</Card.Description>
            </div>
          </Card.Header>
          <Card.Content>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(59,130,246,.08)" vertical={false} />
                  <XAxis
                    dataKey="month"
                    stroke="#9ca3af"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#9ca3af"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => (value >= 1000 ? `${formatCurrency(value / 1000)}k` : formatCurrency(value))}
                  />
                  <Tooltip
                    formatter={(value) => [formatCurrency(value), 'Revenue']}
                    contentStyle={{
                      background: 'rgba(255,255,255,0.95)',
                      border: '1px solid rgba(59,130,246,.15)',
                      borderRadius: '12px',
                      boxShadow: '0 8px 32px rgba(0,0,0,.1)',
                      backdropFilter: 'blur(10px)',
                      fontSize: '12px',
                    }}
                    cursor={{ stroke: 'rgba(59,130,246,.15)', strokeWidth: 2 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="#3b82f6"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                    dot={false}
                    activeDot={{ r: 5, fill: '#2563eb', strokeWidth: 2, stroke: '#fff' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card.Content>
        </Card>

        {/* Recent Invoices */}
        <Card>
          <Card.Header className="flex items-center justify-between">
            <Card.Title>Recent Invoices</Card.Title>
            <Link
              to="/invoices"
              className="flex items-center gap-1 text-xs font-semibold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
            >
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </Card.Header>
          <div className="divide-y divide-gray-100 dark:divide-white/6">
            {recentInvoices.length > 0 ? (
              recentInvoices.map((invoice) => (
                <Link
                  key={invoice.id}
                  to={`/invoices/${invoice.id}`}
                  className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50/80 dark:hover:bg-white/4 transition-colors group"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                      {invoice.invoice_number}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                      {invoice.client_name}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0 ml-3">
                    <p className="text-sm font-bold text-gray-900 dark:text-white">
                      {formatCurrency(invoice.total)}
                    </p>
                    <div className="mt-0.5">
                      {getStatusBadge(invoice.status)}
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="px-6 py-10 text-center">
                <div className="w-12 h-12 mx-auto mb-3 rounded-2xl flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, rgba(37,99,235,.1) 0%, rgba(6,182,212,.06) 100%)' }}
                >
                  <FileText className="w-6 h-6 text-primary-500" />
                </div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">No invoices yet</p>
                <Link
                  to="/invoices/new"
                  className="mt-2 inline-flex text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline"
                >
                  Create your first →
                </Link>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <Card.Header>
          <Card.Title>Quick Actions</Card.Title>
          <Card.Description>Jump right into common tasks</Card.Description>
        </Card.Header>
        <Card.Content>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              {
                to: '/invoices/new',
                label: 'New Invoice',
                icon: DollarSign,
                bg: 'linear-gradient(135deg, rgba(37,99,235,.12) 0%, rgba(6,182,212,.08) 100%)',
                border: 'rgba(37,99,235,.2)',
                iconColor: 'text-primary-600 dark:text-primary-400',
                hoverBorder: 'rgba(37,99,235,.4)',
              },
              {
                to: '/clients/new',
                label: 'Add Client',
                icon: Users,
                bg: 'linear-gradient(135deg, rgba(16,185,129,.1) 0%, rgba(52,211,153,.06) 100%)',
                border: 'rgba(16,185,129,.2)',
                iconColor: 'text-emerald-600 dark:text-emerald-400',
                hoverBorder: 'rgba(16,185,129,.4)',
              },
              {
                to: '/time-tracker',
                label: 'Log Time',
                icon: Clock,
                bg: 'linear-gradient(135deg, rgba(245,158,11,.1) 0%, rgba(251,191,36,.06) 100%)',
                border: 'rgba(245,158,11,.2)',
                iconColor: 'text-amber-600 dark:text-amber-400',
                hoverBorder: 'rgba(245,158,11,.4)',
              },
              {
                to: '/reports',
                label: 'View Reports',
                icon: TrendingUp,
                bg: 'linear-gradient(135deg, rgba(6,182,212,.1) 0%, rgba(34,211,238,.06) 100%)',
                border: 'rgba(6,182,212,.2)',
                iconColor: 'text-accent-600 dark:text-accent-400',
                hoverBorder: 'rgba(6,182,212,.4)',
              },
            ].map((action) => (
              <Link
                key={action.to}
                to={action.to}
                className="group flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg"
                style={{
                  background: action.bg,
                  borderColor: action.border,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = action.hoverBorder }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = action.border }}
              >
                <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-white/60 dark:bg-black/20 transition-transform group-hover:scale-110">
                  <action.icon className={`w-5 h-5 ${action.iconColor}`} strokeWidth={2} />
                </div>
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 text-center">{action.label}</span>
              </Link>
            ))}
          </div>
        </Card.Content>
      </Card>
    </div>
  )
}

export default Dashboard
