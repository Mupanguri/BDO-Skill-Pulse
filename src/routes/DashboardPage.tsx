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
      <div className="text-sm font-medium text-orange-600 dark:text-orange-400">
        Retake available in:
      </div>
      <div className="text-lg font-bold text-orange-700 dark:text-orange-300">
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
  department?: string | null
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
      const response = await fetch('/api/sessions', { credentials: 'include' })
      if (response.ok) {
        const data = await response.json()

        if (user) {
          const sessionsWithStatus = await Promise.all(
            data.map(async (session: Session) => {
              try {
                const [submissionsResponse, retakeResponse] = await Promise.all([
                  fetch(`/api/user/${user.email}/submissions`, { credentials: 'include' }),
                  fetch(`/api/user/${user.email}/session/${session.id}/retake-status`, { credentials: 'include' })
                ])

                if (submissionsResponse.ok) {
                  const submissions = await submissionsResponse.json()
                  const sessionSubmissions = submissions.filter((sub: any) => sub.sessionId === session.id)

                  if (sessionSubmissions.length > 0) {
                    const lowestScore = Math.min(...sessionSubmissions.map((sub: any) => sub.score))

                    let retakeStatus = {
                      canRetake: false,
                      cooldownUntil: null,
                      attempts: 0,
                      retakeWindowStart: null,
                      retakeWindowEnd: null,
                      passed: false,
                      finalScore: null
                    }
                    if (retakeResponse.ok) {
                      retakeStatus = await retakeResponse.json()
                    }

                    const now = Date.now()
                    const cooldownEnd = retakeStatus.cooldownUntil ? new Date(retakeStatus.cooldownUntil).getTime() : 0
                    const retakeWindowEnd = retakeStatus.retakeWindowEnd ? new Date(retakeStatus.retakeWindowEnd).getTime() : 0
                    const isOnCooldown = cooldownEnd > now
                    const isRetakeWindowActive = retakeWindowEnd > now && retakeStatus.canRetake

                    const canRetake = lowestScore < 45 &&
                      retakeStatus.attempts < 2 &&
                      !retakeStatus.passed &&
                      (isRetakeWindowActive || (!isOnCooldown && retakeStatus.attempts === 0))

                    const isQuizFinalized = retakeStatus.passed || retakeStatus.attempts >= 2 ||
                      (retakeStatus.attempts > 0 && !isRetakeWindowActive && !isOnCooldown)

                    return {
                      ...session,
                      userHasCompleted: true,
                      userLowestScore: lowestScore,
                      userCanRetake: canRetake,
                      retakeCooldownUntil: isOnCooldown ? cooldownEnd : null,
                      retakeAttempts: retakeStatus.attempts ?? 0,
                      retakeWindowEnd: isRetakeWindowActive ? retakeWindowEnd : null,
                      isQuizFinalized,
                      passed: retakeStatus.passed,
                      finalScore: retakeStatus.finalScore ?? lowestScore
                    }
                  }
                }
              } catch {
                // silently fail per-session status check
              }
              return { ...session, userHasCompleted: false }
            })
          )
          // Only show sessions with no department, or matching the user's department
          const filtered = sessionsWithStatus.filter((s: Session) =>
            !s.department || s.department === user.department
          )
          setSessions(filtered)
        } else {
          setSessions((data as Session[]).filter(s =>
            !s.department || !user || s.department === user.department
          ))
        }
      } else {
        setError('Failed to load quiz sessions')
      }
    } catch {
      setError('Failed to load quiz sessions')
    } finally {
      setLoading(false)
    }
  }

  const handleRetakeQuiz = async (sessionId: string) => {
    if (!user) return
    try {
      const submissionsResponse = await fetch(`/api/user/${user.email}/submissions`, { credentials: 'include' })
      if (submissionsResponse.ok) {
        const submissions = await submissionsResponse.json()
        const sessionSubmissions = submissions.filter((sub: any) => sub.sessionId === sessionId)
        const lowestScore = Math.min(...sessionSubmissions.map((sub: any) => sub.score))

        const response = await fetch(`/api/user/${user.email}/session/${sessionId}/start-retake`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ score: lowestScore })
        })

        if (response.ok) {
          navigate(`/app/quiz/${sessionId}?retake=true`)
        } else {
          alert('Failed to start retake')
        }
      }
    } catch {
      alert('Error starting retake')
    }
  }

  if (loading) return <LoadingSpinner text="Loading quiz sessions..." />

  if (error) {
    return (
      <EmptyState
        title="Failed to load sessions"
        description={error}
        action={{ label: 'Try Again', onClick: fetchSessions }}
      />
    )
  }

  const activeSessions = sessions.filter(s => s.isActive && !s.userHasCompleted)
  const completedSessions = sessions.filter(s => s.isActive && s.userHasCompleted)
  const inactiveSessions = sessions.filter(s => !s.isActive)
  const displaySessions = activeTab === 'active' ? activeSessions : completedSessions

  const scoreColor = (score: number) => {
    if (score >= 80) return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
    if (score >= 70) return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
    if (score >= 60) return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
    return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-bdo-navy dark:text-gray-100">Quiz Sessions</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Available competency validation sessions</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/app/history')}>
          View My History
        </Button>
      </div>

      {sessions.length === 0 && (
        <div className="ui-card text-center py-12">
          <FileText className="h-12 w-12 mx-auto mb-3 text-gray-400 dark:text-gray-600" />
          <p className="font-medium" style={{ color: 'var(--ui-text)' }}>No quiz sessions available</p>
          <p className="text-sm mt-1" style={{ color: 'var(--ui-text-muted)' }}>
            There are currently no quiz sessions. Check back later or contact your administrator.
          </p>
        </div>
      )}

      {sessions.length > 0 && (
        <>
          <div className="ui-card p-0 overflow-hidden">
            {/* Tabs */}
            <div className="border-b" style={{ borderColor: 'var(--ui-border)' }}>
              <nav className="flex gap-0 px-6" aria-label="Session tabs">
                {(['active', 'completed'] as const).map((tab) => {
                  const count = tab === 'active' ? activeSessions.length : completedSessions.length
                  const label = tab === 'active' ? 'Active Quizzes' : 'Completed'
                  return (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`py-4 px-2 mr-6 border-b-2 font-medium text-sm transition-colors ${
                        activeTab === tab
                          ? 'border-bdo-red text-bdo-red'
                          : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                      }`}
                      aria-current={activeTab === tab ? 'page' : undefined}
                    >
                      {label}
                      <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                        {count}
                      </span>
                    </button>
                  )
                })}
              </nav>
            </div>

            <div className="p-6">
              {displaySessions.length === 0 ? (
                <div className="text-center py-10">
                  <CheckCircle className="h-12 w-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                  <p className="font-medium" style={{ color: 'var(--ui-text)' }}>
                    {activeTab === 'active' ? 'No active quizzes' : 'No completed quizzes'}
                  </p>
                  <p className="text-sm mt-1" style={{ color: 'var(--ui-text-muted)' }}>
                    {activeTab === 'active'
                      ? 'You have completed all available quizzes.'
                      : 'You have not completed any quizzes yet.'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {displaySessions.map((session) => (
                    <div
                      key={session.id}
                      className="rounded-xl p-6 transition-shadow hover:shadow-lg"
                      style={{
                        background: 'var(--ui-surface)',
                        border: '1px solid var(--ui-border)',
                        boxShadow: 'var(--ui-shadow-soft)'
                      }}
                    >
                      <div className="mb-4">
                        <h3 className="text-lg font-bold text-bdo-navy dark:text-gray-100 mb-2 line-clamp-2">
                          {session.name}
                        </h3>
                        {activeTab === 'completed' && session.userLowestScore !== undefined && (
                          <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${scoreColor(session.userLowestScore)}`}>
                            Score: {session.userLowestScore}%
                          </div>
                        )}
                      </div>

                      <div className="space-y-2 text-sm mb-4">
                        {[
                          [Calendar, new Date(session.date).toLocaleDateString()],
                          [Clock, session.time],
                          [FileText, `${session.questions.length} questions`],
                          [Users, `${session._count.responses} participants`],
                        ].map(([Icon, text], i) => (
                          <div key={i} className="flex items-center gap-2" style={{ color: 'var(--ui-text-muted)' }}>
                            <Icon className="h-4 w-4 flex-shrink-0" />
                            <span>{text as string}</span>
                          </div>
                        ))}
                      </div>

                      <div className="flex flex-col gap-2 mt-auto">
                        {activeTab === 'active' ? (
                          <Button variant="primary" onClick={() => navigate(`/app/quiz/${session.id}`)} fullWidth>
                            {(() => {
                              try {
                                const saved = user?.email ? localStorage.getItem(`quiz_progress_${session.id}_${user.email}`) : null
                                return saved && JSON.parse(saved).timeRemaining > 0 ? 'Resume Quiz' : 'Start Quiz'
                              } catch { return 'Start Quiz' }
                            })()}
                          </Button>
                        ) : (
                          <>
                            {user?.isAdmin && (
                              <Button variant="secondary" onClick={() => navigate(`/app/admin/results?session=${session.id}`)} fullWidth>
                                View Results
                              </Button>
                            )}
                            {session.userLowestScore !== undefined && (
                              ((session as any).isQuizFinalized || (session as any).passed || session.userLowestScore >= 45) ? (
                                <Button variant="secondary" onClick={() => navigate(`/app/results?session=${session.id}&review=true`)} fullWidth>
                                  Review Answers
                                </Button>
                              ) : (session as any).retakeCooldownUntil ? (
                                <div className="rounded-lg p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
                                  <p className="text-sm text-orange-700 dark:text-orange-300 mb-2">Retake available in:</p>
                                  <CountdownTimer targetTime={(session as any).retakeCooldownUntil} onComplete={fetchSessions} />
                                </div>
                              ) : (session as any).retakeWindowEnd ? (
                                <div className="rounded-lg p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                                  <p className="text-sm text-green-700 dark:text-green-300 mb-2">Retake window closes in:</p>
                                  <CountdownTimer targetTime={(session as any).retakeWindowEnd} onComplete={fetchSessions} />
                                  <Button variant="primary" onClick={() => handleRetakeQuiz(session.id)} fullWidth className="mt-2">
                                    Retake Quiz
                                  </Button>
                                </div>
                              ) : (session.retakeAttempts ?? 0) < 2 ? (
                                <Button variant="primary" onClick={() => handleRetakeQuiz(session.id)} fullWidth>
                                  Retake Quiz ({session.retakeAttempts ?? 0}/2 used)
                                </Button>
                              ) : (
                                <div className="text-sm text-center py-2" style={{ color: 'var(--ui-text-muted)' }}>
                                  Max retakes used ({session.retakeAttempts ?? 0}/2)
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
            </div>
          </div>
        </>
      )}

      {inactiveSessions.length > 0 && (
        <div className="ui-card p-0 overflow-hidden">
          <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--ui-border)' }}>
            <h2 className="text-xl font-bold text-bdo-navy dark:text-gray-100">Upcoming Sessions</h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {inactiveSessions.map((session) => (
              <div
                key={session.id}
                className="rounded-xl p-6 opacity-75"
                style={{ background: 'var(--ui-surface)', border: '1px solid var(--ui-border)' }}
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-bold line-clamp-2" style={{ color: 'var(--ui-text-muted)' }}>
                    {session.name}
                  </h3>
                  <span className="ml-2 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded text-xs flex-shrink-0">
                    Upcoming
                  </span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2" style={{ color: 'var(--ui-text-muted)' }}>
                    <Calendar className="h-4 w-4" />
                    <span>{new Date(session.date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2" style={{ color: 'var(--ui-text-muted)' }}>
                    <Clock className="h-4 w-4" />
                    <span>{session.time}</span>
                  </div>
                </div>
                <p className="text-sm mt-3" style={{ color: 'var(--ui-text-muted)' }}>
                  This session is not yet active. Check back later.
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}

export default DashboardPage
