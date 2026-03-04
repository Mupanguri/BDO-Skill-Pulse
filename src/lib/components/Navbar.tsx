import { useAuth } from '../contexts/AuthContext'
import { LogOut, Eye, Plus, FileText, BarChart3, User, Shield, Moon, Sun } from 'lucide-react'
import Button from './Button'

function Navbar() {
  const { user, logout, isDarkMode, toggleDarkMode } = useAuth()

  return (
    <nav className="bg-white border-b border-bdo-medium-gray px-4 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <img
              src="/bdo_logo.png"
              alt="BDO Logo"
              className="h-12 w-auto object-contain"
            />
          </div>

          {/* Navigation Links */}
          {user && (
            <div className="hidden md:flex items-center space-x-8">
              {user.isAdmin ? (
                /* Admin Navigation */
                <>
                  <a href="/admin" className="flex items-center space-x-2 text-bdo-navy hover:text-bdo-red transition-colors">
                    <Eye className="h-4 w-4" />
                    <span>Dashboard</span>
                  </a>
                  <a href="/admin/participants" className="flex items-center space-x-2 text-bdo-navy hover:text-bdo-red transition-colors">
                    <User className="h-4 w-4" />
                    <span>Participants</span>
                  </a>
                  <a href="/admin/results" className="flex items-center space-x-2 text-bdo-navy hover:text-bdo-red transition-colors">
                    <BarChart3 className="h-4 w-4" />
                    <span>View Results</span>
                  </a>
                  <a href="/admin/create" className="flex items-center space-x-2 text-bdo-navy hover:text-bdo-red transition-colors">
                    <Plus className="h-4 w-4" />
                    <span>Create Session</span>
                  </a>
                </>
              ) : (
                /* User Navigation */
                <>
                  <a href="/dashboard" className="flex items-center space-x-2 text-bdo-navy hover:text-bdo-red transition-colors">
                    <FileText className="h-4 w-4" />
                    <span>Active Quiz</span>
                  </a>
                  <a href="/app/history" className="flex items-center space-x-2 text-bdo-navy hover:text-bdo-red transition-colors">
                    <BarChart3 className="h-4 w-4" />
                    <span>My History</span>
                  </a>
                </>
              )}
            </div>
          )}

          {/* User Menu */}
          <div className="flex items-center space-x-2">
            {user ? (
              <>
                {/* Dark Mode Toggle - Admins Only */}
                {user.isAdmin && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleDarkMode}
                    className="p-2"
                    title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                  >
                    {isDarkMode ? (
                      <Sun className="h-4 w-4" />
                    ) : (
                      <Moon className="h-4 w-4" />
                    )}
                  </Button>
                )}
                
                <span className="text-sm text-bdo-navy hidden md:block">
                  {user.email} ({user.department})
                </span>
                <Button variant="tertiary" size="sm" onClick={logout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </>
            ) : (
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" href="/register">
                  Register
                </Button>
                <Button variant="primary" size="sm" href="/login">
                  Login
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
