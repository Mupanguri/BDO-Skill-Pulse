import { useState, useEffect } from 'react'
import { useAuth } from '../lib/contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import Button from '../lib/components/Button'
import { Download, Eye, AlertTriangle, Shield, Clock, AlertCircle } from 'lucide-react'

interface AuditLog {
  id: string
  adminEmail: string
  action: string
  details: any
  ipAddress?: string
  userAgent?: string
  timestamp: string
}

function AuditLogsPage() {
  const { user, accessToken, refreshAccessToken } = useAuth()
  const navigate = useNavigate()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [superPassword, setSuperPassword] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(true)
  const [error, setError] = useState('')
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)
  const [dateFilter, setDateFilter] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [sessionExpired, setSessionExpired] = useState(false)

  // Super password - hardcoded for now, in production use environment variable
  const SUPER_PASSWORD = 'BDO_AUDIT_2024_SECURE'

  useEffect(() => {
    if (!user?.isAdmin) {
      navigate('/app/dashboard')
      return
    }
  }, [user, navigate])

  const authenticateSuperPassword = () => {
    if (superPassword === SUPER_PASSWORD) {
      setIsAuthenticated(true)
      setShowPasswordPrompt(false)
      setError('')
      fetchAuditLogs()
    } else {
      setError('Invalid super password')
    }
  }

  const fetchAuditLogs = async () => {
    if (!accessToken) return

    try {
      setLoading(true)
      const response = await fetch('http://localhost:3001/api/audit/logs', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setLogs(data.logs)
      } else if (response.status === 401) {
        // Try to refresh token and retry
        const refreshed = await refreshAccessToken()
        if (refreshed) {
          // Retry with new token
          const newResponse = await fetch('http://localhost:3001/api/audit/logs', {
            headers: {
              'Authorization': `Bearer ${accessToken}`
            }
          })
          if (newResponse.ok) {
            const data = await newResponse.json()
            setLogs(data.logs)
          }
        } else {
          setSessionExpired(true)
        }
      } else {
        setError('Failed to fetch audit logs')
      }
    } catch (error) {
      console.error('Failed to fetch audit logs:', error)
      setError('Failed to fetch audit logs')
    } finally {
      setLoading(false)
    }
  }

  const exportToPDF = () => {
    // Simple text export for now - in production, use a proper PDF library
    const filteredLogs = getFilteredLogs()
    const logText = filteredLogs.map(log =>
      `${new Date(log.timestamp).toLocaleString()}\n` +
      `Admin: ${log.adminEmail}\n` +
      `Action: ${log.action}\n` +
      `Details: ${JSON.stringify(log.details, null, 2)}\n` +
      `IP: ${log.ipAddress || 'N/A'}\n` +
      `User Agent: ${log.userAgent || 'N/A'}\n` +
      `---\n`
    ).join('\n')

    const blob = new Blob([logText], { type: 'text/plain' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `audit_logs_${new Date().toISOString().split('T')[0]}.txt`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const getFilteredLogs = () => {
    return logs.filter(log => {
      const matchesDate = !dateFilter || log.timestamp.startsWith(dateFilter)
      const matchesAction = !actionFilter || log.action.toLowerCase().includes(actionFilter.toLowerCase())
      return matchesDate && matchesAction
    })
  }

  const getActionIcon = (action: string) => {
    switch (action.toLowerCase()) {
      case 'create_quiz':
        return '➕'
      case 'warn_user':
        return '⚠️'
      case 'elevate_user':
        return '⬆️'
      case 'delete_quiz':
        return '🗑️'
      case 'login':
        return '🔐'
      case 'logout':
        return '🚪'
      default:
        return '📝'
    }
  }

  const getActionColor = (action: string) => {
    switch (action.toLowerCase()) {
      case 'warn_user':
      case 'delete_quiz':
        return 'text-red-600'
      case 'create_quiz':
      case 'elevate_user':
        return 'text-green-600'
      case 'login':
        return 'text-blue-600'
      case 'logout':
        return 'text-gray-600'
      default:
        return 'text-purple-600'
    }
  }

  if (!user?.isAdmin) {
    return null
  }

  if (showPasswordPrompt) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-6">
            <Shield className="h-16 w-16 text-red-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900">Super Administrator Access</h2>
            <p className="text-gray-600 mt-2">
              Enter the super password to access audit logs
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="superPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Super Password
              </label>
              <input
                id="superPassword"
                type="password"
                value={superPassword}
                onChange={(e) => setSuperPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Enter super password"
                onKeyPress={(e) => e.key === 'Enter' && authenticateSuperPassword()}
              />
            </div>

            {error && (
              <div className="text-red-600 text-sm text-center bg-red-50 p-3 rounded">
                {error}
              </div>
            )}

            <Button
              onClick={authenticateSuperPassword}
              disabled={!superPassword}
              className="w-full"
            >
              <Shield className="h-4 w-4 mr-2" />
              Access Audit Logs
            </Button>
          </div>

          <div className="mt-6 text-center">
            <button
              onClick={() => navigate('/admin')}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              ← Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (sessionExpired) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Session Expired</h2>
        <p className="text-gray-600 mb-6">
          Your session has expired. Please log in again to continue.
        </p>
        <Button onClick={() => navigate('/login')}>
          Go to Login
        </Button>
      </div>
    )
  }

  const filteredLogs = getFilteredLogs()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Shield className="h-8 w-8 text-red-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Audit Logs</h1>
            <p className="text-gray-600">Super administrator access - All admin actions logged</p>
          </div>
        </div>
        <Button
          onClick={exportToPDF}
          className="bg-green-600 hover:bg-green-700"
        >
          <Download className="h-4 w-4 mr-2" />
          Export Logs
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Date
            </label>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Action
            </label>
            <input
              type="text"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              placeholder="e.g., create_quiz, warn_user"
              className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          <Button
            variant="outline"
            onClick={() => {
              setDateFilter('')
              setActionFilter('')
            }}
          >
            Clear Filters
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <Eye className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <p className="text-2xl font-bold text-gray-900">{logs.length}</p>
              <p className="text-gray-600">Total Actions</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-green-600 mr-3" />
            <div>
              <p className="text-2xl font-bold text-gray-900">{filteredLogs.length}</p>
              <p className="text-gray-600">Filtered Results</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <AlertTriangle className="h-8 w-8 text-red-600 mr-3" />
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {logs.filter(log => ['warn_user', 'delete_quiz'].includes(log.action)).length}
              </p>
              <p className="text-gray-600">Critical Actions</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <Shield className="h-8 w-8 text-purple-600 mr-3" />
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {new Set(logs.map(log => log.adminEmail)).size}
              </p>
              <p className="text-gray-600">Active Admins</p>
            </div>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-xl font-semibold text-gray-900">
            Audit Log Entries {filteredLogs.length !== logs.length && `(${filteredLogs.length} filtered)`}
          </h3>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading audit logs...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Admin
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="text-lg mr-2" role="img" aria-label={log.action}>
                          {getActionIcon(log.action)}
                        </span>
                        <span className={`font-medium ${getActionColor(log.action)}`}>
                          {log.action.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {log.adminEmail}
                      </div>
                      {log.ipAddress && (
                        <div className="text-xs text-gray-500">
                          IP: {log.ipAddress}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(log.timestamp).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedLog(log)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View Details
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredLogs.length === 0 && (
              <div className="text-center py-12">
                <Shield className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No audit logs found matching your filters.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Log Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                  <span className="text-2xl mr-3" role="img" aria-label={selectedLog.action}>
                    {getActionIcon(selectedLog.action)}
                  </span>
                  {selectedLog.action.replace('_', ' ').toUpperCase()}
                </h3>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Admin Email</label>
                    <p className="text-sm text-gray-900">{selectedLog.adminEmail}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Timestamp</label>
                    <p className="text-sm text-gray-900">
                      {new Date(selectedLog.timestamp).toLocaleString()}
                    </p>
                  </div>
                  {selectedLog.ipAddress && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">IP Address</label>
                      <p className="text-sm text-gray-900">{selectedLog.ipAddress}</p>
                    </div>
                  )}
                  {selectedLog.userAgent && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">User Agent</label>
                      <p className="text-sm text-gray-900 truncate" title={selectedLog.userAgent}>
                        {selectedLog.userAgent.substring(0, 50)}...
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500 block mb-2">Action Details</label>
                  <pre className="bg-gray-50 p-4 rounded-lg text-sm overflow-x-auto">
                    {JSON.stringify(selectedLog.details, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AuditLogsPage
