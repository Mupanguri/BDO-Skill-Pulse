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
  Menu,
  ArrowLeftRight,
  Shield,
  Settings,
  Volume2,
  VolumeX
} from 'lucide-react'
import { useHeartbeat } from '../contexts/HeartbeatContext'

interface SidebarProps {
  mobileMenuOpen?: boolean
  setMobileMenuOpen?: (open: boolean) => void
  onNavigate?: () => void
}

function Sidebar({ mobileMenuOpen = false, setMobileMenuOpen, onNavigate }: SidebarProps) {
  const { user, logout, isDarkMode, toggleDarkMode, portalMode, setPortalMode } = useAuth()
  const { soundEnabled, toggleSound } = useHeartbeat()
  const navigate = useNavigate()
  const location = useLocation()
  const [profileImage, setProfileImage] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState<string | null>(null)

  useEffect(() => {
    if (!user?.email) return
    fetch(`/api/user/${user.email}/profile`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setProfileImage(data.profileImage || null)
          setDisplayName(data.displayName || null)
        }
      })
      .catch(() => {})
  }, [user?.email])

  const isAdminPortal = portalMode === 'admin' && (user?.isAdmin || user?.isHR)
  const isSuperAdminPortal = portalMode === 'superadmin' && user?.isSuperAdmin

  const navigationItems = isSuperAdminPortal ? [
    { path: '/app/superadmin', label: 'User Management', icon: Settings },
  ] : isAdminPortal ? [
    { path: '/app/admin', label: 'Dashboard', icon: Eye },
    { path: '/app/admin/participants', label: 'Participants', icon: User },
    { path: '/app/admin/results', label: 'View Results', icon: BarChart3 },
    { path: '/app/admin/analytics', label: 'Analytics', icon: BarChart3 },
    { path: '/app/admin/audit-logs', label: 'Audit Logs', icon: Shield },
    { path: '/app/admin/create', label: 'Create Session', icon: Plus },
    ...(user?.isHR ? [{ path: '/app/admin/users', label: 'User Management', icon: Settings }] : []),
  ] : [
    { path: '/app/dashboard', label: 'Active Quiz', icon: FileText },
    { path: '/app/history', label: 'My History', icon: BarChart3 },
  ]

  const switchPortal = () => {
    setPortalMode(null)
    navigate('/app/portal-select')
  }

  const handleNavigation = (path: string) => {
    navigate(path)
    if (onNavigate) onNavigate()
  }

  if (!user) return null

  const portalLabel = isSuperAdminPortal ? 'SUPER ADMIN' : user?.isHR && isAdminPortal ? 'HR MODE' : isAdminPortal ? 'ADMIN MODE' : 'USER MODE'
  const showPortalBadge = (user?.isAdmin || user?.isHR || user?.isSuperAdmin) && portalMode

  return (
    <>
      {/* Mobile header */}
      <div className="lg:hidden fixed left-0 top-0 right-0 h-16 bg-white/95 dark:bg-gray-900/95 backdrop-blur border-b border-gray-200 dark:border-gray-700 z-50 px-4 flex items-center justify-between">
        <img src="/bdo_logo.png" alt="BDO Logo" className="h-10 w-auto object-contain" />
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

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-16 lg:top-0 h-[calc(100%-4rem)] lg:h-full w-72 lg:w-64 bg-white/95 dark:bg-gray-900/95 backdrop-blur border-r border-gray-200 dark:border-gray-700 shadow-xl transition-transform duration-300 ease-in-out z-50 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
        aria-label="Sidebar navigation"
      >
        <div className="flex flex-col h-full">
          {/* Logo — Desktop only */}
          <div className="hidden lg:flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-700">
            <img src="/bdo_logo.png" alt="BDO Logo" className="h-12 w-auto object-contain" />
          </div>

          {/* Portal mode badge */}
          {showPortalBadge && (
            <div className="px-4 pt-4">
              <div className={`flex items-center justify-between rounded-lg px-3 py-2 ${
                isSuperAdminPortal
                  ? 'bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700'
                  : isAdminPortal
                    ? 'bg-bdo-red/10 border border-bdo-red/20'
                    : 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700'
              }`}>
                <div className="flex items-center gap-2">
                  <Shield className={`h-3.5 w-3.5 ${isSuperAdminPortal ? 'text-purple-600' : isAdminPortal ? 'text-bdo-red' : 'text-blue-600'}`} />
                  <span className={`text-xs font-semibold ${isSuperAdminPortal ? 'text-purple-600' : isAdminPortal ? 'text-bdo-red' : 'text-blue-600'}`}>
                    {portalLabel}
                  </span>
                </div>
                <button
                  onClick={switchPortal}
                  title="Switch portal"
                  className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors shadow-sm"
                  aria-label="Switch portal"
                >
                  <ArrowLeftRight className="h-3 w-3" />
                  Switch
                </button>
              </div>
            </div>
          )}

          {/* Navigation Links */}
          <div className="flex-1 overflow-y-auto px-4 py-6 space-y-2.5" role="navigation" aria-label="Main navigation">
            {navigationItems.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path

              return (
                <button
                  key={item.path}
                  onClick={() => handleNavigation(item.path)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleNavigation(item.path) }
                  }}
                  className={`w-full flex items-center px-4 py-3.5 text-left rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 ${isActive
                    ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-700'
                    : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-red-600 dark:hover:text-red-400 border border-transparent'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon className="h-5 w-5 mr-3" aria-hidden="true" />
                  <span className="font-medium">{item.label}</span>
                </button>
              )
            })}

          </div>

          {/* User Info Section */}
          <div className="px-4 py-4 border-t border-gray-200 dark:border-gray-700 bg-gradient-to-b from-gray-50 to-white dark:from-gray-800 dark:to-gray-900">
            {/* Clickable user card → profile */}
            <button
              onClick={() => handleNavigation('/app/profile')}
              className={`w-full flex items-center gap-3 mb-4 p-2 rounded-xl transition-colors text-left hover:bg-gray-100 dark:hover:bg-gray-800 ${location.pathname === '/app/profile' ? 'bg-red-50 dark:bg-red-900/20' : ''}`}
              aria-label="Go to profile"
            >
              <div className="h-10 w-10 rounded-full bg-bdo-navy flex items-center justify-center flex-shrink-0 overflow-hidden">
                {profileImage
                  ? <img src={profileImage} alt="Profile" className="h-10 w-10 object-cover rounded-full" />
                  : <span className="text-white font-semibold text-sm">{(displayName || user.email).charAt(0).toUpperCase()}</span>
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {displayName || user.email}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{user.department}</p>
              </div>
            </button>

            <div className="flex items-center gap-2 mb-2">
              {/* Dark mode icon-only */}
              <button
                onClick={toggleDarkMode}
                className="flex-1 flex items-center justify-center py-2 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                title={isDarkMode ? 'Light Mode' : 'Dark Mode'}
              >
                {isDarkMode ? <Sun className="h-4 w-4" aria-hidden="true" /> : <Moon className="h-4 w-4" aria-hidden="true" />}
              </button>

              {/* Sound icon-only */}
              <button
                onClick={toggleSound}
                className="flex-1 flex items-center justify-center py-2 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label={soundEnabled ? 'Mute heartbeat sound' : 'Enable heartbeat sound'}
                title={soundEnabled ? 'Sound On' : 'Sound Off'}
              >
                {soundEnabled ? <Volume2 className="h-4 w-4" aria-hidden="true" /> : <VolumeX className="h-4 w-4" aria-hidden="true" />}
              </button>

              {/* Logout */}
              <button
                onClick={logout}
                className="flex-1 flex items-center justify-center py-2 rounded-lg text-bdo-red dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                aria-label="Logout"
                title="Logout"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}

export default Sidebar
