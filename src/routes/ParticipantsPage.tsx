import { useState, useEffect } from 'react'
import { Users, Download, AlertTriangle, Eye, Search, X, Shield, UserMinus, Lock, AlertCircle, EyeOff } from 'lucide-react'
import Button from '../lib/components/Button'
import Breadcrumb from '../lib/components/Breadcrumb'
import LoadingSpinner from '../lib/components/LoadingSpinner'
import EmptyState from '../lib/components/EmptyState'
import { useAuth } from '../lib/contexts/AuthContext'

interface UserPerformance {
  email: string
  department: string
  isAdmin: boolean
  quizzesTaken: number
  averageScore: number
  totalScore: number
  grade: 'Distinction' | 'Merit' | 'Pass' | 'Warning' | 'Fail'
  trend: 'improving' | 'stable' | 'declining'
  lastQuizDate: string
  submissions: Array<{
    sessionId: string
    sessionName: string
    score: number
    completedAt: string
  }>
}

interface VerifyState {
  open: boolean
  email: string
  password: string
  showPassword: boolean
  loading: boolean
  error: string
}

function ParticipantsPage() {
  const [participants, setParticipants] = useState<UserPerformance[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<UserPerformance | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterGrade, setFilterGrade] = useState<string>('all')
  const [filterDepartment, setFilterDepartment] = useState<string>('all')
  const [verify, setVerify] = useState<VerifyState>({
    open: false, email: '', password: '', showPassword: false, loading: false, error: ''
  })
  const { user } = useAuth()

  useEffect(() => {
    fetchParticipants()
  }, [])

  const fetchParticipants = async () => {
    try {
      const usersResponse = await fetch('/api/users', { credentials: 'include' })
      const sessionsResponse = await fetch('/api/sessions', { credentials: 'include' })

      if (usersResponse.ok && sessionsResponse.ok) {
        const users = await usersResponse.json()
        const sessions = await sessionsResponse.json()

        const participantsData = await Promise.all(
          users.map(async (u: any) => {
            const submissionsResponse = await fetch(`/api/user/${u.email}/submissions`, { credentials: 'include' })
            if (submissionsResponse.ok) {
              const submissions = await submissionsResponse.json()

              const sessionScores = new Map()
              submissions.forEach((sub: any) => {
                const currentHighest = sessionScores.get(sub.sessionId) || 0
                if (sub.score > currentHighest) sessionScores.set(sub.sessionId, sub.score)
              })

              const highestScores = Array.from(sessionScores.values()) as number[]
              const totalScore = highestScores.reduce((sum, score) => sum + score, 0)
              const averageScore = highestScores.length > 0 ? Math.round(totalScore / highestScores.length) : 0

              let grade: UserPerformance['grade']
              if (averageScore >= 70) grade = 'Distinction'
              else if (averageScore >= 60) grade = 'Merit'
              else if (averageScore >= 45) grade = 'Pass'
              else if (averageScore >= 30) grade = 'Warning'
              else grade = 'Fail'

              const trend: UserPerformance['trend'] = submissions.length >= 2
                ? (submissions[submissions.length - 1].score > submissions[submissions.length - 2].score ? 'improving'
                  : submissions[submissions.length - 1].score < submissions[submissions.length - 2].score ? 'declining' : 'stable')
                : 'stable'

              const submissionsWithNames = submissions.map((sub: any) => {
                const session = sessions.find((s: any) => s.id === sub.sessionId)
                return { ...sub, sessionName: session ? session.name : 'Unknown Session' }
              })

              return {
                email: u.email,
                department: u.department,
                isAdmin: u.isAdmin || false,
                quizzesTaken: submissions.length,
                averageScore,
                totalScore,
                grade,
                trend,
                lastQuizDate: submissions.length > 0 ? submissions[submissions.length - 1].completedAt : '',
                submissions: submissionsWithNames
              }
            }
            return null
          })
        )

        setParticipants(participantsData.filter(Boolean))
      }
    } catch (error) {
      console.error('Failed to fetch participants:', error)
    } finally {
      setLoading(false)
    }
  }

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'Distinction': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      case 'Merit': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
      case 'Pass': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
      case 'Warning': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
      case 'Fail': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return '↗️'
      case 'declining': return '↘️'
      default: return '→'
    }
  }

  let filteredParticipants = participants
  if (searchQuery.trim()) {
    filteredParticipants = filteredParticipants.filter(p =>
      p.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.department.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }
  if (filterGrade !== 'all') filteredParticipants = filteredParticipants.filter(p => p.grade === filterGrade)
  if (filterDepartment !== 'all') filteredParticipants = filteredParticipants.filter(p => p.department === filterDepartment)

  const departments = [...new Set(participants.map(p => p.department))].sort()

  const handleWarnUser = async (userEmail: string) => {
    try {
      const response = await fetch(`/api/user/${userEmail}/warn`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Performance flagged - improvement needed', adminEmail: user?.email || 'admin@bdo.co.zw' })
      })
      if (response.ok) alert(`Warning sent to ${userEmail}`)
      else alert('Failed to send warning')
    } catch {
      alert('Error sending warning')
    }
  }

  const openElevateVerify = (email: string) => {
    setVerify({ open: true, email, password: '', showPassword: false, loading: false, error: '' })
  }

  const handleVerifyAndElevate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!verify.password) return
    setVerify(v => ({ ...v, loading: true, error: '' }))

    try {
      const pwRes = await fetch('/api/verify-password', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: verify.password })
      })

      if (!pwRes.ok) {
        const data = await pwRes.json()
        setVerify(v => ({ ...v, loading: false, error: data.error || 'Incorrect password' }))
        return
      }

      const elevateRes = await fetch(`/api/user/${verify.email}/elevate`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminEmail: user?.email || 'admin@bdo.co.zw' })
      })

      if (elevateRes.ok) {
        setVerify(v => ({ ...v, open: false }))
        alert(`${verify.email} has been elevated to administrator status`)
        fetchParticipants()
        setSelectedUser(null)
      } else {
        const error = await elevateRes.json()
        setVerify(v => ({ ...v, loading: false, error: error.error || 'Failed to elevate user' }))
      }
    } catch {
      setVerify(v => ({ ...v, loading: false, error: 'Network error. Please try again.' }))
    }
  }

  const handleDemoteUser = async (userEmail: string) => {
    if (!confirm(`Are you sure you want to remove ${userEmail} from administrator status?`)) return
    try {
      const response = await fetch(`/api/user/${userEmail}/demote`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Admin demotion' })
      })
      if (response.ok) {
        alert(`${userEmail} has been removed from administrator status`)
        fetchParticipants()
        setSelectedUser(null)
      } else {
        const error = await response.json()
        alert(`Failed to demote user: ${error.error || 'Unknown error'}`)
      }
    } catch {
      alert('Error demoting user')
    }
  }

  const exportToExcel = () => {
    const csvData = [
      ['Email', 'Department', 'Quizzes Taken', 'Average Score', 'Grade', 'Trend', 'Last Quiz Date'],
      ...filteredParticipants.map(p => [
        p.email, p.department, p.quizzesTaken, p.averageScore, p.grade, p.trend,
        p.lastQuizDate ? new Date(p.lastQuizDate).toLocaleDateString() : ''
      ])
    ]
    const csvContent = csvData.map(row => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'participants_performance.csv'
    a.click()
    window.URL.revokeObjectURL(url)
  }

  if (loading) return <LoadingSpinner text="Loading participants data..." />

  return (
    <div className="ui-page page-enter">
      <Breadcrumb items={[{ label: 'Dashboard', href: '/app/admin' }, { label: 'Participants' }]} />

      <div className="ui-page-header mb-6">
        <div>
          <h1 className="ui-page-title">Participants Performance</h1>
          <p className="ui-page-subtitle">{filteredParticipants.length} participants</p>
        </div>
        <Button onClick={exportToExcel} variant="secondary" size="sm">
          <Download className="h-4 w-4 mr-2" aria-hidden="true" />
          Export CSV
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="ui-card-strong mb-6">
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by email or department..."
              className="ui-field w-full pl-10 pr-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="ui-label">Filter by Grade</label>
              <select value={filterGrade} onChange={(e) => setFilterGrade(e.target.value)} className="ui-field w-full">
                <option value="all">All Grades</option>
                <option value="Distinction">Distinction (70-100)</option>
                <option value="Merit">Merit (60-69)</option>
                <option value="Pass">Pass (45-59)</option>
                <option value="Warning">Warning (30-44)</option>
                <option value="Fail">Fail (0-29)</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="ui-label">Filter by Department</label>
              <select value={filterDepartment} onChange={(e) => setFilterDepartment(e.target.value)} className="ui-field w-full">
                <option value="all">All Departments</option>
                {departments.map(dept => <option key={dept} value={dept}>{dept}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Participants Table */}
      {filteredParticipants.length === 0 ? (
        <EmptyState
          icon={<Users className="h-full w-full" />}
          title="No participants found"
          description="No participants match your current search and filter criteria."
        />
      ) : (
        <div className="ui-card-strong">
          <h2 className="text-xl font-bold" style={{ color: 'var(--ui-text)' }}>Performance Overview</h2>

          <div className="ui-table-wrap mt-4">
            <table className="min-w-full divide-y" style={{ borderColor: 'var(--ui-border)' }}>
              <thead style={{ background: 'var(--ui-surface-muted)' }}>
                <tr>
                  {['User', 'Department', 'Quizzes', 'Score', 'Grade', 'Trend', 'Actions'].map((h, i) => (
                    <th key={h} scope="col" className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${i > 0 && i < 3 ? 'hidden sm:table-cell' : ''} ${i === 3 || i === 4 ? 'hidden md:table-cell' : ''} ${i === 5 ? 'hidden lg:table-cell' : ''} ${i === 6 ? 'text-right' : ''}`} style={{ color: 'var(--ui-text-muted)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--ui-border)' }}>
                {filteredParticipants.map((participant) => (
                  <tr key={participant.email} className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium truncate max-w-xs" style={{ color: 'var(--ui-text)' }}>{participant.email}</div>
                    </td>
                    <td className="hidden sm:table-cell px-6 py-4">
                      <div className="text-sm" style={{ color: 'var(--ui-text-muted)' }}>{participant.department}</div>
                    </td>
                    <td className="hidden md:table-cell px-6 py-4">
                      <div className="text-sm font-medium" style={{ color: 'var(--ui-text)' }}>{participant.quizzesTaken}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-bold" style={{ color: 'var(--ui-text)' }}>{participant.averageScore}%</div>
                    </td>
                    <td className="hidden md:table-cell px-6 py-4">
                      <span className={`ui-pill ${getGradeColor(participant.grade)}`}>{participant.grade}</span>
                    </td>
                    <td className="hidden lg:table-cell px-6 py-4">
                      <div className="text-lg">{getTrendIcon(participant.trend)}</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button size="sm" variant="outline" onClick={() => setSelectedUser(participant)}>
                        <Eye className="h-4 w-4 sm:mr-1" />
                        <span className="hidden sm:inline">View</span>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Password Verify Modal (Elevate to Admin) */}
      {verify.open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-4">
          <div className="rounded-2xl shadow-2xl w-full max-w-sm p-8" style={{ background: 'var(--ui-surface)' }}>
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-14 h-14 rounded-full flex items-center justify-center mb-3" style={{ background: 'rgba(204,34,0,0.12)' }}>
                <Lock className="h-7 w-7 text-bdo-red" />
              </div>
              <h2 className="text-xl font-bold" style={{ color: 'var(--ui-text)' }}>Confirm Identity</h2>
              <p className="text-sm mt-1" style={{ color: 'var(--ui-text-muted)' }}>
                Enter your password to elevate <span className="font-medium" style={{ color: 'var(--ui-text)' }}>{verify.email}</span> to Admin
              </p>
            </div>
            <form onSubmit={handleVerifyAndElevate} className="space-y-4">
              <div className="relative">
                <input
                  type={verify.showPassword ? 'text' : 'password'}
                  value={verify.password}
                  onChange={e => setVerify(v => ({ ...v, password: e.target.value }))}
                  placeholder="Your account password"
                  autoFocus
                  className="w-full px-4 py-3 pr-11 rounded-lg text-sm border focus:outline-none focus:ring-2 focus:ring-bdo-red"
                  style={{ background: 'var(--ui-bg)', borderColor: 'var(--ui-border)', color: 'var(--ui-text)' }}
                />
                <button
                  type="button"
                  onClick={() => setVerify(v => ({ ...v, showPassword: !v.showPassword }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {verify.showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {verify.error && (
                <div className="flex items-center gap-2 text-sm text-red-500">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {verify.error}
                </div>
              )}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setVerify(v => ({ ...v, open: false }))}
                  className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors border"
                  style={{ borderColor: 'var(--ui-border)', color: 'var(--ui-text)' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={verify.loading || !verify.password}
                  className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-60 transition-colors"
                  style={{ background: 'linear-gradient(135deg, #cc2200, #e63300)' }}
                >
                  {verify.loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Verifying…
                    </span>
                  ) : 'Elevate to Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Details Modal */}
      {selectedUser && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedUser(null)}
        >
          <div
            className="rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
            style={{ background: 'var(--ui-surface)' }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            {/* Modal Header */}
            <div className="sticky top-0 z-10 px-6 py-4 flex items-center justify-between border-b" style={{ background: 'var(--ui-surface)', borderColor: 'var(--ui-border)' }}>
              <h2 className="text-xl font-bold" style={{ color: 'var(--ui-text)' }}>User Details</h2>
              <button
                onClick={() => setSelectedUser(null)}
                className="p-2 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
                style={{ color: 'var(--ui-text-muted)' }}
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="px-6 py-6 space-y-6">
              {/* User Info */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--ui-text-muted)' }}>User Information</h3>
                <div className="rounded-xl p-4 space-y-3" style={{ background: 'var(--ui-bg)', border: '1px solid var(--ui-border)' }}>
                  <div className="flex justify-between items-center">
                    <span className="text-sm" style={{ color: 'var(--ui-text-muted)' }}>Email</span>
                    <span className="text-sm font-semibold" style={{ color: 'var(--ui-text)' }}>{selectedUser.email}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm" style={{ color: 'var(--ui-text-muted)' }}>Department</span>
                    <span className="text-sm font-semibold" style={{ color: 'var(--ui-text)' }}>{selectedUser.department}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm" style={{ color: 'var(--ui-text-muted)' }}>Role</span>
                    <span className={`ui-pill text-xs ${selectedUser.isAdmin ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}`}>
                      {selectedUser.isAdmin ? 'Admin' : 'User'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Performance Stats */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--ui-text-muted)' }}>Performance</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Quizzes Taken', value: String(selectedUser.quizzesTaken) },
                    { label: 'Average Score', value: `${selectedUser.averageScore}%` },
                    { label: 'Grade', value: selectedUser.grade, badge: true },
                    { label: 'Trend', value: getTrendIcon(selectedUser.trend), emoji: true }
                  ].map(stat => (
                    <div key={stat.label} className="rounded-xl p-4" style={{ background: 'var(--ui-bg)', border: '1px solid var(--ui-border)' }}>
                      <p className="text-xs mb-2" style={{ color: 'var(--ui-text-muted)' }}>{stat.label}</p>
                      {stat.badge ? (
                        <span className={`ui-pill text-xs ${getGradeColor(stat.value)}`}>{stat.value}</span>
                      ) : stat.emoji ? (
                        <p className="text-2xl">{stat.value}</p>
                      ) : (
                        <p className="text-2xl font-bold" style={{ color: 'var(--ui-text)' }}>{stat.value}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Admin Actions */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--ui-text-muted)' }}>Admin Actions</h3>
                <div className="flex flex-wrap gap-3">
                  {!selectedUser.isAdmin ? (
                    <Button size="sm" variant="secondary" onClick={() => openElevateVerify(selectedUser.email)}>
                      <Shield className="h-4 w-4 mr-2" />
                      Elevate to Admin
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDemoteUser(selectedUser.email)}
                      className="text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <UserMinus className="h-4 w-4 mr-2" />
                      Remove Admin
                    </Button>
                  )}
                  {(selectedUser.grade === 'Warning' || selectedUser.grade === 'Fail') && (
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => { handleWarnUser(selectedUser.email); setSelectedUser(null) }}
                    >
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Send Warning
                    </Button>
                  )}
                </div>
              </div>

              {/* Quiz History */}
              {selectedUser.submissions.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--ui-text-muted)' }}>Quiz History</h3>
                  <div className="space-y-2">
                    {selectedUser.submissions.map((submission: any, idx: number) => (
                      <div key={submission.id ?? idx} className="flex justify-between items-center p-3 rounded-lg" style={{ background: 'var(--ui-bg)', border: '1px solid var(--ui-border)' }}>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: 'var(--ui-text)' }}>{submission.sessionName}</p>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--ui-text-muted)' }}>
                            {new Date(submission.completedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <span className="text-sm font-bold ml-3" style={{ color: 'var(--ui-text)' }}>{submission.score}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default ParticipantsPage
