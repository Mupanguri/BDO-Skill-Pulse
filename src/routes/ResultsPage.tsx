 import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/contexts/AuthContext'
import { BarChart3, Users, Trophy, Clock, ChevronDown, CheckSquare, Square, AlertCircle } from 'lucide-react'
import FeedbackModal from '../lib/components/FeedbackModal'
import Breadcrumb from '../lib/components/Breadcrumb'
import LoadingSpinner from '../lib/components/LoadingSpinner'
import EmptyState from '../lib/components/EmptyState'
import Button from '../lib/components/Button'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { Bar, Line, Pie } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
)

interface QuizResponse {
  id: string
  score: number
  timeSpent: number
  completedAt: string
  answers: Record<string, string>
  user: {
    email: string
    department: string
  }
}

interface QuizSession {
  id: string
  name: string
  date: string
  questions: any[]
  responses: QuizResponse[]
}

interface DepartmentStats {
  department: string
  participants: number
  averageScore: number
  scores: number[]
  gradeDistribution: {
    distinction: number
    merit: number
    pass: number
    warning: number
    fail: number
  }
}

function ResultsPage() {
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const sessionId = searchParams.get('session')
  const isReviewMode = searchParams.get('review') === 'true'

  const [allSessions, setAllSessions] = useState<any[]>([])
  const [session, setSession] = useState<QuizSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'overview' | 'department' | 'grade' | 'compare'>('overview')
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all')
  const [selectedGrade, setSelectedGrade] = useState<string>('all')
  const [departmentStats, setDepartmentStats] = useState<DepartmentStats[]>([])
  const [showSessionDropdown, setShowSessionDropdown] = useState(false)
  const [compareSessions, setCompareSessions] = useState<string[]>([])
  const [showCompareDropdown, setShowCompareDropdown] = useState(false)
  const [sessionExpired] = useState(false)

  // Aggregate stats for all sessions
  const [aggregateStats, setAggregateStats] = useState({
    totalQuizzes: 0,
    totalParticipants: 0,
    totalResponses: 0,
    averageScore: 0,
    averageCompletionTime: 0,
    distinctionCount: 0,
    meritCount: 0,
    passCount: 0,
    warningCount: 0,
    failCount: 0
  })

  // Feedback modal state
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false)
  const [submittingFeedback, setSubmittingFeedback] = useState(false)

  useEffect(() => {
    // If no session ID, redirect to dashboard
    if (!sessionId) {
      navigate('/app/dashboard')
      return
    }
    
    fetchAllSessions()
  }, [navigate, sessionId])

  useEffect(() => {
    if (sessionId) {
      fetchSessionResults(sessionId)
    } else {
      setLoading(false)
    }
  }, [sessionId])

  useEffect(() => {
    if (session?.responses) {
      calculateDepartmentStats()

      // Check if current user just completed this quiz and show feedback modal
      if (user) {
        const userResponse = session.responses.find(r => r.user.email === user.email)
        if (userResponse && !feedbackSubmitted) {
          // Check if feedback was already submitted
          checkFeedbackStatus()
        }
      }
    }
  }, [session, user])

  const checkFeedbackStatus = async () => {
    if (!user || !sessionId) return

    try {
      const response = await fetch(`/api/feedback/check/${user.email}/${sessionId}`)
      if (response.ok) {
        const data = await response.json()
        if (!data.hasFeedback) {
          // Show feedback modal after a short delay
          setTimeout(() => {
            setShowFeedbackModal(true)
          }, 2000)
        } else {
          setFeedbackSubmitted(true)
        }
      }
    } catch (error) {
      console.error('Failed to check feedback status:', error)
    }
  }

  const handleFeedbackSubmit = async (rating: number, comments: string) => {
    if (!user || !session) return

    setSubmittingFeedback(true)

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userEmail: user.email,
          sessionId: session.id,
          rating: rating,
          comments: comments
        })
      })

      if (response.ok) {
        setFeedbackSubmitted(true)
        setShowFeedbackModal(false)
      } else {
        alert('Failed to submit feedback')
      }
    } catch (error) {
      console.error('Failed to submit feedback:', error)
      alert('Failed to submit feedback')
    } finally {
      setSubmittingFeedback(false)
    }
  }

  const fetchAllSessions = async () => {
    try {
      const response = await fetch('/api/sessions')
      if (response.ok) {
        const data = await response.json()
        setAllSessions(data)
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error)
    }
  }

  const calculateAggregateStats = () => {
    if (allSessions.length === 0) return

    let totalResponses = 0
    let totalScore = 0
    let totalTime = 0
    let distinctionCount = 0
    let meritCount = 0
    let passCount = 0
    let warningCount = 0
    let failCount = 0
    let uniqueParticipants = new Set<string>()

    allSessions.forEach(session => {
      const responses = session.responses || []
      totalResponses += responses.length

      responses.forEach((response: any) => {
        totalScore += response.score || 0
        totalTime += response.timeSpent || 0
        uniqueParticipants.add(response.user?.email || '')

        const score = response.score || 0
        if (score >= 70) distinctionCount++
        else if (score >= 60) meritCount++
        else if (score >= 45) passCount++
        else if (score >= 30) warningCount++
        else failCount++
      })
    })

    setAggregateStats({
      totalQuizzes: allSessions.length,
      totalParticipants: uniqueParticipants.size,
      totalResponses,
      averageScore: totalResponses > 0 ? Math.round(totalScore / totalResponses) : 0,
      averageCompletionTime: totalResponses > 0 ? Math.round(totalTime / totalResponses) : 0,
      distinctionCount,
      meritCount,
      passCount,
      warningCount,
      failCount
    })
  }

  // Update aggregate stats when allSessions changes
  useEffect(() => {
    if (allSessions.length > 0) {
      calculateAggregateStats()
    }
  }, [allSessions])

  const fetchSessionResults = async (id: string) => {
    try {
      // If in review mode and user is not admin, fetch only user's own response
      const url = isReviewMode && !user?.isAdmin
        ? `/api/sessions/${id}?userEmail=${user?.email}`
        : `/api/sessions/${id}`

      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setSession(data)
      } else {
        console.error('Failed to fetch session:', response.status)
        // Redirect to main results page if session not found
        navigate('/app/admin/results')
      }
    } catch (error) {
      console.error('Failed to fetch session results:', error)
      // Redirect to main results page on error
      navigate('/app/admin/results')
    } finally {
      setLoading(false)
    }
  }

  const calculateDepartmentStats = () => {
    if (!session?.responses) return

    const departments = [...new Set(session.responses.map(r => r.user.department))]
    const stats: DepartmentStats[] = departments.map(dept => {
      const deptResponses = session.responses.filter(r => r.user.department === dept)
      const scores = deptResponses.map(r => r.score)
      const averageScore = Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)

      const gradeDistribution = {
        distinction: scores.filter(s => s >= 70).length,
        merit: scores.filter(s => s >= 60 && s < 70).length,
        pass: scores.filter(s => s >= 45 && s < 60).length,
        warning: scores.filter(s => s >= 30 && s < 45).length,
        fail: scores.filter(s => s < 30).length
      }

      return {
        department: dept,
        participants: deptResponses.length,
        averageScore,
        scores,
        gradeDistribution
      }
    })

    setDepartmentStats(stats)
  }

  const getGradeFromScore = (score: number): string => {
    if (score >= 70) return 'Distinction'
    if (score >= 60) return 'Merit'
    if (score >= 45) return 'Pass'
    if (score >= 30) return 'Warning'
    return 'Fail'
  }

  const getFilteredResponses = () => {
    if (!session?.responses) return []

    let filtered = session.responses

    if (selectedDepartment !== 'all') {
      filtered = filtered.filter(r => r.user.department === selectedDepartment)
    }

    if (selectedGrade !== 'all') {
      filtered = filtered.filter(r => getGradeFromScore(r.score) === selectedGrade)
    }

    return filtered.sort((a, b) => b.score - a.score)
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
    return <LoadingSpinner text="Loading results..." />
  }

  if (!sessionId || !session) {
    const selectedSession = allSessions.find(s => s.id === sessionId)

    return (
      <div className="ui-page page-enter">
        {/* Breadcrumb */}
        <Breadcrumb items={[
          { label: 'Dashboard', href: '/app/admin' },
          { label: 'Results' }
        ]} />

        {/* Header */}
        <div className="ui-page-header mb-6">
          <div>
            <h1 className="ui-page-title">Quiz Results</h1>
            <p className="ui-page-subtitle">Select a quiz session to view detailed results and analytics</p>
          </div>
        </div>

        {/* Aggregate Stats Cards */}
        {allSessions.length > 0 && (
          <>
            {/* Overview Stats */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-bdo-navy mb-6">Overall Performance Overview</h2>
              <div className="ui-grid-stats mb-8">
                {/* Total Quizzes */}
                <div className="ui-card p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Total Quizzes</p>
                      <p className="text-3xl font-bold text-bdo-navy">{aggregateStats.totalQuizzes}</p>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                      <BarChart3 className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                </div>

                {/* Total Participants */}
                <div className="ui-card p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Unique Participants</p>
                      <p className="text-3xl font-bold text-bdo-navy">{aggregateStats.totalParticipants}</p>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                      <Users className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                </div>

                {/* Average Score */}
                <div className="ui-card p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Average Score</p>
                      <p className="text-3xl font-bold text-bdo-navy">{aggregateStats.averageScore}%</p>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                      <Trophy className="h-6 w-6 text-bdo-red" />
                    </div>
                  </div>
                </div>

                {/* Average Time */}
                <div className="ui-card p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Avg. Completion Time</p>
                      <p className="text-3xl font-bold text-bdo-navy">
                        {Math.floor(aggregateStats.averageCompletionTime / 60)}:{(aggregateStats.averageCompletionTime % 60).toString().padStart(2, '0')}
                      </p>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                      <Clock className="h-6 w-6 text-purple-600" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Grade Distribution */}
              <div className="ui-card-strong p-6">
                <h3 className="text-lg font-bold text-bdo-navy mb-4">Grade Distribution (All Quizzes)</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">{aggregateStats.distinctionCount}</p>
                    <p className="text-sm text-green-700">Distinction (70+)</p>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">{aggregateStats.meritCount}</p>
                    <p className="text-sm text-blue-700">Merit (60-69)</p>
                  </div>
                  <div className="text-center p-4 bg-yellow-50 rounded-lg">
                    <p className="text-2xl font-bold text-yellow-600">{aggregateStats.passCount}</p>
                    <p className="text-sm text-yellow-700">Pass (45-59)</p>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <p className="text-2xl font-bold text-orange-600">{aggregateStats.warningCount}</p>
                    <p className="text-sm text-orange-700">Warning (30-44)</p>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <p className="text-2xl font-bold text-red-600">{aggregateStats.failCount}</p>
                    <p className="text-sm text-red-700">Fail (0-29)</p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Session Selector */}
        <div className="ui-card-strong mb-6">
          <h2 className="text-xl font-bold text-bdo-navy mb-4">Select Quiz Session</h2>
          <div className="relative">
            <button
              onClick={() => setShowSessionDropdown(!showSessionDropdown)}
              className="w-full ui-field flex items-center justify-between"
            >
              <span>
                {selectedSession ? (
                  <>
                    <span className="font-medium">{selectedSession.name}</span>
                    <span className="text-gray-500 ml-2">
                      • {new Date(selectedSession.date).toLocaleDateString()}
                      • {selectedSession._count?.responses || 0} participants
                    </span>
                  </>
                ) : (
                  'Select a quiz session...'
                )}
              </span>
              <ChevronDown className={`h-5 w-5 transition-transform ${showSessionDropdown ? 'rotate-180' : ''}`} />
            </button>

            {showSessionDropdown && (
              <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-80 overflow-y-auto">
                {allSessions.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    No quiz sessions available
                  </div>
                ) : (
                  allSessions.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => {
                        navigate(`/app/admin/results?session=${s.id}`)
                        setShowSessionDropdown(false)
                      }}
                      className={`w-full text-left p-4 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-b-0 transition-colors ${s.id === sessionId ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                        }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-900 dark:text-gray-100">{s.name}</div>
                          <div className="text-sm text-gray-500 mt-1">
                            {new Date(s.date).toLocaleDateString()} at {s.time}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${s.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                            }`}>
                            {s.isActive ? 'Active' : 'Inactive'}
                          </div>
                          <div className="text-sm text-gray-500 mt-1">
                            {s._count?.responses || 0} participants
                          </div>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Recent Sessions Grid */}
        {allSessions.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-bdo-navy mb-4">Recent Quiz Sessions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {allSessions.slice(0, 6).map((s) => (
                <div
                  key={s.id}
                  onClick={() => navigate(`/app/admin/results?session=${s.id}`)}
                  className="ui-card p-4 cursor-pointer hover:shadow-lg transition-all hover:border-bdo-blue border-2 border-transparent hover:border-bdo-blue"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="font-semibold text-bdo-navy line-clamp-2">{s.name}</h4>
                    <span className={`text-xs px-2 py-1 rounded-full flex-shrink-0 ${s.isActive
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-600'
                      }`}>
                      {s.isActive ? 'Active' : 'Closed'}
                    </span>
                  </div>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      <span>{new Date(s.date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span>{s._count?.responses || 0} participants</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Trophy className="h-4 w-4" />
                      <span>{s.questions?.length || 0} questions</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // In review mode, filter to show only current user's responses
  const displayResponses = isReviewMode && user?.email
    ? session.responses?.filter((r: any) => r.user?.email === user.email)
    : session.responses

  const totalQuestions = session.questions?.length || 0
  const totalResponses = displayResponses?.length || 0
  const averageScore = totalResponses > 0
    ? Math.round(displayResponses.reduce((sum: number, r: any) => sum + r.score, 0) / totalResponses)
    : 0
  const averageTime = totalResponses > 0
    ? Math.round(displayResponses.reduce((sum: number, r: any) => sum + r.timeSpent, 0) / totalResponses)
    : 0

  // Chart data preparation
  const getChartData = () => {
    const filteredResponses = getFilteredResponses()

    switch (viewMode) {
      case 'department':
        return {
          labels: departmentStats.map(stat => stat.department),
          datasets: [{
            label: 'Average Score by Department',
            data: departmentStats.map(stat => stat.averageScore),
            backgroundColor: 'rgba(220, 38, 38, 0.6)',
            borderColor: 'rgba(220, 38, 38, 1)',
            borderWidth: 1,
          }]
        }

      case 'grade':
        const currentDept = departmentStats.find(stat => stat.department === selectedDepartment)
        if (!currentDept) return { labels: [], datasets: [] }

        return {
          labels: ['Distinction', 'Merit', 'Pass', 'Warning', 'Fail'],
          datasets: [{
            label: 'Grade Distribution',
            data: [
              currentDept.gradeDistribution.distinction,
              currentDept.gradeDistribution.merit,
              currentDept.gradeDistribution.pass,
              currentDept.gradeDistribution.warning,
              currentDept.gradeDistribution.fail
            ],
            backgroundColor: [
              'rgba(34, 197, 94, 0.6)',
              'rgba(59, 130, 246, 0.6)',
              'rgba(245, 158, 11, 0.6)',
              'rgba(251, 146, 60, 0.6)',
              'rgba(239, 68, 68, 0.6)'
            ],
            borderColor: [
              'rgba(34, 197, 94, 1)',
              'rgba(59, 130, 246, 1)',
              'rgba(245, 158, 11, 1)',
              'rgba(251, 146, 60, 1)',
              'rgba(239, 68, 68, 1)'
            ],
            borderWidth: 1,
          }]
        }

      default: // overview
        return {
          labels: filteredResponses.map((_, index) => `Rank ${index + 1}`),
          datasets: [{
            label: 'Individual Scores',
            data: filteredResponses.map(r => r.score),
            backgroundColor: 'rgba(220, 38, 38, 0.6)',
            borderColor: 'rgba(220, 38, 38, 1)',
            borderWidth: 1,
          }]
        }
    }
  }

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: viewMode === 'department' ? 'Performance by Department' :
          viewMode === 'grade' ? 'Grade Distribution' : 'Individual Performance'
      },
    },
    scales: viewMode !== 'grade' ? {
      y: {
        beginAtZero: true,
        max: 100,
        title: {
          display: true,
          text: 'Score (%)'
        }
      }
    } : undefined
  }

  // Chart colors for comparison
  const chartColors = [
    'rgba(220, 38, 38, 0.7)',
    'rgba(59, 130, 246, 0.7)',
    'rgba(34, 197, 94, 0.7)',
    'rgba(245, 158, 11, 0.7)',
    'rgba(139, 92, 246, 0.7)'
  ]

  // Comparison chart data preparation
  const getCompareChartData = () => {
    const labels = ['Avg Score', 'Pass Rate', 'Highest', 'Lowest']

    const datasets = compareSessions.map((sessionId, index) => {
      const sessionData = allSessions.find(s => s.id === sessionId)
      if (!sessionData) return null

      const responses = session?.responses || []
      const scores = responses.length > 0
        ? responses.map((r: QuizResponse) => r.score)
        : [aggregateStats.averageScore || 50]

      const avgScore = scores.reduce((a: number, b: number) => a + b, 0) / scores.length
      const passCount = scores.filter((s: number) => s >= 45).length
      const passRate = (passCount / scores.length) * 100
      const highest = Math.max(...scores)
      const lowest = Math.min(...scores)

      return {
        label: sessionData.name,
        data: [avgScore, passRate, highest, lowest],
        backgroundColor: chartColors[index % chartColors.length],
        borderColor: chartColors[index % chartColors.length],
        borderWidth: 2,
        tension: 0.3,
        fill: false
      }
    }).filter((d): d is NonNullable<typeof d> => d != null)

    return {
      labels,
      datasets
    }
  }

  const compareChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Session Comparison'
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        title: {
          display: true,
          text: 'Score / Rate (%)'
        }
      }
    }
  }

  return (
    <div className="ui-page page-enter">
      {/* Breadcrumb */}
      <Breadcrumb items={[
        { label: 'Dashboard', href: '/app/admin' },
        { label: 'Results' }
      ]} />

      {/* Header */}
      <div className="ui-page-header mb-6">
        <div>
          <h1 className="ui-page-title">{session.name}</h1>
          <p className="ui-page-subtitle">
            {new Date(session.date).toLocaleDateString()} • {totalQuestions} questions • {totalResponses} participants
          </p>
        </div>
      </div>

      {/* Review Mode - Show User's Answers */}
      {isReviewMode && session.questions && session.questions.map((question: any, qIndex: number) => {
        const userAnswer = displayResponses?.[0]?.answers?.[question.id]
        const isCorrect = userAnswer === question.correctAnswer

        return (
          <div key={question.id} className="ui-card-strong mb-4 p-4">
            <div className="flex items-start gap-3">
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {isCorrect ? '✓' : '✗'}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-bdo-navy mb-2">
                  Question {qIndex + 1}: {question.text}
                </h3>

                <div className="space-y-2 mb-3">
                  {question.options.map((option: string, optIndex: number) => {
                    const isSelected = userAnswer === String(optIndex)
                    const isCorrectOption = question.correctAnswer === optIndex

                    let optionClass = "p-3 rounded-lg border "
                    if (isCorrectOption) {
                      optionClass += "bg-green-50 border-green-500 text-green-700 "
                    } else if (isSelected && !isCorrectOption) {
                      optionClass += "bg-red-50 border-red-500 text-red-700 "
                    } else {
                      optionClass += "bg-gray-50 border-gray-200 "
                    }

                    return (
                      <div key={optIndex} className={optionClass}>
                        <span className="font-medium mr-2">{String.fromCharCode(65 + optIndex)}.</span>
                        {option}
                        {isSelected && <span className="ml-2 text-sm">(Your answer)</span>}
                        {isCorrectOption && <span className="ml-2 text-sm font-medium">(Correct)</span>}
                      </div>
                    )
                  })}
                </div>

                {/* Show reason for correct answer */}
                {question.correctAnswerReason && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3">
                    <p className="text-sm font-medium text-blue-700">Explanation:</p>
                    <p className="text-sm text-blue-600">{question.correctAnswerReason}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })}

      {/* Summary Stats - Responsive Grid */}
      <div className="ui-grid-stats mb-8">
        {/* Participants Card */}
        <div className="ui-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Participants</p>
              <p className="text-3xl font-bold text-bdo-navy">{totalResponses}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
              <Users className="h-6 w-6 text-blue-600" aria-hidden="true" />
            </div>
          </div>
        </div>

        {/* Average Score Card */}
        <div className="ui-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Average Score</p>
              <p className="text-3xl font-bold text-bdo-navy">{averageScore}%</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
              <Trophy className="h-6 w-6 text-bdo-red" aria-hidden="true" />
            </div>
          </div>
        </div>

        {/* Questions Card */}
        <div className="ui-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Questions</p>
              <p className="text-3xl font-bold text-bdo-navy">{totalQuestions}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
              <BarChart3 className="h-6 w-6 text-green-600" aria-hidden="true" />
            </div>
          </div>
        </div>

        {/* Average Time Card */}
        <div className="ui-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Avg. Time</p>
              <p className="text-3xl font-bold text-bdo-navy">
                {Math.floor(averageTime / 60)}:{(averageTime % 60).toString().padStart(2, '0')}
              </p>
            </div>
            <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
              <Clock className="h-6 w-6 text-purple-600" aria-hidden="true" />
            </div>
          </div>
        </div>
      </div>

      {/* View Mode and Filters */}
      <div className="ui-card-strong mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label htmlFor="view-mode" className="ui-label">View Mode</label>
            <select
              id="view-mode"
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value as 'overview' | 'department' | 'grade' | 'compare')}
              className="ui-field w-full"
            >
              <option value="overview">Overview</option>
              <option value="department">By Department</option>
              <option value="grade">Grade Distribution</option>
              <option value="compare">Compare Sessions</option>
            </select>
          </div>

          <div className="flex-1">
            <label htmlFor="department-filter" className="ui-label">Department</label>
            <select
              id="department-filter"
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="ui-field w-full"
            >
              <option value="all">All Departments</option>
              {departmentStats.map(stat => (
                <option key={stat.department} value={stat.department}>{stat.department}</option>
              ))}
            </select>
          </div>

          <div className="flex-1">
            <label htmlFor="grade-filter" className="ui-label">Grade</label>
            <select
              id="grade-filter"
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
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
        </div>
      </div>

      {/* Charts Section */}
      <div className="ui-card-strong mb-8">
        <h3 className="text-xl font-bold text-bdo-navy mb-4">
          {viewMode === 'compare' ? 'Session Comparison' : 'Performance Analytics'}
        </h3>

        {/* Compare Mode - Session Selection */}
        {viewMode === 'compare' && (
          <div className="mb-6">
            <div className="flex flex-wrap gap-4 items-center mb-4">
              <span className="text-sm font-medium text-gray-700">Select sessions to compare:</span>
              <div className="relative">
                <button
                  onClick={() => setShowCompareDropdown(!showCompareDropdown)}
                  className="ui-field flex items-center gap-2"
                >
                  <CheckSquare className="h-4 w-4" />
                  <span>{compareSessions.length > 0 ? `${compareSessions.length} selected` : 'Select sessions...'}</span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${showCompareDropdown ? 'rotate-180' : ''}`} />
                </button>

                {showCompareDropdown && (
                  <div className="absolute z-10 w-80 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                    {allSessions.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => {
                          if (compareSessions.includes(s.id)) {
                            setCompareSessions(prev => prev.filter(id => id !== s.id))
                          } else if (compareSessions.length < 5) {
                            setCompareSessions(prev => [...prev, s.id])
                          }
                        }}
                        disabled={!compareSessions.includes(s.id) && compareSessions.length >= 5}
                        className={`w-full text-left p-3 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-b-0 transition-colors flex items-center gap-2 ${compareSessions.includes(s.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                          } ${!compareSessions.includes(s.id) && compareSessions.length >= 5 ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {compareSessions.includes(s.id) ? (
                          <CheckSquare className="h-4 w-4 text-blue-600" />
                        ) : (
                          <Square className="h-4 w-4 text-gray-400" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 dark:text-gray-100 truncate">{s.name}</div>
                          <div className="text-xs text-gray-500">{new Date(s.date).toLocaleDateString()}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {compareSessions.length > 0 && (
                <button
                  onClick={() => setCompareSessions([])}
                  className="text-sm text-red-600 hover:text-red-800"
                >
                  Clear selection
                </button>
              )}
            </div>
          </div>
        )}

        <div className="h-64 sm:h-80 lg:h-96">
          {viewMode === 'compare' ? (
            compareSessions.length > 1 ? (
              <Line data={getCompareChartData()} options={compareChartOptions} />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <BarChart3 className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium">Select at least 2 sessions to compare</p>
                  <p className="text-sm text-gray-400 mt-1">Maximum 5 sessions can be compared</p>
                </div>
              </div>
            )
          ) : viewMode === 'grade' ? (
            <Pie data={getChartData()} options={chartOptions} />
          ) : (
            <Bar data={getChartData()} options={chartOptions} />
          )}
        </div>
      </div>

      {/* Department Stats Table */}
      {viewMode === 'department' && departmentStats.length > 0 && (
        <div className="ui-card-strong mb-8">
          <h3 className="text-xl font-bold text-bdo-navy mb-4">Department Performance Summary</h3>
          <div className="ui-table-wrap">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Participants</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Score</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Grade Distribution</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {departmentStats.map((stat) => (
                  <tr key={stat.department} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{stat.department}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{stat.participants}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{stat.averageScore}%</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">
                        <span className="mr-2">D:{stat.gradeDistribution.distinction}</span>
                        <span className="mr-2">M:{stat.gradeDistribution.merit}</span>
                        <span className="mr-2">P:{stat.gradeDistribution.pass}</span>
                        <span className="mr-2">W:{stat.gradeDistribution.warning}</span>
                        <span>F:{stat.gradeDistribution.fail}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Filtered Results */}
      <div className="ui-card-strong">
        <h3 className="text-xl font-bold text-bdo-navy mb-4">
          Individual Results
          {(selectedDepartment !== 'all' || selectedGrade !== 'all') &&
            <span className="text-base font-normal text-gray-600 ml-2">
              ({getFilteredResponses().length} results)
            </span>
          }
        </h3>

        {getFilteredResponses().length === 0 ? (
          <EmptyState
            title="No results found"
            description="No results match the selected filters. Try adjusting your filter criteria."
          />
        ) : (
          <div className="space-y-3">
            {getFilteredResponses().map((response, index) => (
              <div key={response.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors gap-3">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${index === 0 ? 'bg-yellow-500' :
                    index === 1 ? 'bg-gray-400' :
                      index === 2 ? 'bg-amber-600' :
                        'bg-bdo-blue'
                    }`}>
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-bdo-navy truncate">{response.user.email}</p>
                    <p className="text-sm text-gray-600">{response.user.department}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 sm:text-right">
                  <div>
                    <p className="text-2xl font-bold text-bdo-navy">{response.score}%</p>
                    <p className="text-xs text-gray-500">
                      {new Date(response.completedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className={`ui-pill ${getGradeFromScore(response.score) === 'Distinction' ? 'bg-green-100 text-green-700' :
                    getGradeFromScore(response.score) === 'Merit' ? 'bg-blue-100 text-blue-700' :
                      getGradeFromScore(response.score) === 'Pass' ? 'bg-yellow-100 text-yellow-700' :
                        getGradeFromScore(response.score) === 'Warning' ? 'bg-orange-100 text-orange-700' :
                          'bg-red-100 text-red-700'
                    }`}>
                    {getGradeFromScore(response.score)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Feedback Modal */}
      <FeedbackModal
        isOpen={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
        onSubmit={handleFeedbackSubmit}
        quizName={session?.name || ''}
        loading={submittingFeedback}
      />
    </div>
  )
}

export default ResultsPage

