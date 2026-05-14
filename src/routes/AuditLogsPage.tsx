import { useState, useEffect } from 'react'
import { useAuth } from '../lib/contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import Button from '../lib/components/Button'
import { Download, Eye, AlertTriangle, Shield, Clock, AlertCircle, Star, MessageSquare, X, ChevronDown } from 'lucide-react'

interface AuditLog {
  id: string
  adminEmail: string
  action: string
  details: any
  ipAddress?: string
  userAgent?: string
  timestamp: string
}

interface FeedbackEntry {
  id: string
  sessionId: string
  rating: number
  comments: string | null
  submittedAt: string
}

const SUPER_PASSWORD = 'BD0_CH@RT3R3D_@CC0UNT@NT$'

function renderDetails(details: any): JSX.Element {
  if (!details || typeof details !== 'object') {
    return <span className="text-gray-300">{String(details)}</span>
  }
  const entries = Object.entries(details)
  if (entries.length === 0) return <span className="text-gray-500 italic">No details</span>
  return (
    <dl className="space-y-2">
      {entries.map(([k, v]) => (
        <div key={k} className="flex gap-3 flex-wrap">
          <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400 w-36 flex-shrink-0 pt-0.5">
            {k.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')}
          </dt>
          <dd className="text-sm text-gray-100 flex-1 break-all">
            {typeof v === 'object' ? (
              <code className="text-xs bg-gray-700 px-2 py-1 rounded text-blue-300 whitespace-pre-wrap block">
                {JSON.stringify(v, null, 2)}
              </code>
            ) : String(v)}
          </dd>
        </div>
      ))}
    </dl>
  )
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <Star key={s} className={`h-4 w-4 ${s <= rating ? 'text-amber-400 fill-amber-400' : 'text-gray-600'}`} />
      ))}
    </div>
  )
}

function AuditLogsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [tab, setTab] = useState<'logs' | 'feedback'>('logs')
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [superPassword, setSuperPassword] = useState('')
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(true)
  const [error, setError] = useState('')
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)
  const [dateFilter, setDateFilter] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [sessionExpired, setSessionExpired] = useState(false)

  // Feedback state
  const [sessions, setSessions] = useState<any[]>([])
  const [selectedSessionId, setSelectedSessionId] = useState<string>('')
  const [feedback, setFeedback] = useState<FeedbackEntry[]>([])
  const [feedbackLoading, setFeedbackLoading] = useState(false)
  const [showSessionDropdown, setShowSessionDropdown] = useState(false)

  useEffect(() => {
    if (!user?.isAdmin && !user?.isHR) navigate('/app/dashboard')
  }, [user, navigate])

  const authenticateSuperPassword = () => {
    if (superPassword === SUPER_PASSWORD) {
      setShowPasswordPrompt(false)
      setError('')
      fetchAuditLogs()
      fetchSessions()
    } else {
      setError('Invalid super password')
    }
  }

  const fetchAuditLogs = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/audit/logs', { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setLogs(data.logs)
      } else if (res.status === 401) {
        setSessionExpired(true)
      } else {
        setError('Failed to fetch audit logs')
      }
    } catch {
      setError('Failed to fetch audit logs')
    } finally {
      setLoading(false)
    }
  }

  const fetchSessions = async () => {
    try {
      const res = await fetch('/api/sessions', { credentials: 'include' })
      if (res.ok) setSessions(await res.json())
    } catch {}
  }

  const fetchFeedback = async (sessionId: string) => {
    setFeedbackLoading(true)
    try {
      const url = sessionId ? `/api/feedback/admin?sessionId=${sessionId}` : '/api/feedback/admin'
      const res = await fetch(url, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setFeedback(data.feedback || [])
      }
    } catch {}
    finally { setFeedbackLoading(false) }
  }

  useEffect(() => {
    if (!showPasswordPrompt) fetchFeedback(selectedSessionId)
  }, [selectedSessionId, showPasswordPrompt])

  const getFilteredLogs = () => {
    let filtered = logs
    if (dateFilter) {
      filtered = filtered.filter(l => new Date(l.timestamp).toISOString().startsWith(dateFilter))
    }
    if (actionFilter.trim()) {
      filtered = filtered.filter(l => l.action.toLowerCase().includes(actionFilter.toLowerCase()))
    }
    return filtered
  }

  const getActionChip = (action: string) => {
    const map: Record<string, string> = {
      create_quiz: 'bg-green-900/50 text-green-300 border border-green-700',
      delete_quiz: 'bg-red-900/50 text-red-300 border border-red-700',
      warn_user: 'bg-orange-900/50 text-orange-300 border border-orange-700',
      elevate_user: 'bg-purple-900/50 text-purple-300 border border-purple-700',
      login: 'bg-blue-900/50 text-blue-300 border border-blue-700',
      logout: 'bg-gray-700 text-gray-300 border border-gray-600',
    }
    return map[action.toLowerCase()] || 'bg-gray-700 text-gray-300 border border-gray-600'
  }

  const exportLogs = () => {
    const filtered = getFilteredLogs()
    const csv = [
      ['Timestamp', 'Action', 'Admin', 'IP', 'Details'],
      ...filtered.map(l => [
        new Date(l.timestamp).toLocaleString(),
        l.action,
        l.adminEmail,
        l.ipAddress || '',
        JSON.stringify(l.details)
      ])
    ].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `audit_logs_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
  }

  const exportFeedback = () => {
    const sessionName = sessions.find(s => s.id === selectedSessionId)?.name || 'all'
    const csv = [
      ['Rating (/5)', 'Score (/10)', 'Comments', 'Date'],
      ...feedback.map(f => [f.rating, (f.rating * 2).toFixed(1), f.comments || '', new Date(f.submittedAt).toLocaleString()])
    ].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `feedback_${sessionName}_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
  }

  const avgScore = feedback.length > 0
    ? (feedback.reduce((s, f) => s + f.rating, 0) / feedback.length * 2)
    : 0

  // Password gate
  if (showPasswordPrompt) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--ui-bg)' }}>
        <div className="w-full max-w-md">
          <div className="ui-card p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-bdo-red/10 flex items-center justify-center mx-auto mb-4">
                <Shield className="h-8 w-8 text-bdo-red" />
              </div>
              <h2 className="text-2xl font-bold text-bdo-navy dark:text-gray-100">Super Administrator Access</h2>
              <p className="text-sm mt-1" style={{ color: 'var(--ui-text-muted)' }}>
                Enter the super password to access audit logs and feedback
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--ui-text-muted)' }}>
                  Super Password
                </label>
                <input
                  type="password"
                  value={superPassword}
                  onChange={e => setSuperPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && authenticateSuperPassword()}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-600 text-sm"
                  placeholder="Enter super password"
                  autoFocus
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <Button onClick={authenticateSuperPassword} disabled={!superPassword} className="w-full">
                <Shield className="h-4 w-4 mr-2" />
                Access Audit Logs
              </Button>
            </div>

            <div className="mt-6 text-center">
              <button
                onClick={() => navigate('/app/admin')}
                className="text-sm hover:underline"
                style={{ color: 'var(--ui-text-muted)' }}
              >
                ← Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (sessionExpired) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--ui-text)' }}>Session Expired</h2>
        <p className="mb-6" style={{ color: 'var(--ui-text-muted)' }}>Please log in again to continue.</p>
        <Button onClick={() => navigate('/login')}>Go to Login</Button>
      </div>
    )
  }

  const filteredLogs = getFilteredLogs()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-bdo-red" />
          <div>
            <h1 className="text-3xl font-bold text-bdo-navy dark:text-gray-100">Audit & Feedback</h1>
            <p className="text-sm" style={{ color: 'var(--ui-text-muted)' }}>All admin actions and user feedback are recorded</p>
          </div>
        </div>
        <Button onClick={tab === 'logs' ? exportLogs : exportFeedback} className="bg-green-600 hover:bg-green-700">
          <Download className="h-4 w-4 mr-2" />
          Export {tab === 'logs' ? 'Logs' : 'Feedback'}
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--ui-surface)' }}>
        {(['logs', 'feedback'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all ${tab === t ? 'bg-bdo-red text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
          >
            {t === 'logs' ? 'Activity Logs' : 'User Feedback'}
          </button>
        ))}
      </div>

      {tab === 'logs' && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: Eye, label: 'Total Actions', value: logs.length, color: 'text-blue-500' },
              { icon: Clock, label: 'Filtered', value: filteredLogs.length, color: 'text-green-500' },
              { icon: AlertTriangle, label: 'Critical', value: logs.filter(l => ['warn_user', 'delete_quiz'].includes(l.action)).length, color: 'text-red-500' },
              { icon: Shield, label: 'Active Admins', value: new Set(logs.map(l => l.adminEmail)).size, color: 'text-purple-500' },
            ].map(({ icon: Icon, label, value, color }) => (
              <div key={label} className="ui-card p-5 flex items-center gap-4">
                <Icon className={`h-8 w-8 ${color} flex-shrink-0`} />
                <div>
                  <p className="text-2xl font-bold" style={{ color: 'var(--ui-text)' }}>{value}</p>
                  <p className="text-xs" style={{ color: 'var(--ui-text-muted)' }}>{label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="ui-card p-5">
            <div className="flex flex-wrap gap-4 items-end">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--ui-text-muted)' }}>Filter by Date</label>
                <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)}
                  className="px-3 py-2 rounded-lg border text-sm border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--ui-text-muted)' }}>Filter by Action</label>
                <input type="text" value={actionFilter} onChange={e => setActionFilter(e.target.value)}
                  placeholder="e.g. create_quiz, login"
                  className="px-3 py-2 rounded-lg border text-sm border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500" />
              </div>
              <Button variant="outline" onClick={() => { setDateFilter(''); setActionFilter('') }}>Clear</Button>
            </div>
          </div>

          {/* Log table */}
          <div className="ui-card p-0 overflow-hidden">
            <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--ui-border)' }}>
              <h3 className="text-lg font-semibold" style={{ color: 'var(--ui-text)' }}>
                Audit Log Entries {filteredLogs.length !== logs.length && <span className="text-sm font-normal text-gray-400">({filteredLogs.length} of {logs.length})</span>}
              </h3>
            </div>

            {loading ? (
              <div className="text-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-bdo-red mx-auto" /></div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-12">
                <Shield className="h-12 w-12 mx-auto mb-3" style={{ color: 'var(--ui-text-muted)' }} />
                <p style={{ color: 'var(--ui-text-muted)' }}>No log entries match your filters.</p>
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: 'var(--ui-border)' }}>
                {filteredLogs.map(log => (
                  <div key={log.id} className="px-6 py-4 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${getActionChip(log.action)}`}>
                          {log.action.replace(/_/g, ' ').toUpperCase()}
                        </span>
                      </div>
                      <p className="text-sm font-medium" style={{ color: 'var(--ui-text)' }}>{log.adminEmail}</p>
                      {log.ipAddress && <p className="text-xs" style={{ color: 'var(--ui-text-muted)' }}>IP: {log.ipAddress}</p>}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm" style={{ color: 'var(--ui-text)' }}>{new Date(log.timestamp).toLocaleDateString()}</p>
                      <p className="text-xs" style={{ color: 'var(--ui-text-muted)' }}>{new Date(log.timestamp).toLocaleTimeString()}</p>
                    </div>
                    <button
                      onClick={() => setSelectedLog(log)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
                      style={{ borderColor: 'var(--ui-border)', color: 'var(--ui-text-muted)' }}
                    >
                      <Eye className="h-3.5 w-3.5" /> View
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {tab === 'feedback' && (
        <div className="space-y-6">
          {/* Session selector */}
          <div className="ui-card p-5">
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ui-text-muted)' }}>Select Quiz Session</label>
            <div className="relative">
              <button
                onClick={() => setShowSessionDropdown(v => !v)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-lg border text-sm font-medium text-left"
                style={{ borderColor: 'var(--ui-border)', background: 'var(--ui-surface)', color: 'var(--ui-text)' }}
              >
                <span>{selectedSessionId ? sessions.find(s => s.id === selectedSessionId)?.name : 'All sessions'}</span>
                <ChevronDown className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--ui-text-muted)' }} />
              </button>
              {showSessionDropdown && (
                <div className="absolute top-full left-0 right-0 z-20 mt-1 rounded-lg border shadow-lg overflow-hidden"
                  style={{ background: 'var(--ui-surface)', borderColor: 'var(--ui-border)' }}>
                  <button
                    onClick={() => { setSelectedSessionId(''); setShowSessionDropdown(false) }}
                    className="w-full px-4 py-3 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    style={{ color: 'var(--ui-text)' }}
                  >
                    All sessions
                  </button>
                  {sessions.map(s => (
                    <button key={s.id}
                      onClick={() => { setSelectedSessionId(s.id); setShowSessionDropdown(false) }}
                      className="w-full px-4 py-3 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border-t"
                      style={{ color: 'var(--ui-text)', borderColor: 'var(--ui-border)' }}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Aggregate score */}
          {feedback.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="ui-card p-5 text-center">
                <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--ui-text-muted)' }}>Quiz Master Score</p>
                <p className={`text-4xl font-bold ${avgScore >= 7 ? 'text-green-500' : avgScore >= 5 ? 'text-amber-500' : 'text-red-500'}`}>
                  {avgScore.toFixed(1)}
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--ui-text-muted)' }}>out of 10.0</p>
              </div>
              <div className="ui-card p-5 text-center">
                <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--ui-text-muted)' }}>Avg Star Rating</p>
                <p className="text-4xl font-bold text-amber-500">{(feedback.reduce((s, f) => s + f.rating, 0) / feedback.length).toFixed(1)}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--ui-text-muted)' }}>out of 5 stars</p>
              </div>
              <div className="ui-card p-5 text-center">
                <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--ui-text-muted)' }}>Responses</p>
                <p className="text-4xl font-bold" style={{ color: 'var(--ui-text)' }}>{feedback.length}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--ui-text-muted)' }}>anonymous reviews</p>
              </div>
            </div>
          )}

          {/* Feedback list */}
          <div className="ui-card p-0 overflow-hidden">
            <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--ui-border)' }}>
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-bdo-red" />
                <h3 className="text-lg font-semibold" style={{ color: 'var(--ui-text)' }}>
                  Feedback Entries {feedback.length > 0 && <span className="text-sm font-normal text-gray-400">({feedback.length})</span>}
                </h3>
              </div>
              {feedback.length > 0 && (
                <button onClick={exportFeedback} className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors">
                  <Download className="h-3.5 w-3.5" /> Download CSV
                </button>
              )}
            </div>

            {feedbackLoading ? (
              <div className="text-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-bdo-red mx-auto" /></div>
            ) : feedback.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="h-12 w-12 mx-auto mb-3" style={{ color: 'var(--ui-text-muted)' }} />
                <p style={{ color: 'var(--ui-text-muted)' }}>No feedback submitted for this selection.</p>
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: 'var(--ui-border)' }}>
                {feedback.map((f, i) => (
                  <div key={f.id} className="px-6 py-5">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <StarRating rating={f.rating} />
                        <span className={`text-sm font-bold ${f.rating * 2 >= 7 ? 'text-green-500' : f.rating * 2 >= 5 ? 'text-amber-500' : 'text-red-500'}`}>
                          {(f.rating * 2).toFixed(1)}/10
                        </span>
                      </div>
                      <div className="text-xs" style={{ color: 'var(--ui-text-muted)' }}>
                        Response #{i + 1} · {new Date(f.submittedAt).toLocaleDateString()}
                      </div>
                    </div>
                    {f.comments ? (
                      <p className="text-sm leading-relaxed mt-2 pl-1" style={{ color: 'var(--ui-text)' }}>&ldquo;{f.comments}&rdquo;</p>
                    ) : (
                      <p className="text-sm italic mt-2 pl-1" style={{ color: 'var(--ui-text-muted)' }}>No written comment</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Log Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="rounded-2xl shadow-2xl w-full max-w-xl max-h-[85vh] overflow-y-auto"
            style={{ background: 'var(--ui-surface)', border: '1px solid var(--ui-border)' }}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${getActionChip(selectedLog.action)}`}>
                    {selectedLog.action.replace(/_/g, ' ').toUpperCase()}
                  </span>
                </div>
                <button onClick={() => setSelectedLog(null)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  style={{ color: 'var(--ui-text-muted)' }}>
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {[
                    ['Admin', selectedLog.adminEmail],
                    ['Timestamp', new Date(selectedLog.timestamp).toLocaleString()],
                    selectedLog.ipAddress ? ['IP Address', selectedLog.ipAddress] : null,
                    selectedLog.userAgent ? ['Browser', selectedLog.userAgent.slice(0, 60) + '…'] : null,
                  ].filter((x): x is string[] => Boolean(x)).map(([label, val]) => (
                    <div key={label as string}>
                      <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--ui-text-muted)' }}>{label as string}</p>
                      <p className="text-sm break-all" style={{ color: 'var(--ui-text)' }}>{val as string}</p>
                    </div>
                  ))}
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--ui-text-muted)' }}>Action Details</p>
                  <div className="rounded-xl p-4 space-y-3" style={{ background: 'var(--ui-bg)', border: '1px solid var(--ui-border)' }}>
                    {renderDetails(selectedLog.details)}
                  </div>
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
