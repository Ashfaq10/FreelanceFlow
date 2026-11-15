function StatsCard({ title, value, icon: Icon, trend, trendLabel, variant = 'default', subtitle }) {
  const iconStyles = {
    default: {
      bg: 'linear-gradient(135deg, rgba(37,99,235,.15) 0%, rgba(6,182,212,.1) 100%)',
      color: 'text-primary-600 dark:text-primary-400',
      glow: 'rgba(59,130,246,.2)',
    },
    success: {
      bg: 'linear-gradient(135deg, rgba(16,185,129,.15) 0%, rgba(52,211,153,.08) 100%)',
      color: 'text-emerald-600 dark:text-emerald-400',
      glow: 'rgba(16,185,129,.2)',
    },
    warning: {
      bg: 'linear-gradient(135deg, rgba(245,158,11,.15) 0%, rgba(251,191,36,.08) 100%)',
      color: 'text-amber-600 dark:text-amber-400',
      glow: 'rgba(245,158,11,.2)',
    },
    danger: {
      bg: 'linear-gradient(135deg, rgba(239,68,68,.15) 0%, rgba(248,113,113,.08) 100%)',
      color: 'text-red-600 dark:text-red-400',
      glow: 'rgba(239,68,68,.2)',
    },
  }

  const style = iconStyles[variant] || iconStyles.default

  return (
    <div className="card p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white leading-none">{value}</p>
          {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>}
        </div>

        {Icon && (
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: style.bg,
              boxShadow: `0 4px 12px ${style.glow}`,
            }}
          >
            <Icon className={`w-5 h-5 ${style.color}`} strokeWidth={2} />
          </div>
        )}
      </div>

      {trend !== undefined && (
        <div
          className={`flex items-center gap-1 text-xs font-semibold ${trend >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}
        >
          <span
            className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] ${trend >= 0 ? 'bg-emerald-100 dark:bg-emerald-500/20' : 'bg-red-100 dark:bg-red-500/20'}`}
          >
            {trend >= 0 ? '↑' : '↓'}
          </span>
          {trend >= 0 ? '+' : ''}
          {trend}%
          {trendLabel && <span className="font-normal text-gray-500 dark:text-gray-400 ml-0.5">{trendLabel}</span>}
        </div>
      )}
    </div>
  )
}

export default StatsCard
