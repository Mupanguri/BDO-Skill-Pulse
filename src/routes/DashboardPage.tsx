import { useState, useEffect } from 'react'
import { useAuth } from '../lib/contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { Calendar, Clock, FileText, Users, CheckCircle } from 'lucide-react'
import Button from '../lib/components/Button'
import LoadingSpinner from '../lib/components/LoadingSpinner'
import EmptyState from '../lib/components/EmptyState'

function CountdownTimer({ targetTime, onComplete }: { targetTime: number, onComplete: () => void }) {
  const [timeLeft, setTimeLeft] = useState(targetTime - Date.now())

  useEffect(() => {
    const timer = setInterval(() => {
      const remaining = targetTime - Date.now()
      setTimeLeft(remaining)

      if (remaining <= 0) {
        clearInterval(timer)
        onComplete()
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [targetTime, onComplete])

  const minutes = Math.floor(timeLeft / (1000 * 60))
  const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000)

  if (timeLeft <= 0) return null

  return (
    <div className="text-center">
      <div className="text-sm font-medium text-orange-600">
        Retake available in:
      </div>
      <div className="text-lg font-bold text-orange-700">
        {minutes}:{seconds.toString().padStart(2, '0')}
      </div>
    </div>
  )
}

interface Session {
  id: string
  name: string
  date: string
  time: string
  isActive: boolean
  questions: any[]
  _count: { responses: number }
  userHasCompleted?: boolean
  userLowestScore?: number
  userCanRetake?: boolean
  retakeCooldownUntil?: number
  retakeAttempts?: number
}

function DashboardPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active')
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    fetchSessions()
  }, [])

  const fetchSessions = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/sessions')
      if (response.ok) {
        const data = await response.json()

        // Check completion status, scores, and retake eligibility for each session
        if (user) {
          const sessionsWithStatus = await Promise.all(
            data.map(async (session: Session) => {
              try {
                // Get user's submissions for this session
                const submissionsResponse = await fetch(`http://localhost:3001/api/user/${user.email}/submissions`)
                const retakeResponse = await fetch(`http://localhost:3001/api/user/${user.email}/session/${session.id}/retake-status`)

                if (submissionsResponse.ok) {
                  const submissions = await submissionsResponse.json()
                  const sessionSubmissions = submissions.filter((sub: any) => sub.sessionId === session.id)

                  if (sessionSubmissions.length > 0) {
                    // Find the lowest score for retake eligibility (score < 45)
                    const lowestScore = Math.min(...sessionSubmissions.map((sub: any) => sub.score))

                    // Get retake status
                    let retakeStatus = { canRetake: false, cooldownUntil: null, attempts: 0 }
                    if (retakeResponse.ok) {
                      retakeStatus = await retakeResponse.json()
                    }

                    const now = Date.now()
                    const cooldownEnd = retakeStatus.cooldownUntil ? new Date(retakeStatus.cooldownUntil).getTime() : 0
                    const isOnCooldown = cooldownEnd > now

                    return {
                      ...session,
                      userHasCompleted: true,
                      userLowestScore: lowestScore,
                      userCanRetake: retakeStatus.canRetake && !isOnCooldown,
                      retakeCooldownUntil: isOnCooldown ? cooldownEnd : null,
                      retakeAttempts: retakeStatus.attempts
                    }
                  }
                }
              } catch (err) {
                console.error('Error checking submission status:', err)
              }
              return { ...session, userHasCompleted: false }
            })
          )
          setSessions(sessionsWithStatus)
        } else {
          setSessions(data)
        }
      } else {
        setError('Failed to load quiz sessions')
      }
    } catch (err) {
      setError('Failed to load quiz sessions')
      console.error('Error fetching sessions:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <LoadingSpinner text="Loading quiz sessions..." />
  }

  if (error) {
    return (
      <EmptyState
        title="Failed to load sessions"
        description={error}
        action={{
          label: 'Try Again',
          onClick: fetchSessions
        }}
      />
    )
  }

  const handleRetakeQuiz = async (sessionId: string) => {
    if (!user) return

    try {
      // Get the user's lowest score for this session
      const submissionsResponse = await fetch(`http://localhost:3001/api/user/${user.email}/submissions`)
      if (submissionsResponse.ok) {
        const submissions = await submissionsResponse.json()
        const sessionSubmissions = submissions.filter((sub: any) => sub.sessionId === sessionId)
        const lowestScore = Math.min(...sessionSubmissions.map((sub: any) => sub.score))

        // Start the retake cooldown
        const response = await fetch(`http://localhost:3001/api/user/${user.email}/session/${sessionId}/start-retake`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ score: lowestScore })
        })

        if (response.ok) {
          // Navigate to quiz with retake flag
          navigate(`/quiz/${sessionId}?retake=true`)
        } else {
          alert('Failed to start retake')
        }
      }
    } catch (error) {
      console.error('Error starting retake:', error)
      alert('Error starting retake')
    }
  }

  const activeSessions = sessions.filter(session => session.isActive && !session.userHasCompleted)
  const completedSessions = sessions.filter(session => session.isActive && session.userHasCompleted)
  const inactiveSessions = sessions.filter(session => !session.isActive)

  const displaySessions = activeTab === 'active' ? activeSessions : completedSessions

  return (
    <div className="ui-page page-enter">
      {/* Header */}
      <div className="ui-page-header mb-6 sm:mb-8">
        <div>
          <h1 className="ui-page-title">Quiz Sessions</h1>
          <p className="ui-page-subtitle mt-1">Available competency validation sessions</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/history')}>
          View My History
        </Button>
      </div>

      {/* No sessions at all */}
      {sessions.length === 0 && (
        <EmptyState
          icon={<FileText className="h-full w-full" />}
          title="No quiz sessions available"
          description="There are currently no quiz sessions. Check back later or contact your administrator."
        />
      )}

      {/* Tabs and Content */}
      {sessions.length > 0 && (
        <>
          {/* Tabs */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="flex gap-4 sm:gap-8" aria-label="Session tabs">
              <button
                onClick={() => setActiveTab('active')}
                className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'active'
                    ? 'border-bdo-red text-bdo-red'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                aria-current={activeTab === 'active' ? 'page' : undefined}
              >
                Active Quizzes
                <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-gray-100">
                  {activeSessions.length}
                </span>
              </button>
              <button
                onClick={() => setActiveTab('completed')}
                className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'completed'
                    ? 'border-bdo-red text-bdo-red'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                aria-current={activeTab === 'completed' ? 'page' : undefined}
              >
                Completed
                <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-gray-100">
                  {completedSessions.length}
                </span>
              </button>
            </nav>
          </div>

          {/* Session Cards Grid */}
          {displaySessions.length === 0 ? (
            <EmptyState
              icon={<CheckCircle className="h-full w-full" />}
              title={activeTab === 'active' ? 'No active quizzes' : 'No completed quizzes'}
              description={
                activeTab === 'active'
                  ? 'You have completed all available quizzes. Check the Completed tab to view your results.'
                  : 'You have not completed any quizzes yet. Start a quiz from the Active tab.'
              }
            />
          ) : (
            <div className="ui-grid-responsive">
              {displaySessions.map((session) => (
                <div key={session.id} className="ui-card-strong animate-slide-up">
                  {/* Header */}
                  <div className="mb-4">
                    <h3 className="text-lg font-bold text-bdo-navy mb-2 line-clamp-2">
                      {session.name}
                    </h3>
                    {activeTab === 'completed' && session.userLowestScore !== undefined && (
                      <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                        session.userLowestScore >= 80 ? 'bg-green-100 text-green-700' :
                        session.userLowestScore >= 70 ? 'bg-blue-100 text-blue-700' :
                        session.userLowestScore >= 60 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        Score: {session.userLowestScore}%
                      </div>
                    )}
                  </div>

                  {/* Session Details */}
                  <div className="space-y-2 text-sm mb-4">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Calendar className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                      <span>{new Date(session.date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Clock className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                      <span>{session.time}</span>
                    </div>
                    <div className="hidden sm:flex items-center gap-2 text-gray-600">
                      <FileText className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                      <span>{session.questions.length} questions</span>
                    </div>
                    <div className="hidden sm:flex items-center gap-2 text-gray-600">
                      <Users className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                      <span>{session._count.responses} participants</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 mt-auto">
                    {activeTab === 'active' ? (
                      <Button
                        variant="primary"
                        onClick={() => navigate(`/quiz/${session.id}`)}
                        fullWidth
                      >
                        Start Quiz
                      </Button>
                    ) : (
                      <>
                        <Button
                          variant="secondary"
                          onClick={() => navigate(`/admin/results?session=${session.id}`)}
                          fullWidth
                        >
                          View Results
                        </Button>
                        {session.userLowestScore && session.userLowestScore < 45 && (
                          session.retakeCooldownUntil ? (
                            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                              <CountdownTimer
                                targetTime={session.retakeCooldownUntil}
                                onComplete={() => fetchSessions()}
                              />
                            </div>
                          ) : session.retakeAttempts === 0 ? (
                            <Button
                              variant="primary"
                              onClick={() => handleRetakeQuiz(session.id)}
                              fullWidth
                            >
                              Retake Quiz
                            </Button>
                          ) : (
                            <div className="text-sm text-center text-gray-500 py-2">
                              Retake completed
                            </div>
                          )
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Upcoming/Inactive Sessions */}
      {inactiveSessions.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-bold text-bdo-navy mb-4">Upcoming Sessions</h2>
          <div className="ui-grid-responsive">
            {inactiveSessions.map((session) => (
              <div key={session.id} className="ui-card opacity-75">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-bold text-gray-700 line-clamp-2">
                    {session.name}
                  </h3>
                  <span className="ui-pill bg-gray-200 text-gray-600 flex-shrink-0 ml-2">
                    Upcoming
                  </span>
                </div>
                <div className="space-y-2 text-sm mb-4">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Calendar className="h-4 w-4" aria-hidden="true" />
                    <span>{new Date(session.date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Clock className="h-4 w-4" aria-hidden="true" />
                    <span>{session.time}</span>
                  </div>
                </div>
                <div className="text-gray-500 text-sm">
                  This session is not yet active. Check back later.
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default DashboardPage
