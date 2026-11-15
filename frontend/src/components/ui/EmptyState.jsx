import { FileText } from 'lucide-react'
import Button from './Button'

function EmptyState({ icon: Icon = FileText, title, description, action, actionLabel, onAction }) {
  return (
    <div className="text-center py-12">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
        <Icon className="w-8 h-8 text-gray-400" />
      </div>
      <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-2">{title}</h2>
      {description && <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-sm mx-auto">{description}</p>}
      {action && <Button onClick={onAction}>{actionLabel}</Button>}
    </div>
  )
}

export default EmptyState
