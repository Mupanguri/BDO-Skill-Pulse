import { useAuth } from '../contexts/AuthContext'
import { useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import {
  LogOut,
  Eye,
  Plus,
  FileText,
  BarChart3,
  User,
  Moon,
  Sun,
  Bell,
  X,
  Menu
} from 'lucide-react'
import Button from './Button'

interface SidebarProps {
  mobileMenuOpen?: boolean
  setMobileMenuOpen?: (open: boolean) => void
  onNavigate?: () => void
}

function Sidebar({ mobileMenuOpen = false, setMobileMenuOpen, onNavigate }: SidebarProps) {
  const { user, logout, logoutAll, isDarkMode, toggleDarkMode } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [notifications, setNotifications] = useState<any[]>([])
  const [showNotifications, setShowNotifications] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  const navigationItems = user?.isAdmin ? [
    { path: '/admin', label: 'Dashboard', icon: Eye },
    { path: '/admin/participants', label: 'Participants', icon: User },
    { path: '/admin/results', label: 'View Results', icon: BarChart3 },
    { path: '/admin/create', label: 'Create Session', icon: Plus },
  ] : [
    { path: '/dashboard', label: 'Active Quiz', icon: FileText },
    { path: '/history', label: 'My History', icon: BarChart3 },
  ]

  const handleNavigation = (path: string) => {
    navigate(path)
    // Call onNavigate callback if provided (for mobile menu close)
    if (onNavigate) {
      onNavigate()
    }
  }

  // Fetch notifications when user changes
  useEffect(() => {
    if (user) {
      fetchNotifications()
    }
  }, [user])

  const fetchNotifications = async () => {
    if (!user) return

    try {
      const response = await fetch(`http://localhost:3001/api/user/${user.email}/notifications`)
      if (response.ok) {
        const data = await response.json()
        setNotifications(data.notifications)
        const unread = data.notifications.filter((n: any) => !n.read).length
        setUnreadCount(unread)
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    }
  }

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      await fetch(`http://localhost:3001/api/user/${user?.email}/notifications/${notificationId}/read`, {
        method: 'PATCH'
      })
      // Update local state
      setNotifications(prev => prev.map(n =>
        n.id === notificationId ? { ...n, read: true } : n
      ))
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
    }
  }

  const toggleNotifications = () => {
    setShowNotifications(!showNotifications)
  }

  if (!user) {
    return null
  }

  return (
    <>
      {/* Mobile header */}
      <div className="lg:hidden fixed left-0 top-0 right-0 h-16 bg-white/95 dark:bg-gray-900/95 backdrop-blur border-b border-gray-200 dark:border-gray-700 z-50 px-4 flex items-center justify-between">
        <img
          src="/bdo_logo.png"
          alt="BDO Logo"
          className="h-10 w-auto object-contain"
        />
        <button
          type="button"
          onClick={() => setMobileMenuOpen?.(true)}
          className="p-2 rounded-md text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-bdo-red"
          aria-label="Open menu"
        >
          <Menu className="h-6 w-6" />
        </button>
      </div>

      {/* Mobile overlay backdrop */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 z-40 animate-in fade-in duration-200"
          onClick={() => setMobileMenuOpen?.(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar - overlay on mobile, fixed on desktop */}
      <aside
        className={`fixed left-0 top-16 lg:top-0 h-[calc(100%-4rem)] lg:h-full w-72 lg:w-64 bg-white/95 dark:bg-gray-900/95 backdrop-blur border-r border-gray-200 dark:border-gray-700 shadow-xl transition-transform duration-300 ease-in-out z-50 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
        aria-label="Sidebar navigation"
      >
        <div className="flex flex-col h-full">
        {/* Logo Section - Desktop only */}
        <div className="hidden lg:flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-700">
          <img
            src="/bdo_logo.png"
            alt="BDO Logo"
            className="h-12 w-auto object-contain"
          />
        </div>

        {/* Admin Badge */}
        {user?.isAdmin && (
          <div className="px-4 pt-4">
            <div className="bg-bdo-red/10 border border-bdo-red/20 rounded-lg px-3 py-2">
              <span className="text-xs font-semibold text-bdo-red">ADMIN MODE</span>
            </div>
          </div>
        )}

        {/* Navigation Links */}
        <div className="flex-1 px-4 py-6 space-y-2.5" role="navigation" aria-label="Main navigation">
          {navigationItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path

            return (
              <button
                key={item.path}
                onClick={() => handleNavigation(item.path)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleNavigation(item.path)
                  }
                }}
                className={`w-full flex items-center px-4 py-3.5 text-left rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 ${
                  isActive
                    ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-700'
                    : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-red-600 dark:hover:text-red-400 border border-transparent'
                }`}
                aria-current={isActive ? 'page' : undefined}
                aria-label={`${item.label} ${isActive ? '(current page)' : ''}`}
              >
                <Icon className="h-5 w-5 mr-3" aria-hidden="true" />
                <span className="font-medium">{item.label}</span>
              </button>
            )
          })}
        </div>

        {/* User Info Section */}
        {user && (
          <div className="px-4 py-4 border-t border-gray-200 dark:border-gray-700 bg-gradient-to-b from-gray-50 to-white dark:from-gray-800 dark:to-gray-900">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-bdo-navy flex items-center justify-center flex-shrink-0">
                <span className="text-white font-semibold text-sm">
                  {user.email.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{user.email}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{user.department}</p>
              </div>
              {/* Notification Bell */}
              <button
                onClick={toggleNotifications}
                className="relative p-1.5 text-gray-600 dark:text-gray-300 hover:text-bdo-red dark:hover:text-bdo-red transition-colors flex-shrink-0"
                aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <>
                    <span className="absolute -top-1 -right-1 bg-bdo-red text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-semibold">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                    <span className="sr-only">{unreadCount} unread notifications</span>
                  </>
                )}
              </button>
            </div>

            <div className="space-y-2">
              {/* Dark Mode Toggle */}
              <button
                onClick={toggleDarkMode}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                aria-label={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              >
                {isDarkMode ? (
                  <Sun className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Moon className="h-4 w-4" aria-hidden="true" />
                )}
                <span>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
              </button>

              {/* Logout Button */}
              <button
                onClick={logout}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-bdo-red dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors font-medium"
                aria-label="Logout"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                <span>Logout</span>
              </button>

              {/* Logout All Button */}
              <button
                onClick={logoutAll}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors"
                aria-label="Logout from all devices"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                <span>Logout All Devices</span>
              </button>
            </div>
          </div>
        )}

        </div>
      </aside>

      {/* Notification Panel - positioned outside sidebar */}
      {showNotifications && user && (
        <div className="fixed lg:left-64 left-4 right-4 lg:right-auto top-20 lg:top-4 lg:w-80 max-h-96 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-2xl z-[60] overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Notifications</h3>
            <button
              onClick={() => setShowNotifications(false)}
              className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              aria-label="Close notifications"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <Bell className="h-12 w-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                <p className="text-sm">No notifications yet</p>
              </div>
            ) : (
              notifications.map((notification: any) => (
                <div
                  key={notification.id}
                  className={`p-4 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors ${
                    !notification.read ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                  onClick={() => markNotificationAsRead(notification.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {notification.title}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                        {new Date(notification.timestamp).toLocaleDateString()}
                      </p>
                    </div>
                    {!notification.read && (
                      <div className="w-2 h-2 bg-bdo-blue rounded-full mt-2 flex-shrink-0"></div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </>
  )
}

export default Sidebar
