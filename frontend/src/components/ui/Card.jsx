function Card({ children, className = '', hover = true, ...props }) {
  return (
    <div className={`card ${hover ? 'hover-card' : ''} ${className}`} {...props}>
      {children}
    </div>
  )
}

function CardHeader({ children, className = '' }) {
  return <div className={`px-6 py-4 border-b border-gray-200/70 dark:border-white/8 ${className}`}>{children}</div>
}

function CardTitle({ children, className = '' }) {
  return <h3 className={`text-base font-semibold text-gray-900 dark:text-white ${className}`}>{children}</h3>
}

function CardDescription({ children, className = '' }) {
  return <p className={`text-sm text-gray-500 dark:text-gray-400 mt-0.5 ${className}`}>{children}</p>
}

function CardContent({ children, className = '' }) {
  return <div className={`p-6 ${className}`}>{children}</div>
}

function CardFooter({ children, className = '' }) {
  return (
    <div
      className={`px-6 py-4 border-t border-gray-200/70 dark:border-white/8 bg-gray-50/70 dark:bg-white/3 rounded-b-2xl ${className}`}
    >
      {children}
    </div>
  )
}

Card.Header = CardHeader
Card.Title = CardTitle
Card.Description = CardDescription
Card.Content = CardContent
Card.Footer = CardFooter

export default Card
