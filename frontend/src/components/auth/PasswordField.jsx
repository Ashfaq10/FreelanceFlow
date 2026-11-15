import { forwardRef, useId, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

/** Password input with a labelled show/hide button; spread react-hook-form's `register(...)` onto it. */
const PasswordField = forwardRef(({ label, error, hint, ...props }, ref) => {
  const id = useId()
  const [visible, setVisible] = useState(false)

  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          ref={ref}
          type={visible ? 'text' : 'password'}
          aria-invalid={error ? 'true' : undefined}
          className={`input pr-11 ${error ? 'border-red-400 focus:ring-red-400/30 focus:border-red-400' : ''}`}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible(!visible)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
        >
          {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      {error ? (
        <p role="alert" className="mt-1.5 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-sm text-gray-600 dark:text-gray-400">{hint}</p>
      ) : null}
    </div>
  )
})

PasswordField.displayName = 'PasswordField'

export default PasswordField
