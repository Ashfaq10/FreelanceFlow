import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Menu, Plus, Moon, Sun, LogOut, Settings, ChevronDown, Bell } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

function Header({ onMenuClick }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [darkMode, setDarkMode] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    const isDark = localStorage.getItem('darkMode') === 'true'
    setDarkMode(isDark)
    if (isDark) document.documentElement.classList.add('dark')
  }, [])

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const toggleDarkMode = () => {
    const newMode = !darkMode
    setDarkMode(newMode)
    localStorage.setItem('darkMode', newMode.toString())
    if (newMode) document.documentElement.classList.add('dark')
    else document.documentElement.classList.remove('dark')
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const userInitial = user?.email?.charAt(0).toUpperCase() || 'U'
  const userName = user?.business_name || user?.full_name || user?.email

  return (
    <header
      className={`sticky top-0 z-30 transition-all duration-300 ${scrolled
          ? 'glass-strong border-b border-gray-200/60 dark:border-white/10 shadow-sm'
          : 'bg-transparent'
        }`}
    >
      <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
        {/* Left: mobile menu */}
        <div className="flex items-center">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-xl text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/8 transition-all"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-2">
          {/* New Invoice CTA */}
          <Link
            to="/invoices/new"
            className="btn btn-primary text-xs sm:text-sm px-3 sm:px-4 py-2"
          >
            <Plus className="w-4 h-4 mr-1.5 flex-shrink-0" />
            <span className="hidden xs:inline">New Invoice</span>
            <span className="xs:hidden">New</span>
          </Link>

          {/* Notifications placeholder */}
          <button
            className="relative p-2 rounded-xl text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/8 transition-all"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary-500 ring-2 ring-white dark:ring-gray-900" />
          </button>

          {/* Dark mode toggle */}
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-xl text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/8 transition-all"
            aria-label="Toggle dark mode"
          >
            <div className="relative w-5 h-5">
              <Sun
                className={`absolute inset-0 w-5 h-5 transition-all duration-300 ${darkMode ? 'opacity-100 rotate-0' : 'opacity-0 rotate-90'
                  }`}
              />
              <Moon
                className={`absolute inset-0 w-5 h-5 transition-all duration-300 ${darkMode ? 'opacity-0 -rotate-90' : 'opacity-100 rotate-0'
                  }`}
              />
            </div>
          </button>

          {/* User dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 pl-2 pr-2.5 py-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-white/8 transition-all"
            >
              {/* Avatar */}
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #2563eb 0%, #06b6d4 100%)' }}
              >
                {userInitial}
              </div>
              <span className="hidden md:block text-sm font-semibold text-gray-700 dark:text-gray-200 max-w-[120px] truncate">
                {userName}
              </span>
              <ChevronDown
                className={`hidden md:block w-4 h-4 text-gray-400 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''
                  }`}
              />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 animate-scale-in"
                style={{ transformOrigin: 'top right' }}
              >
                <div className="bg-white dark:bg-gray-800/95 rounded-2xl shadow-xl border border-gray-200/80 dark:border-white/10 overflow-hidden py-1.5"
                  style={{ backdropFilter: 'blur(16px)' }}
                >
                  {/* User info header */}
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-white/8">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{userName}</p>
                    {user?.email && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{user.email}</p>
                    )}
                  </div>

                  <Link
                    to="/settings"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/6 transition-colors"
                  >
                    <Settings className="w-4 h-4 text-gray-400" />
                    Settings
                  </Link>

                  <div className="mx-3 my-1 border-t border-gray-100 dark:border-white/8" />

                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/8 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header
