import { Zap } from 'lucide-react'

/**
 * The product wordmark. One name everywhere: FreelanceFlow (UX-6).
 * `variant="light"` is for dark panels, where the gradient text is unreadable.
 */
function Wordmark({ variant = 'default', size = 'md', className = '' }) {
  const badge = size === 'sm' ? 'w-8 h-8' : 'w-9 h-9'
  const icon = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'
  const text = size === 'sm' ? 'text-lg' : 'text-xl'

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div
        className={`${badge} rounded-xl flex items-center justify-center`}
        style={{
          background: 'linear-gradient(135deg, #2563eb 0%, #06b6d4 100%)',
          boxShadow: '0 4px 12px rgba(37,99,235,.35)',
        }}
      >
        <Zap className={`${icon} text-white`} strokeWidth={2.5} />
      </div>
      <span className={`${text} font-bold ${variant === 'light' ? 'text-white' : 'gradient-text'}`}>
        FreelanceFlow
      </span>
    </div>
  )
}

export default Wordmark
