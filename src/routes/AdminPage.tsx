import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Plus, BarChart3, Play, Pause, Shield, AlertCircle } from 'lucide-react'
import Button from '../lib/components/Button'
import { useAuth } from '../lib/contexts/AuthContext'

interface QuizSession {
  id: string
  name: string
  date: string
  time: string
  isActive: boolean
  createdAt: string
  createdBy?: string
  department?: string
  _count?: { responses: number }
  canViewMetrics?: boolean
}

function AdminPage() {
  const [sessions, setSessions] = useState<QuizSession[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const { user } = useAuth()

  useEffect(() => {
    fetchSessions()
  }, [])

  const fetchSessions = async () => {
    try {
      const response = await fetch('/api/sessions', { credentials: 'include' })
      if (response.ok) {
        const data = await response.json()
        setSessions(data)
      } else {
        setError('Failed to load sessions')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const toggleSessionStatus = async (sessionId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive }),
      })
      if (response.ok) {
        setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, isActive: !isActive } : s))
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to update session')
      }
    } catch {
      alert('Network error updating session')
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-bdo-red"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--ui-text)' }}>Error</h2>
        <p className="mb-6" style={{ color: 'var(--ui-text-muted)' }}>{error}</p>
        <Button onClick={fetchSessions}>Try Again</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap gap-3 justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-bdo-navy dark:text-gray-100">{user?.isHR ? 'HR Dashboard' : 'Admin Dashboard'}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Welcome, {user?.email} — manage quiz sessions and monitor performance
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link to="/app/admin/audit-logs">
            <Button variant="outline">
              <Shield className="h-4 w-4 mr-2" />
              Audit Logs
            </Button>
          </Link>
          <Link to="/app/admin/create">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Session
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Row */}
      <div className="ui-grid-stats">
        {[
          { label: 'Total Sessions', value: sessions.length, color: 'text-bdo-navy dark:text-blue-300' },
          { label: 'Active Sessions', value: sessions.filter(s => s.isActive).length, color: 'text-green-600 dark:text-green-400' },
          { label: 'Inactive Sessions', value: sessions.filter(s => !s.isActive).length, color: 'text-gray-500 dark:text-gray-400' },
          {
            label: 'Total Responses',
            value: sessions.reduce((sum, s) => sum + (s._count?.responses ?? 0), 0),
            color: 'text-bdo-red'
          },
        ].map(({ label, value, color }) => (
          <div key={label} className="ui-card">
            <p className="text-sm font-medium" style={{ color: 'var(--ui-text-muted)' }}>{label}</p>
            <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Sessions Table */}
      <div className="ui-card p-0 overflow-hidden">
        <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--ui-border)' }}>
          <h2 className="text-xl font-semibold text-bdo-navy dark:text-gray-100">Quiz Sessions</h2>
          <span className="text-sm" style={{ color: 'var(--ui-text-muted)' }}>{sessions.length} total</span>
        </div>

        {sessions.length === 0 ? (
          <div className="text-center py-12">
            <p className="mb-4" style={{ color: 'var(--ui-text-muted)' }}>No quiz sessions created yet.</p>
            <Link to="/app/admin/create">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Session
              </Button>
            </Link>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--ui-border)' }}>
            {sessions.map((session) => (
              <div
                key={session.id}
                className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-bdo-navy dark:text-gray-100 truncate">
                    {session.name}
                  </h3>
                  <p className="text-sm mt-0.5" style={{ color: 'var(--ui-text-muted)' }}>
                    {new Date(session.date).toLocaleDateString()} at {session.time}
                    {session.department && <> &bull; {session.department}</>}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--ui-text-muted)' }}>
                    Created {new Date(session.createdAt).toLocaleDateString()}
                    {session.createdBy && <> by {session.createdBy}</>}
                    {' '}&bull; {session._count?.responses ?? 0} participants
                  </p>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    session.isActive
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                  }`}>
                    {session.isActive ? 'Active' : 'Inactive'}
                  </span>

                  <Button variant="outline" size="sm" onClick={() => toggleSessionStatus(session.id, session.isActive)}>
                    {session.isActive ? (
                      <><Pause className="h-4 w-4 mr-1" />Deactivate</>
                    ) : (
                      <><Play className="h-4 w-4 mr-1" />Activate</>
                    )}
                  </Button>

                  {session.canViewMetrics !== false ? (
                    <Link to={`/app/admin/results?session=${session.id}`}>
                      <Button variant="outline" size="sm">
                        <BarChart3 className="h-4 w-4 mr-1" />
                        Results
                      </Button>
                    </Link>
                  ) : (
                    <Button variant="outline" size="sm" disabled title="You can only view results for quizzes you created">
                      <BarChart3 className="h-4 w-4 mr-1" />
                      Locked
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminPage
