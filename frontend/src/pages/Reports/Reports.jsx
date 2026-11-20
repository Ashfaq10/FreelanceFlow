import { useState, useEffect } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from 'recharts'
import { DollarSign, TrendingUp, Users, FileText } from 'lucide-react'
import { Card, StatsCard, Skeleton, ErrorState } from '../../components/ui'
import { dashboard as dashboardApi } from '../../api/endpoints'
import { formatCurrency as formatMoney, formatCompactCurrency, toChartRows } from '../../utils/formatters'
import { useCurrency } from '../../hooks/useCurrency'
import ExportButtons from './ExportButtons'

const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#06b6d4']

function Reports() {
  const [loading, setLoading] = useState(true)
  const [monthlyData, setMonthlyData] = useState([])
  const [stats, setStats] = useState(null)
  const [error, setError] = useState(false)
  // The API sends decimals as strings; "0.00" is truthy, so a plain `&&` guard produced Infinity%.
  const billed = Number(stats?.total_billed) || 0
  const collectedPercent = billed > 0 ? Math.round((Number(stats?.total_revenue) / billed) * 100) : 0

  useEffect(() => {
    fetchReportData()
  }, [])

  const fetchReportData = async () => {
    setLoading(true)
    setError(false)
    try {
      const [summaryRes, revenueRes] = await Promise.all([
        dashboardApi.getSummary(),
        dashboardApi.getMonthlyRevenue(12),
      ])

      setStats(summaryRes.data)
      setMonthlyData(toChartRows(revenueRes.data))
    } catch (err) {
      console.error('Failed to fetch report data:', err)
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  const currency = useCurrency()
  const formatCurrency = (amount) =>
    formatMoney(amount, currency, { minimumFractionDigits: 0, maximumFractionDigits: 0 })

  const statusData = [
    { name: 'Paid', value: stats?.paid_count || 0 },
    { name: 'Sent', value: stats?.sent_count || 0 },
    { name: 'Draft', value: stats?.draft_count || 0 },
    { name: 'Overdue', value: stats?.overdue_count || 0 },
  ].filter((item) => item.value > 0)

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton.Card key={i} />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return <ErrorState title="Could not load your reports" onRetry={fetchReportData} />
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reports</h1>
          <p className="text-gray-500 dark:text-gray-400">Analytics and insights for your business</p>
        </div>
        <ExportButtons />
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatsCard
          title="Total Revenue"
          value={formatCurrency(stats?.total_revenue)}
          icon={DollarSign}
          variant="success"
        />
        <StatsCard
          title="This Month"
          value={formatCurrency(stats?.this_month_revenue)}
          icon={TrendingUp}
          variant="default"
        />
        <StatsCard title="Total Clients" value={stats?.total_clients || 0} icon={Users} variant="default" />
        <StatsCard title="Total Invoices" value={stats?.total_invoices || 0} icon={FileText} variant="default" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Monthly Revenue Chart */}
        <Card className="lg:col-span-2">
          <Card.Header>
            <Card.Title>Monthly Revenue</Card.Title>
            <Card.Description>Revenue trends over the past 12 months</Card.Description>
          </Card.Header>
          <Card.Content>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" stroke="#9ca3af" fontSize={12} />
                  <YAxis
                    stroke="#9ca3af"
                    fontSize={12}
                    tickFormatter={(value) => formatCompactCurrency(value, currency)}
                  />
                  <Tooltip
                    formatter={(value) => [formatCurrency(value), 'Revenue']}
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="total" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card.Content>
        </Card>

        {/* Invoice Status Distribution */}
        <Card>
          <Card.Header>
            <Card.Title>Invoice Status</Card.Title>
            <Card.Description>Distribution by status</Card.Description>
          </Card.Header>
          <Card.Content>
            {/* The chart is decoration for screen readers; the same numbers are in the list below. */}
            <div className="h-80" aria-hidden="true">
              {statusData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      rootTabIndex={-1}
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius="55%"
                      outerRadius="80%"
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, name) => [value, name]}
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">No invoice data available</div>
              )}
            </div>
            <ul className="sr-only">
              {statusData.map((entry) => (
                <li key={entry.name}>
                  {entry.name}: {entry.value}
                </li>
              ))}
            </ul>
          </Card.Content>
        </Card>
      </div>

      {/* Revenue Trend */}
      <Card>
        <Card.Header>
          <Card.Title>Revenue Trend</Card.Title>
          <Card.Description>Track your income growth over time</Card.Description>
        </Card.Header>
        <Card.Content>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" stroke="#9ca3af" fontSize={12} />
                <YAxis stroke="#9ca3af" fontSize={12} tickFormatter={(value) => `${formatCurrency(value / 1000)}k`} />
                <Tooltip
                  formatter={(value) => [formatCurrency(value), 'Revenue']}
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="#0ea5e9"
                  strokeWidth={2}
                  dot={{ fill: '#0ea5e9', strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card.Content>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <Card.Content className="py-6">
            <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">Collection Rate</h2>
            <div className="flex items-end gap-2">
              <span className="text-4xl font-bold text-gray-900 dark:text-white">{collectedPercent}%</span>
              <span className="text-gray-500 dark:text-gray-400 text-sm mb-1">of billed amount</span>
            </div>
            <div className="mt-4 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full"
                style={{
                  width: `${Math.min(collectedPercent, 100)}%`,
                }}
              />
            </div>
          </Card.Content>
        </Card>

        <Card>
          <Card.Content className="py-6">
            <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">Average Invoice Value</h2>
            <div className="flex items-end gap-2">
              <span className="text-4xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(
                  Number(stats?.total_invoices) > 0 ? Number(stats.total_billed) / Number(stats.total_invoices) : 0
                )}
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Based on {stats?.total_invoices || 0} invoices
            </p>
          </Card.Content>
        </Card>

        <Card>
          <Card.Content className="py-6">
            <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">Outstanding Amount</h2>
            <div className="flex items-end gap-2">
              <span className="text-4xl font-bold text-yellow-700 dark:text-yellow-500">
                {formatCurrency(stats?.outstanding_amount)}
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              {stats?.overdue_count || 0} overdue invoices
            </p>
          </Card.Content>
        </Card>
      </div>
    </div>
  )
}

export default Reports
