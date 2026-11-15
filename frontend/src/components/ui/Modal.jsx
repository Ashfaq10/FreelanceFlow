import { useEffect, useId, useRef } from 'react'
import { X } from 'lucide-react'

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Dialog with real semantics (UX-1): named by its title, closes on Escape, keeps Tab inside,
 * moves focus in on open and back to the trigger on close.
 */
function Modal({ isOpen, onClose, title, children, size = 'md', description }) {
  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  }

  const titleId = useId()
  const descriptionId = useId()
  const dialogRef = useRef(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!isOpen) return undefined

    const opener = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const dialog = dialogRef.current
    const focusables = () => [...dialog.querySelectorAll(FOCUSABLE)]
    // Prefer the first form field; the close button is first in DOM order but rarely what you want.
    const first =
      dialog.querySelector('input:not([disabled]), select:not([disabled]), textarea:not([disabled])') || focusables()[0]
    ;(first || dialog).focus()

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onCloseRef.current()
        return
      }
      if (event.key !== 'Tab') return

      const items = focusables()
      if (items.length === 0) {
        event.preventDefault()
        return
      }
      const firstItem = items[0]
      const lastItem = items[items.length - 1]
      if (event.shiftKey && document.activeElement === firstItem) {
        event.preventDefault()
        lastItem.focus()
      } else if (!event.shiftKey && document.activeElement === lastItem) {
        event.preventDefault()
        firstItem.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
      if (opener && typeof opener.focus === 'function') opener.focus()
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div
          aria-hidden="true"
          className="fixed inset-0 animate-fade-in"
          onClick={onClose}
          style={{ background: 'rgba(15,17,23,0.6)', backdropFilter: 'blur(6px)' }}
        />

        {/* Dialog */}
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={description ? descriptionId : undefined}
          tabIndex={-1}
          className={`relative w-full ${sizes[size]} animate-scale-in focus:outline-none`}
          style={{ transformOrigin: 'center center' }}
        >
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden border border-gray-200/70 dark:border-white/10">
            {/* Header */}
            <div className="flex items-start justify-between px-6 py-5 border-b border-gray-200/70 dark:border-white/8">
              <div>
                <h2 id={titleId} className="text-lg font-bold text-gray-900 dark:text-white leading-tight">
                  {title}
                </h2>
                {description && (
                  <p id={descriptionId} className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                    {description}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close dialog"
                className="ml-4 p-1.5 rounded-lg text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/8 transition-colors flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">{children}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Modal
