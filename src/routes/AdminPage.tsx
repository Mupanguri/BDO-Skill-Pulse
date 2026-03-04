import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, BarChart3, Play, Pause, Shield, AlertCircle, TrendingUp, LogOut } from 'lucide-react'
import Button from '../lib/components/Button'
import { useAuth } from '../lib/contexts/AuthContext'

interface QuizSession {
  id: string
  name: string
  date: string
  time: string
  isActive: boolean
  createdAt: string
  _count?: {
    responses: number
  }
}

function AdminPage() {
  const [sessions, setSessions] = useState<QuizSession[]>([])
  const [loading, setLoading] = useState(true)
  const [sessionExpired, setSessionExpired] = useState(false)
  const { accessToken, refreshAccessToken, logout } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    fetchSessions()
  }, [accessToken])

  const fetchSessions = async () => {
    if (!accessToken) return

    try {
      const response = await fetch('http://localhost:3001/api/sessions', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setSessions(data)
      } else if (response.status === 401) {
        // Try to refresh token and retry
        const refreshed = await refreshAccessToken()
        if (refreshed) {
          // Retry with new token
          const newResponse = await fetch('http://localhost:3001/api/sessions', {
            headers: {
              'Authorization': `Bearer ${accessToken}`
            }
          })
          if (newResponse.ok) {
            const data = await newResponse.json()
            setSessions(data)
          }
        } else {
          setSessionExpired(true)
        }
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleSessionStatus = async (sessionId: string, isActive: boolean) => {
    if (!accessToken) return

    try {
      console.log(`Toggling session ${sessionId} from ${isActive} to ${!isActive}`)
      const response = await fetch(`http://localhost:3001/api/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({ isActive: !isActive }),
      })

      console.log('Response status:', response.status)
      const data = await response.json()
      console.log('Response data:', data)

      if (response.ok) {
        console.log('Session updated successfully')
        // Refresh sessions list
        fetchSessions()
      } else if (response.status === 401) {
        // Try to refresh token and retry
        const refreshed = await refreshAccessToken()
        if (refreshed) {
          // Retry with new token
          const newResponse = await fetch(`http://localhost:3001/api/sessions/${sessionId}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({ isActive: !isActive }),
          })
          if (newResponse.ok) {
            console.log('Session updated successfully after token refresh')
            fetchSessions()
          }
        } else {
          setSessionExpired(true)
        }
      } else {
        console.error('Failed to update session:', data)
      }
    } catch (error) {
      console.error('Failed to toggle session status:', error)
    }
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-bdo-red"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-bdo-navy">BDO Skills Pulse - Admin Dashboard</h1>
        <div className="flex gap-3">
          <Link to="/app/admin/analytics">
            <Button variant="outline">
              <TrendingUp className="h-4 w-4 mr-2" />
              Analytics
            </Button>
          </Link>
          <Link to="/app/admin/audit-logs">
            <Button variant="outline">
              <Shield className="h-4 w-4 mr-2" />
              Audit Logs
            </Button>
          </Link>
          <Link to="/app/admin/create">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create New Session
            </Button>
          </Link>
          <Button variant="outline" onClick={logout}>
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-bdo-navy">Quiz Sessions</h2>
        </div>

        <div className="p-6">
          {sessions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">No quiz sessions created yet.</p>
              <Link to="/app/admin/create">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Session
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {sessions.map((session) => (
                <div key={session.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-bdo-navy">{session.name}</h3>
                    <p className="text-gray-600">
                      {new Date(session.date).toLocaleDateString()} at {session.time}
                    </p>
                    <p className="text-sm text-gray-500">
                      Created: {new Date(session.createdAt).toLocaleDateString()}
                      {(session as any).createdBy && <> by {(session as any).createdBy}</>}
                      {(session as any).department && <> • {(session as any).department}</>}
                    </p>
                    <p className="text-sm text-gray-500">
                      {(session as any)._count?.responses || 0} participants completed
                    </p>
                  </div>

                  <div className="flex items-center space-x-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${session.isActive
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                      }`}>
                      {session.isActive ? 'Active' : 'Inactive'}
                    </span>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleSessionStatus(session.id, session.isActive)}
                    >
                      {session.isActive ? (
                        <>
                          <Pause className="h-4 w-4 mr-1" />
                          Deactivate
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-1" />
                          Activate
                        </>
                      )}
                    </Button>

                    <Link to={`/app/admin/results?session=${session.id}`}>
                      <Button variant="outline" size="sm">
                        <BarChart3 className="h-4 w-4 mr-1" />
                        Results
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AdminPage
