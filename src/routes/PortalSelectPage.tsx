import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, User, Settings, Eye, EyeOff, AlertCircle, Lock } from 'lucide-react'
import { useAuth } from '../lib/contexts/AuthContext'

type PendingPortal = 'admin' | 'superadmin' | null

function PortalSelectPage() {
  const { user, setPortalMode } = useAuth()
  const navigate = useNavigate()

  const [pendingPortal, setPendingPortal] = useState<PendingPortal>(null)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [verifyError, setVerifyError] = useState('')

  const roleLabel = user?.isHR ? 'HR' : 'Admin'

  const requestAdmin = () => { setPendingPortal('admin'); setPassword(''); setVerifyError('') }
  const requestSuperAdmin = () => { setPendingPortal('superadmin'); setPassword(''); setVerifyError('') }

  const enterUser = () => {
    setPortalMode('user')
    navigate('/app/dashboard')
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pendingPortal || !password) return
    setVerifying(true)
    setVerifyError('')
    try {
      const res = await fetch('/api/verify-password', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      })
      if (res.ok) {
        setPortalMode(pendingPortal)
        navigate(pendingPortal === 'superadmin' ? '/app/superadmin' : '/app/admin')
      } else {
        const data = await res.json()
        setVerifyError(data.error || 'Incorrect password')
      }
    } catch {
      setVerifyError('Network error. Please try again.')
    } finally {
      setVerifying(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--ui-bg)' }}>
      <div className="w-full max-w-2xl">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-bdo-red mb-4">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-bdo-navy dark:text-gray-100">BDO Skills Pulse</h1>
          <p className="mt-2" style={{ color: 'var(--ui-text-muted)' }}>
            Welcome back, <span className="font-medium" style={{ color: 'var(--ui-text)' }}>{(user as any)?.displayName || user?.email}</span>
          </p>
          <p className="text-sm mt-1" style={{ color: 'var(--ui-text-muted)' }}>
            Select how you'd like to enter the system
          </p>
        </div>

        {/* Password verify overlay */}
        {pendingPortal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-8">
              <div className="flex flex-col items-center text-center mb-6">
                <div className="w-14 h-14 rounded-full bg-bdo-red/10 flex items-center justify-center mb-3">
                  <Lock className="h-7 w-7 text-bdo-red" />
                </div>
                <h2 className="text-xl font-bold text-bdo-navy dark:text-gray-100">Verify Identity</h2>
                <p className="text-sm mt-1" style={{ color: 'var(--ui-text-muted)' }}>
                  Enter your password to access the {pendingPortal === 'superadmin' ? 'Super Admin' : roleLabel} Portal
                </p>
              </div>

              <form onSubmit={handleVerify} className="space-y-4">
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Your account password"
                    autoFocus
                    className="w-full px-4 py-3 pr-11 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                {verifyError && (
                  <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    {verifyError}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setPendingPortal(null)}
                    className="flex-1 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={verifying || !password}
                    className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-60 transition-colors"
                    style={{ background: 'linear-gradient(135deg, #cc2200, #e63300)' }}
                  >
                    {verifying ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Verifying…
                      </span>
                    ) : 'Enter Portal'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className={`grid gap-5 ${user?.isSuperAdmin ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'}`}>
          {/* Super Admin Portal */}
          {user?.isSuperAdmin && (
            <button
              onClick={requestSuperAdmin}
              className="group ui-card p-8 text-left hover:border-purple-500 hover:shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 border-2 border-transparent"
            >
              <div className="flex flex-col items-center text-center gap-4">
                <div className="w-14 h-14 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center group-hover:bg-purple-200 dark:group-hover:bg-purple-900/50 transition-colors">
                  <Settings className="h-7 w-7 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-lg font-bold text-bdo-navy dark:text-gray-100">Super Admin</p>
                  <p className="text-sm mt-1" style={{ color: 'var(--ui-text-muted)' }}>
                    Full user management — create, modify, and delete accounts
                  </p>
                </div>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
                  Super Admin access
                </span>
              </div>
            </button>
          )}

          {/* Admin / HR Portal */}
          {(user?.isAdmin || user?.isHR) && (
            <button
              onClick={requestAdmin}
              className="group ui-card p-8 text-left hover:border-bdo-red hover:shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-bdo-red border-2 border-transparent"
            >
              <div className="flex flex-col items-center text-center gap-4">
                <div className="w-14 h-14 rounded-full bg-bdo-red/10 flex items-center justify-center group-hover:bg-bdo-red/20 transition-colors">
                  <Shield className="h-7 w-7 text-bdo-red" />
                </div>
                <div>
                  <p className="text-lg font-bold text-bdo-navy dark:text-gray-100">{roleLabel} Portal</p>
                  <p className="text-sm mt-1" style={{ color: 'var(--ui-text-muted)' }}>
                    {user?.isHR
                      ? 'Full system oversight, all analytics, all audit logs'
                      : 'Manage quizzes, view results, monitor your sessions'}
                  </p>
                </div>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-bdo-red/10 text-bdo-red">
                  {roleLabel} access
                </span>
              </div>
            </button>
          )}

          {/* User Portal */}
          <button
            onClick={enterUser}
            className="group ui-card p-8 text-left hover:border-bdo-blue hover:shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-bdo-blue border-2 border-transparent"
          >
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-14 h-14 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors">
                <User className="h-7 w-7 text-bdo-blue" />
              </div>
              <div>
                <p className="text-lg font-bold text-bdo-navy dark:text-gray-100">User Portal</p>
                <p className="text-sm mt-1" style={{ color: 'var(--ui-text-muted)' }}>
                  Take quizzes, view your own results and performance history
                </p>
              </div>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-bdo-blue">
                Standard access
              </span>
            </div>
          </button>
        </div>

        <p className="text-center text-xs mt-8" style={{ color: 'var(--ui-text-muted)' }}>
          You can switch portals at any time from the sidebar
        </p>
      </div>

    </div>
  )
}

export default PortalSelectPage
