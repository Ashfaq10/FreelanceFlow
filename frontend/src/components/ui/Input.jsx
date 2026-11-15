import { forwardRef, useId } from 'react'

const Input = forwardRef(({
  label,
  error,
  className = '',
  type = 'text',
  hint,
  ...props
}, ref) => {
  const generatedId = useId()
  const id = props.id || generatedId
  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="label">{label}</label>
      )}
      <input
        ref={ref}
        id={id}
        type={type}
        aria-invalid={error ? 'true' : undefined}
        className={`input ${error ? 'border-red-400 focus:ring-red-400/30 focus:border-red-400' : ''}`}
        {...props}
      />
      {error ? (
        <p role="alert" className="mt-1.5 text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-sm text-gray-600 dark:text-gray-400">{hint}</p>
      ) : null}
    </div>
  )
})

Input.displayName = 'Input'

export default Input
