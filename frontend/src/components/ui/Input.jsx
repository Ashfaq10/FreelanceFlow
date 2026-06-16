import { forwardRef } from 'react'

const Input = forwardRef(({
  label,
  error,
  className = '',
  type = 'text',
  hint,
  ...props
}, ref) => {
  return (
    <div className={className}>
      {label && (
        <label className="label">{label}</label>
      )}
      <input
        ref={ref}
        type={type}
        className={`input ${error ? 'border-red-400 focus:ring-red-400/30 focus:border-red-400' : ''}`}
        {...props}
      />
      {error ? (
        <p className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400 flex items-center gap-1">
          <span className="inline-block w-3.5 h-3.5 rounded-full bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 text-center leading-3.5 text-[9px] font-bold">!</span>
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">{hint}</p>
      ) : null}
    </div>
  )
})

Input.displayName = 'Input'

export default Input
