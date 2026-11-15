import { NavLink } from 'react-router-dom'
import { LayoutDashboard, FileText, Users, Clock, BarChart3, Settings, X } from 'lucide-react'
import { Wordmark } from '../ui'

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Invoices', href: '/invoices', icon: FileText },
  { name: 'Clients', href: '/clients', icon: Users },
  { name: 'Time Tracker', href: '/time-tracker', icon: Clock },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
  { name: 'Settings', href: '/settings', icon: Settings },
]

function NavItem({ item, onClick }) {
  return (
    <NavLink
      to={item.href}
      end={item.href === '/'}
      onClick={onClick}
      className={({ isActive }) =>
        `group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
          isActive
            ? 'nav-active text-primary-700 dark:text-primary-300'
            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100/80 dark:hover:bg-white/6 hover:text-gray-900 dark:hover:text-gray-100'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <div
            className={`flex items-center justify-center w-7 h-7 rounded-lg flex-shrink-0 transition-all duration-200 ${
              isActive
                ? 'bg-primary-600/10 dark:bg-primary-400/15'
                : 'bg-transparent group-hover:bg-gray-200/70 dark:group-hover:bg-white/8'
            }`}
          >
            <item.icon className={`w-4 h-4 ${isActive ? 'text-primary-600 dark:text-primary-400' : ''}`} />
          </div>
          {item.name}
        </>
      )}
    </NavLink>
  )
}

function SidebarContent({ onClose }) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between h-16 px-5 border-b border-gray-200/70 dark:border-white/8 flex-shrink-0">
        <Wordmark size="sm" />
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Close menu"
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/8 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav aria-label="Main" className="flex-1 px-3 py-5 space-y-0.5 overflow-y-auto">
        <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">
          Main Menu
        </p>
        {navigation.slice(0, 4).map((item) => (
          <NavItem key={item.name} item={item} onClick={onClose} />
        ))}

        <div className="my-4 border-t border-gray-200/60 dark:border-white/6" />

        <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">
          More
        </p>
        {navigation.slice(4).map((item) => (
          <NavItem key={item.name} item={item} onClick={onClose} />
        ))}
      </nav>
    </div>
  )
}

function Sidebar({ isOpen, onClose }) {
  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col z-30">
        <div
          className="flex flex-col flex-grow bg-white dark:bg-gray-900/95 border-r border-gray-200/70 dark:border-white/8"
          style={{ backdropFilter: 'blur(12px)' }}
        >
          <SidebarContent />
        </div>
      </aside>

      {/* Mobile sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 transform transition-all duration-300 ease-out lg:hidden ${
          isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full bg-white dark:bg-gray-900/98 border-r border-gray-200/70 dark:border-white/8">
          <SidebarContent onClose={onClose} />
        </div>
      </aside>
    </>
  )
}

export default Sidebar
