import { useState, useEffect } from 'react'
import { Users, Award, TrendingUp, TrendingDown, Minus, Download, AlertTriangle, Eye, UserX, User, Search, X } from 'lucide-react'
import Button from '../lib/components/Button'
import Breadcrumb from '../lib/components/Breadcrumb'
import LoadingSpinner from '../lib/components/LoadingSpinner'
import EmptyState from '../lib/components/EmptyState'
import { useAuth } from '../lib/contexts/AuthContext'

interface UserPerformance {
  email: string
  department: string
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

function ParticipantsPage() {
  const [participants, setParticipants] = useState<UserPerformance[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<UserPerformance | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterGrade, setFilterGrade] = useState<string>('all')
  const [filterDepartment, setFilterDepartment] = useState<string>('all')
  const { accessToken } = useAuth()

  useEffect(() => {
    fetchParticipants()
  }, [accessToken])

  const fetchParticipants = async () => {
    try {
      // Get all users and their submissions
      const usersResponse = await fetch('http://localhost:3001/api/users', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })
      const sessionsResponse = await fetch('http://localhost:3001/api/sessions', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })

      if (usersResponse.ok && sessionsResponse.ok) {
        const users = await usersResponse.json()
        const sessions = await sessionsResponse.json()

        // Calculate performance for each user
        const participantsData = await Promise.all(
          users.map(async (user: any) => {
            const submissionsResponse = await fetch(`http://localhost:3001/api/user/${user.email}/submissions`, {
              headers: {
                'Authorization': `Bearer ${accessToken}`
              }
            })
            if (submissionsResponse.ok) {
              const submissions = await submissionsResponse.json()

              // Group submissions by session and use highest score per session
              const sessionScores = new Map()
              submissions.forEach((sub: any) => {
                const currentHighest = sessionScores.get(sub.sessionId) || 0
                if (sub.score > currentHighest) {
                  sessionScores.set(sub.sessionId, sub.score)
                }
              })

              // Calculate performance metrics using highest scores
              const highestScores = Array.from(sessionScores.values())
              const totalScore = highestScores.reduce((sum: number, score: number) => sum + score, 0)
              const averageScore = highestScores.length > 0 ? Math.round(totalScore / highestScores.length) : 0

              // Determine grade based on average score
              let grade: UserPerformance['grade']
              if (averageScore >= 70) grade = 'Distinction'
              else if (averageScore >= 60) grade = 'Merit'
              else if (averageScore >= 45) grade = 'Pass'
              else if (averageScore >= 30) grade = 'Warning'
              else grade = 'Fail'

              // Calculate trend (simplified - could be more sophisticated)
              const trend: UserPerformance['trend'] = submissions.length >= 2 ?
                (submissions[submissions.length - 1].score > submissions[submissions.length - 2].score ? 'improving' :
                 submissions[submissions.length - 1].score < submissions[submissions.length - 2].score ? 'declining' : 'stable') : 'stable'

              // Add session names to submissions
              const submissionsWithNames = submissions.map((sub: any) => {
                const session = sessions.find((s: any) => s.id === sub.sessionId)
                return {
                  ...sub,
                  sessionName: session ? session.name : 'Unknown Session'
                }
              })

              return {
                email: user.email,
                department: user.department,
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
      case 'Distinction': return 'bg-green-100 text-green-800'
      case 'Merit': return 'bg-blue-100 text-blue-800'
      case 'Pass': return 'bg-yellow-100 text-yellow-800'
      case 'Warning': return 'bg-orange-100 text-orange-800'
      case 'Fail': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return '↗️'
      case 'declining': return '↘️'
      default: return '→'
    }
  }

  // Apply filters (search, grade, department)
  let filteredParticipants = participants

  // Search filter
  if (searchQuery.trim()) {
    filteredParticipants = filteredParticipants.filter(p =>
      p.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.department.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }

  // Grade filter
  if (filterGrade !== 'all') {
    filteredParticipants = filteredParticipants.filter(p => p.grade === filterGrade)
  }

  // Department filter
  if (filterDepartment !== 'all') {
    filteredParticipants = filteredParticipants.filter(p => p.department === filterDepartment)
  }

  // Get unique departments for filter dropdown
  const departments = [...new Set(participants.map(p => p.department))].sort()

  const handleWarnUser = async (userEmail: string) => {
    try {
      const response = await fetch(`http://localhost:3001/api/user/${userEmail}/warn`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          reason: 'Performance flagged - improvement needed',
          adminEmail: 'admin@bdo.co.zw' // In production, get from auth context
        })
      })

      if (response.ok) {
        alert(`Warning sent to ${userEmail}`)
        // Could refresh data here if needed
      } else {
        alert('Failed to send warning')
      }
    } catch (error) {
      console.error('Error sending warning:', error)
      alert('Error sending warning')
    }
  }

  const handleElevateUser = async (userEmail: string) => {
    if (!confirm(`Are you sure you want to elevate ${userEmail} to administrator status? This cannot be undone.`)) {
      return
    }

    try {
      const response = await fetch(`http://localhost:3001/api/user/${userEmail}/elevate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          adminEmail: 'admin@bdo.co.zw' // In production, get from auth context
        })
      })

      if (response.ok) {
        alert(`${userEmail} has been elevated to administrator status`)
        // Refresh the participants list to update the UI
        fetchParticipants()
      } else {
        const error = await response.json()
        alert(`Failed to elevate user: ${error.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error elevating user:', error)
      alert('Error elevating user')
    }
  }

  const exportToExcel = () => {
    // Simple CSV export for now (could be enhanced to actual Excel)
    const csvData = [
      ['Email', 'Department', 'Quizzes Taken', 'Average Score', 'Grade', 'Trend', 'Last Quiz Date'],
      ...filteredParticipants.map(p => [
        p.email,
        p.department,
        p.quizzesTaken,
        p.averageScore,
        p.grade,
        p.trend,
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

  if (loading) {
    return <LoadingSpinner text="Loading participants data..." />
  }

  return (
    <div className="ui-page page-enter">
      {/* Breadcrumb */}
      <Breadcrumb items={[
        { label: 'Dashboard', href: '/admin' },
        { label: 'Participants' }
      ]} />

      {/* Header */}
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
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" aria-hidden="true" />
            <input
              type="text"
              placeholder="Search by email or department..."
              className="ui-field w-full pl-10 pr-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label="Clear search"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label htmlFor="filter-grade" className="ui-label">Filter by Grade</label>
              <select
                id="filter-grade"
                value={filterGrade}
                onChange={(e) => setFilterGrade(e.target.value)}
                className="ui-field w-full"
              >
                <option value="all">All Grades</option>
                <option value="Distinction">Distinction (70-100)</option>
                <option value="Merit">Merit (60-69)</option>
                <option value="Pass">Pass (45-59)</option>
                <option value="Warning">Warning (30-44)</option>
                <option value="Fail">Fail (0-29)</option>
              </select>
            </div>

            <div className="flex-1">
              <label htmlFor="filter-department" className="ui-label">Filter by Department</label>
              <select
                id="filter-department"
                value={filterDepartment}
                onChange={(e) => setFilterDepartment(e.target.value)}
                className="ui-field w-full"
              >
                <option value="all">All Departments</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
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
          <h2 className="text-xl font-bold text-bdo-navy mb-4">Performance Overview</h2>

          <div className="ui-table-wrap">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="sticky left-0 z-10 bg-gray-50 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                  <th scope="col" className="hidden sm:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                  <th scope="col" className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quizzes</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                  <th scope="col" className="hidden lg:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Grade</th>
                  <th scope="col" className="hidden lg:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trend</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredParticipants.map((participant) => (
                  <tr key={participant.email} className="hover:bg-gray-50 transition-colors">
                    <td className="sticky left-0 z-10 bg-white px-6 py-4">
                      <div className="text-sm font-medium text-bdo-navy truncate max-w-xs">{participant.email}</div>
                    </td>
                    <td className="hidden sm:table-cell px-6 py-4">
                      <div className="text-sm text-gray-600">{participant.department}</div>
                    </td>
                    <td className="hidden md:table-cell px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{participant.quizzesTaken}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-bold text-bdo-navy">{participant.averageScore}%</div>
                    </td>
                    <td className="hidden lg:table-cell px-6 py-4">
                      <span className={`ui-pill ${getGradeColor(participant.grade)}`}>
                        {participant.grade}
                      </span>
                    </td>
                    <td className="hidden lg:table-cell px-6 py-4">
                      <div className="text-lg">{getTrendIcon(participant.trend)}</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedUser(participant)}
                        aria-label={`View details for ${participant.email}`}
                      >
                        <Eye className="h-4 w-4 sm:mr-1" aria-hidden="true" />
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

      {/* User Details Modal */}
      {selectedUser && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-fade-in"
          onClick={() => setSelectedUser(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-zoom-in"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="user-details-title"
          >
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
              <h2 id="user-details-title" className="text-xl font-bold text-bdo-navy">
                User Details
              </h2>
              <button
                onClick={() => setSelectedUser(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-lg"
                aria-label="Close dialog"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="px-6 py-6 space-y-6">
              {/* User Info */}
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">User Information</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Email:</span>
                    <span className="font-semibold text-bdo-navy">{selectedUser.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Department:</span>
                    <span className="font-semibold">{selectedUser.department}</span>
                  </div>
                </div>
              </div>

              {/* Performance Stats */}
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Performance</h3>
                <div className="ui-grid-stats">
                  <div className="ui-card p-4">
                    <p className="text-xs text-gray-600 mb-1">Quizzes Taken</p>
                    <p className="text-2xl font-bold text-bdo-navy">{selectedUser.quizzesTaken}</p>
                  </div>
                  <div className="ui-card p-4">
                    <p className="text-xs text-gray-600 mb-1">Average Score</p>
                    <p className="text-2xl font-bold text-bdo-navy">{selectedUser.averageScore}%</p>
                  </div>
                  <div className="ui-card p-4">
                    <p className="text-xs text-gray-600 mb-1">Grade</p>
                    <span className={`ui-pill ${getGradeColor(selectedUser.grade)}`}>
                      {selectedUser.grade}
                    </span>
                  </div>
                  <div className="ui-card p-4">
                    <p className="text-xs text-gray-600 mb-1">Trend</p>
                    <p className="text-2xl">{getTrendIcon(selectedUser.trend)}</p>
                  </div>
                </div>
              </div>

              {/* Admin Actions */}
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Admin Actions</h3>
                <div className="flex flex-wrap gap-3">
                  {!selectedUser.email.includes('admin') && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleElevateUser(selectedUser.email)}
                    >
                      <User className="h-4 w-4 mr-2" aria-hidden="true" />
                      Elevate to Admin
                    </Button>
                  )}
                  {(selectedUser.grade === 'Warning' || selectedUser.grade === 'Fail') && (
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => {
                        handleWarnUser(selectedUser.email)
                        setSelectedUser(null)
                      }}
                    >
                      <AlertTriangle className="h-4 w-4 mr-2" aria-hidden="true" />
                      Send Warning
                    </Button>
                  )}
                </div>
              </div>

              {/* Quiz History */}
              {selectedUser.submissions.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Quiz History</h3>
                  <div className="space-y-2">
                    {selectedUser.submissions.map((submission: any) => (
                      <div key={submission.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-bdo-navy truncate">{submission.sessionName}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(submission.completedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <span className="text-sm font-bold text-bdo-navy ml-3">{submission.score}%</span>
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
