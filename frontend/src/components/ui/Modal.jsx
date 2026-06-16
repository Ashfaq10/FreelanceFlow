import { useEffect } from 'react'
import { X } from 'lucide-react'

function Modal({ isOpen, onClose, title, children, size = 'md', description }) {
  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  }

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 animate-fade-in"
          onClick={onClose}
          style={{ background: 'rgba(15,17,23,0.6)', backdropFilter: 'blur(6px)' }}
        />

        {/* Dialog */}
        <div
          className={`relative w-full ${sizes[size]} animate-scale-in`}
          style={{ transformOrigin: 'center center' }}
        >
          {/* Gradient accent top border */}
          <div className="absolute -inset-px rounded-2xl pointer-events-none"
            style={{
              background: 'linear-gradient(135deg, rgba(37,99,235,.25) 0%, rgba(6,182,212,.15) 100%)',
              zIndex: -1,
            }}
          />
          <div className="bg-white dark:bg-gray-900/95 rounded-2xl shadow-2xl overflow-hidden"
            style={{ backdropFilter: 'blur(20px)' }}
          >
            {/* Header */}
            <div className="flex items-start justify-between px-6 py-5 border-b border-gray-200/70 dark:border-white/8">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">
                  {title}
                </h3>
                {description && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
                )}
              </div>
              <button
                onClick={onClose}
                className="ml-4 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/8 transition-all flex-shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Modal
