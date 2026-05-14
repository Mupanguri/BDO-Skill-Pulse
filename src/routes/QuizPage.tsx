import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../lib/contexts/AuthContext'
import QuizTimer from '../lib/components/QuizTimer'
import Button from '../lib/components/Button'
import { AlertCircle, Clock, Maximize, Coffee } from 'lucide-react'
import { seededShuffle, reorderByIds } from '../lib/utils/quiz'

interface Question {
  id: string
  text: string
  options: string[]
  correctAnswer: number
  type: string
}

interface QuizSession {
  id: string
  name: string
  questions: Question[]
  timeLimitMinutes?: number
}

function QuizPage() {
  const { sessionId } = useParams()
  const [searchParams] = useSearchParams()
  const isRetake = searchParams.get('retake') === 'true'
  const navigate = useNavigate()
  const { user } = useAuth()

  const [session, setSession] = useState<QuizSession | null>(null)
  const [displayQuestions, setDisplayQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showWarning, setShowWarning] = useState(false)
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [quizStartTime] = useState(Date.now())
  const [timeRemaining, setTimeRemaining] = useState(1800)
  const [showBreakModal, setShowBreakModal] = useState(false)
  const [onBreak, setOnBreak] = useState(false)
  const autoSaveInterval = useRef<ReturnType<typeof setInterval> | null>(null)
  const questionOrderRef = useRef<string[]>([])

  const saveProgress = useCallback(async (data: {
    answers?: Record<string, number>
    timeRemaining?: number
    questionOrder?: string[]
  }) => {
    if (!user || !sessionId) return
    setAutoSaveStatus('saving')
    try {
      await fetch('/api/quiz-progress', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userEmail: user.email,
          sessionId,
          answers: data.answers ?? answers,
          timeRemaining: data.timeRemaining ?? timeRemaining,
          questionOrder: data.questionOrder ?? questionOrderRef.current
        })
      })
      setAutoSaveStatus('saved')
      setTimeout(() => setAutoSaveStatus('idle'), 1500)
    } catch {
      // silent fail
    }
  }, [user, sessionId, answers, timeRemaining])

  useEffect(() => {
    if (!sessionId) { navigate('/app/dashboard'); return }
    if (sessionId && user) {
      loadQuizAndProgress()
    }
    return () => {
      if (autoSaveInterval.current) clearInterval(autoSaveInterval.current)
    }
  }, [sessionId, user])

  // Auto-save every 30s
  useEffect(() => {
    if (!session) return
    autoSaveInterval.current = setInterval(() => saveProgress({ answers, timeRemaining }), 30000)
    return () => { if (autoSaveInterval.current) clearInterval(autoSaveInterval.current) }
  }, [session, answers, timeRemaining, saveProgress])

  // Save on tab hide (handles user switching away from the tab)
  useEffect(() => {
    const handler = () => {
      if (document.hidden && session) saveProgress({ answers, timeRemaining })
    }
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }, [session, answers, timeRemaining, saveProgress])

  // Warn before closing/navigating away
  useEffect(() => {
    if (!session) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = 'Your quiz timer is still running. Time will continue to count down even if you leave.'
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [session])

  const [isFullscreen, setIsFullscreen] = useState(false)
  const quizOverlayRef = useRef<HTMLDivElement>(null)

  // Enter fullscreen when quiz loads; intercept fullscreen exit with break dialog
  useEffect(() => {
    if (!session) return

    const enterFullscreen = () => {
      quizOverlayRef.current?.requestFullscreen?.().catch(() => {})
    }
    setTimeout(enterFullscreen, 300)

    const handleFullscreenChange = () => {
      const inFS = !!document.fullscreenElement
      setIsFullscreen(inFS)
      if (!inFS && !onBreak) {
        setShowBreakModal(true)
      }
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {})
    }
  }, [session])

  const handleResumeFullscreen = () => {
    setShowBreakModal(false)
    setOnBreak(false)
    quizOverlayRef.current?.requestFullscreen?.().catch(() => {})
  }

  const handleTakeBreak = () => {
    setOnBreak(true)
    setShowBreakModal(false)
    saveProgress({ answers, timeRemaining })
  }

  const loadQuizAndProgress = async () => {
    try {
      const [sessionRes, progressRes] = await Promise.all([
        fetch(`/api/sessions/${sessionId}`, { credentials: 'include' }),
        fetch(`/api/quiz-progress/${user!.email}/${sessionId}`, { credentials: 'include' })
      ])

      if (!sessionRes.ok) {
        if (sessionRes.status === 401) navigate('/login')
        else { alert('Failed to load quiz'); navigate('/app/dashboard') }
        return
      }

      const sessionData: QuizSession = await sessionRes.json()
      setSession(sessionData)

      const defaultTime = (sessionData.timeLimitMinutes || 30) * 60

      if (progressRes.ok) {
        const progress = await progressRes.json()
        const hasProgress = progress && (
          Object.keys(progress.answers || {}).length > 0 ||
          (progress.timeRemaining > 0 && progress.timeRemaining < defaultTime) ||
          progress.questionOrder?.length > 0
        )
        if (hasProgress) {
          // Returning user — restore exact state including paused break time
          setAnswers(progress.answers || {})
          setTimeRemaining(progress.timeRemaining > 0 ? progress.timeRemaining : defaultTime)
          setShowWarning(true)

          // Restore question order
          if (progress.questionOrder?.length) {
            const ordered = reorderByIds(sessionData.questions, progress.questionOrder)
            setDisplayQuestions(ordered)
            questionOrderRef.current = progress.questionOrder
          } else {
            const shuffled = seededShuffle(sessionData.questions, user!.email + sessionId)
            setDisplayQuestions(shuffled)
            questionOrderRef.current = shuffled.map(q => q.id)
          }
        } else {
          // First time — shuffle and save order
          firstTimeSetup(sessionData, defaultTime)
        }
      } else {
        firstTimeSetup(sessionData, defaultTime)
      }
    } catch {
      alert('Failed to load quiz')
      navigate('/app/dashboard')
    } finally {
      setLoading(false)
    }
  }

  const firstTimeSetup = (sessionData: QuizSession, defaultTime: number) => {
    const shuffled = seededShuffle(sessionData.questions, user!.email + sessionId)
    setDisplayQuestions(shuffled)
    setTimeRemaining(defaultTime)
    questionOrderRef.current = shuffled.map(q => q.id)
    // Persist the order immediately
    setTimeout(() => saveProgress({ answers: {}, timeRemaining: defaultTime, questionOrder: shuffled.map(q => q.id) }), 500)
  }

  const handleAnswerSelect = (questionId: string, answerIndex: number) => {
    setAnswers(prev => ({ ...prev, [questionId]: answerIndex }))
  }

  const handleTimeUp = async () => {
    await submitQuiz(true)
  }

  const calculateScore = () => {
    if (!session) return 0
    const correct = displayQuestions.filter(q => answers[q.id] === q.correctAnswer).length
    return Math.round((correct / displayQuestions.length) * 100)
  }

  const submitQuiz = async (timeUp = false) => {
    if (!session || !user) return
    setSubmitting(true)

    const score = calculateScore()
    const totalTimeSpent = Math.floor((Date.now() - quizStartTime) / 1000)

    try {
      const response = await fetch('/api/responses', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userEmail: user.email,
          sessionId,
          answers,
          score,
          timeSpent: totalTimeSpent,
          completedAt: new Date().toISOString(),
          timeUp
        })
      })

      if (response.ok) {
        if (isRetake) {
          await fetch(`/api/user/${user.email}/session/${sessionId}/complete-retake`, {
            method: 'POST',
            credentials: 'include'
          })
        }
        navigate(user.isAdmin
          ? `/app/admin/results?session=${sessionId}`
          : `/app/results?session=${sessionId}`)
      } else if (response.status === 401) {
        navigate('/login')
      } else {
        alert('Failed to submit quiz')
      }
    } catch {
      alert('Failed to submit quiz')
    } finally {
      setSubmitting(false)
    }
  }

  const goToNext = () => {
    if (currentQuestionIndex < displayQuestions.length - 1)
      setCurrentQuestionIndex(currentQuestionIndex + 1)
  }
  const goToPrevious = () => {
    if (currentQuestionIndex > 0) setCurrentQuestionIndex(currentQuestionIndex - 1)
  }
  const canSubmit = () => session && Object.keys(answers).length === displayQuestions.length

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-bdo-red mx-auto mb-4"></div>
        <p style={{ color: 'var(--ui-text-muted)' }}>Loading quiz...</p>
      </div>
    )
  }

  if (!session || !displayQuestions.length) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Quiz not found</p>
        <Button onClick={() => navigate('/app/dashboard')} className="mt-4">Back to Dashboard</Button>
      </div>
    )
  }

  const currentQuestion = displayQuestions[currentQuestionIndex]
  const progress = ((currentQuestionIndex + 1) / displayQuestions.length) * 100
  const timeLimitMins = session.timeLimitMinutes || 30

  const quizContent = (
    <div
      className="max-w-4xl mx-auto px-4 py-6"
      style={{ minHeight: isFullscreen ? '100vh' : undefined, background: isFullscreen ? 'var(--ui-bg, #070f1e)' : undefined }}
    >
      {/* Break request modal */}
      {showBreakModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 text-center">
            <Coffee className="h-12 w-12 text-orange-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">You left the quiz</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm leading-relaxed">
              The quiz is locked. Your progress is saved. You can take a break — your timer will resume when you return.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={handleResumeFullscreen}
                className="w-full py-3 rounded-xl font-semibold text-white"
                style={{ background: 'linear-gradient(135deg,#cc2200,#e63300)' }}
              >
                <Maximize className="inline h-4 w-4 mr-2" />
                Return to Quiz
              </button>
              <button
                onClick={handleTakeBreak}
                className="w-full py-3 rounded-xl font-semibold border border-orange-300 text-orange-700 dark:text-orange-400 dark:border-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
              >
                Take a Break (timer resumes when you return)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* On-break overlay — covers everything except Resume button */}
      {onBreak && (
        <div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-black/75 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-10 max-w-sm w-full mx-4 text-center">
            <Coffee className="h-14 w-14 text-orange-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">On Break</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6 leading-relaxed">
              Your quiz is paused. Your timer will resume the moment you return.
            </p>
            <button
              onClick={handleResumeFullscreen}
              className="w-full py-3 rounded-xl font-semibold text-white text-base"
              style={{ background: 'linear-gradient(135deg,#cc2200,#e63300)' }}
            >
              <Maximize className="inline h-4 w-4 mr-2" />
              Resume Quiz
            </button>
          </div>
        </div>
      )}

      {showWarning && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-yellow-800 dark:text-yellow-300">Progress Restored</p>
              <p className="text-sm text-yellow-700 dark:text-yellow-400">
                Your previous answers and time have been restored.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowWarning(false)}>Dismiss</Button>
          </div>
        </div>
      )}

      {/* Header with Timer */}
      <div className="ui-card mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{session.name}</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Question {currentQuestionIndex + 1} of {displayQuestions.length}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <Clock className="h-4 w-4" />
              <span>{autoSaveStatus === 'saving' ? 'Saving...' : autoSaveStatus === 'saved' ? 'Saved ✓' : 'Auto-save'}</span>
            </div>
            <button
              onClick={() => { saveProgress({ answers, timeRemaining }); setOnBreak(true); if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {}) }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-orange-300 text-orange-700 dark:text-orange-400 dark:border-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
            >
              <Coffee className="h-3.5 w-3.5" />
              Request Break
            </button>
            <QuizTimer
              duration={timeRemaining}
              onTimeUp={handleTimeUp}
              onAutoSave={(a, t) => saveProgress({ answers: a, timeRemaining: t })}
              sessionId={sessionId}
              userEmail={user?.email}
              paused={onBreak}
            />
          </div>
        </div>
        <div className="w-full rounded-full h-2 bg-gray-200 dark:bg-gray-700">
          <div className="bg-bdo-red h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Question Card — pointer-events disabled during break */}
      <div className={`ui-card mb-6 transition-opacity duration-200 ${onBreak ? 'opacity-30 pointer-events-none select-none' : ''}`}>
        <h2 className="text-xl font-semibold mb-6 text-gray-900 dark:text-gray-100">
          {currentQuestion.text}
        </h2>
        <div className="space-y-3">
          {currentQuestion.options.map((option, index) => {
            const selected = answers[currentQuestion.id] === index
            const letter = String.fromCharCode(65 + index)
            return (
              <label
                key={index}
                className={`flex items-center p-4 border-2 rounded-lg transition-all ${
                  onBreak ? 'cursor-not-allowed' : 'cursor-pointer'
                } ${
                  selected
                    ? 'border-bdo-red bg-red-50 dark:bg-red-900/20'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-400 bg-white dark:bg-gray-800'
                }`}
              >
                <input
                  type="radio"
                  name={`question-${currentQuestion.id}`}
                  value={index}
                  checked={selected}
                  onChange={() => !onBreak && handleAnswerSelect(currentQuestion.id, index)}
                  className="sr-only"
                  disabled={onBreak}
                />
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold mr-3 flex-shrink-0 ${
                  selected ? 'bg-bdo-red text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}>
                  {letter}
                </span>
                <span className="text-gray-900 dark:text-gray-100 font-medium">{option}</span>
              </label>
            )
          })}
        </div>
      </div>

      {/* Navigation — also disabled during break */}
      <div className={`flex items-center justify-between ${onBreak ? 'opacity-30 pointer-events-none' : ''}`}>
        <Button onClick={goToPrevious} disabled={currentQuestionIndex === 0 || onBreak} variant="outline">
          Previous
        </Button>

        <div className="flex gap-2 flex-wrap justify-center">
          {displayQuestions.map((_, index) => (
            <button
              key={index}
              onClick={() => !onBreak && setCurrentQuestionIndex(index)}
              disabled={onBreak}
              className={`w-3 h-3 rounded-full transition-colors ${
                index === currentQuestionIndex
                  ? 'bg-bdo-red'
                  : answers[displayQuestions[index].id] !== undefined
                  ? 'bg-green-500'
                  : 'bg-gray-300 dark:bg-gray-600'
              }`}
              title={`Question ${index + 1}`}
            />
          ))}
        </div>

        {currentQuestionIndex === displayQuestions.length - 1 ? (
          <Button
            onClick={() => submitQuiz()}
            disabled={!canSubmit() || submitting || onBreak}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {submitting ? 'Submitting...' : 'Submit Quiz'}
          </Button>
        ) : (
          <Button onClick={goToNext} disabled={onBreak}>Next</Button>
        )}
      </div>

      {/* Instructions */}
      <div className="mt-6 rounded-lg p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
        <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">Quiz Instructions</h3>
        <ul className="text-sm text-blue-800 dark:text-blue-400 space-y-1">
          <li>• You have {timeLimitMins} minutes to complete this quiz</li>
          <li>• Your progress and remaining time are saved automatically every 30 seconds</li>
          <li>• Use "Request Break" to pause — your timer resumes when you return</li>
          <li>• Answer all questions before submitting</li>
          {isRetake && <li>• This is a retake attempt</li>}
        </ul>
      </div>
    </div>
  )

  return (
    <div
      ref={quizOverlayRef}
      className="outline-none"
      style={isFullscreen ? { background: 'var(--ui-bg, #0a1628)', minHeight: '100vh', overflowY: 'auto' } : {}}
      tabIndex={-1}
    >
      {quizContent}
    </div>
  )
}

export default QuizPage
