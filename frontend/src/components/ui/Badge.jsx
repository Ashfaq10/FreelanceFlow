const variants = {
  success: 'badge-success',
  warning: 'badge-warning',
  danger: 'badge-danger',
  info: 'badge-info',
  gray: 'badge-gray',
  cyan: 'bg-accent-100 text-accent-700 dark:bg-accent-500/15 dark:text-accent-400',
}

function Badge({ children, variant = 'gray', className = '' }) {
  return <span className={`badge ${variants[variant] || variants.gray} ${className}`}>{children}</span>
}

export default Badge
