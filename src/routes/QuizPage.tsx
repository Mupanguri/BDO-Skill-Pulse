import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../lib/contexts/AuthContext'
import QuizTimer from '../lib/components/QuizTimer'
import Button from '../lib/components/Button'
import { AlertCircle, Clock, Save } from 'lucide-react'

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
  time?: number
}

function QuizPage() {
  const { sessionId } = useParams()
  const [searchParams] = useSearchParams()
  const isRetake = searchParams.get('retake') === 'true'
  const navigate = useNavigate()
  const { user, accessToken, refreshAccessToken } = useAuth()

  const [session, setSession] = useState<QuizSession | null>(null)
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showWarning, setShowWarning] = useState(false)
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [sessionExpired, setSessionExpired] = useState(false)

  // Timer state
  const [quizStartTime] = useState(Date.now())
  const [timeRemaining, setTimeRemaining] = useState(300) // 5 minutes
  const autoSaveInterval = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!sessionId) {
      console.error('No sessionId provided')
      navigate('/app/dashboard')
      return
    }
    if (sessionId && user && accessToken) {
      loadQuiz()
      loadSavedProgress()
      startAutoSave()
    }

    return () => {
      if (autoSaveInterval.current) {
        clearInterval(autoSaveInterval.current)
      }
    }
  }, [sessionId, user, accessToken])

  const loadQuiz = async () => {
    try {
      const response = await fetch(`http://localhost:3001/api/sessions/${sessionId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })
      if (response.ok) {
        const sessionData = await response.json()
        setSession(sessionData)
      } else if (response.status === 401) {
        // Try to refresh token
        const refreshed = await refreshAccessToken()
        if (refreshed) {
          // Retry with new token
          const newResponse = await fetch(`http://localhost:3001/api/sessions/${sessionId}`, {
            headers: {
              'Authorization': `Bearer ${accessToken}`
            }
          })
          if (newResponse.ok) {
            const sessionData = await newResponse.json()
            setSession(sessionData)
          }
        } else {
          setSessionExpired(true)
        }
      } else {
        alert('Failed to load quiz')
        navigate('/app/dashboard')
      }
    } catch (error) {
      console.error('Failed to load quiz:', error)
      alert('Failed to load quiz')
      navigate('/app/dashboard')
    } finally {
      setLoading(false)
    }
  }

  const loadSavedProgress = async () => {
    if (!user || !sessionId || !accessToken) return

    try {
      const response = await fetch(`http://localhost:3001/api/quiz-progress/${user.email}/${sessionId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })
      if (response.ok) {
        const progress = await response.json()
        if (progress && progress.answers) {
          setAnswers(progress.answers)
          setTimeRemaining(progress.timeRemaining || 300)
          setShowWarning(true)
        }
      }
    } catch (error) {
      console.error('Failed to load saved progress:', error)
    }
  }

  const startAutoSave = () => {
    // Auto-save every 30 seconds
    autoSaveInterval.current = setInterval(async () => {
      await handleAutoSave(answers, timeRemaining)
    }, 30000)
  }

  const handleAnswerSelect = (questionId: string, answerIndex: number) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answerIndex
    }))
  }

  const handleAutoSave = async (currentAnswers: any, remainingTime: number) => {
    if (!user || !sessionId || !accessToken) return

    setAutoSaveStatus('saving')

    try {
      const response = await fetch('http://localhost:3001/api/quiz-progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          userEmail: user.email,
          sessionId: sessionId,
          answers: currentAnswers,
          timeRemaining: remainingTime
        })
      })

      if (response.ok) {
        setAutoSaveStatus('saved')
        setTimeout(() => setAutoSaveStatus('idle'), 1000)
      } else if (response.status === 401) {
        // Try to refresh token and retry
        const refreshed = await refreshAccessToken()
        if (refreshed) {
          // Retry with new token
          const newResponse = await fetch('http://localhost:3001/api/quiz-progress', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({
              userEmail: user.email,
              sessionId: sessionId,
              answers: currentAnswers,
              timeRemaining: remainingTime
            })
          })
          if (newResponse.ok) {
            setAutoSaveStatus('saved')
            setTimeout(() => setAutoSaveStatus('idle'), 1000)
          }
        }
      }
    } catch (error) {
      console.error('Auto-save failed:', error)
    }
  }

  const handleTimeUp = async () => {
    await submitQuiz(true)
  }

  const calculateScore = () => {
    if (!session) return 0

    let correct = 0
    session.questions.forEach(question => {
      if (answers[question.id] === question.correctAnswer) {
        correct++
      }
    })

    return Math.round((correct / session.questions.length) * 100)
  }

  const submitQuiz = async (timeUp = false) => {
    if (!session || !user || !accessToken) return

    setSubmitting(true)

    const score = calculateScore()
    const totalTimeSpent = Math.floor((Date.now() - quizStartTime) / 1000)

    try {
      const response = await fetch('http://localhost:3001/api/responses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          userEmail: user.email,
          sessionId: sessionId,
          answers: answers,
          score: score,
          timeSpent: totalTimeSpent,
          completedAt: new Date().toISOString(),
          timeUp: timeUp
        })
      })

      if (response.ok) {
        // Mark retake as completed if this was a retake
        if (isRetake) {
          await fetch(`http://localhost:3001/api/user/${user.email}/session/${sessionId}/complete-retake`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`
            }
          })
        }

        // Navigate to results
        navigate(`/app/admin/results?session=${sessionId}`)
      } else if (response.status === 401) {
        // Try to refresh token and retry
        const refreshed = await refreshAccessToken()
        if (refreshed) {
          // Retry with new token
          const newResponse = await fetch('http://localhost:3001/api/responses', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({
              userEmail: user.email,
              sessionId: sessionId,
              answers: answers,
              score: score,
              timeSpent: totalTimeSpent,
              completedAt: new Date().toISOString(),
              timeUp: timeUp
            })
          })
          if (newResponse.ok) {
            // Mark retake as completed if this was a retake
            if (isRetake) {
              await fetch(`http://localhost:3001/api/user/${user.email}/session/${sessionId}/complete-retake`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${accessToken}`
                }
              })
            }

            // Navigate to results
            navigate(`/app/admin/results?session=${sessionId}`)
          }
        } else {
          setSessionExpired(true)
        }
      } else {
        alert('Failed to submit quiz')
      }
    } catch (error) {
      console.error('Failed to submit quiz:', error)
      alert('Failed to submit quiz')
    } finally {
      setSubmitting(false)
    }
  }

  const goToNext = () => {
    if (currentQuestionIndex < (session?.questions.length || 0) - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
    }
  }

  const goToPrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1)
    }
  }

  const canSubmit = () => {
    return session && Object.keys(answers).length === session.questions.length
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
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading quiz...</p>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Quiz not found</p>
        <Button onClick={() => navigate('/app/dashboard')} className="mt-4">
          Back to Dashboard
        </Button>
      </div>
    )
  }

  const currentQuestion = session.questions[currentQuestionIndex]
  const progress = ((currentQuestionIndex + 1) / session.questions.length) * 100

  return (
    <div className="max-w-4xl mx-auto">
      {/* Warning Banner for Restored Progress */}
      {showWarning && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600" />
            <div className="flex-1">
              <p className="font-medium text-yellow-800">Progress Restored</p>
              <p className="text-sm text-yellow-700">
                Your quiz progress was restored from a previous session. You can continue from where you left off.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowWarning(false)}>
              Dismiss
            </Button>
          </div>
        </div>
      )}

      {/* Header with Timer */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{session.name}</h1>
            <p className="text-gray-600">
              Question {currentQuestionIndex + 1} of {session.questions.length}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Clock className="h-4 w-4" />
              <span>Auto-save: {autoSaveStatus === 'saving' ? 'Saving...' : autoSaveStatus === 'saved' ? 'Saved' : 'Ready'}</span>
              {autoSaveStatus === 'saving' && <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-500"></div>}
              {autoSaveStatus === 'saved' && <Save className="h-3 w-3 text-green-500" />}
            </div>

            <QuizTimer
              duration={timeRemaining}
              onTimeUp={handleTimeUp}
              onAutoSave={handleAutoSave}
              sessionId={sessionId}
              userEmail={user?.email}
            />
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
          <div
            className="bg-red-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      {/* Question */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">
          {currentQuestion.text}
        </h2>

        <div className="space-y-3">
          {currentQuestion.options.map((option, index) => (
            <label
              key={index}
              className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${
                answers[currentQuestion.id] === index
                  ? 'border-red-500 bg-red-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name={`question-${currentQuestion.id}`}
                value={index}
                checked={answers[currentQuestion.id] === index}
                onChange={() => handleAnswerSelect(currentQuestion.id, index)}
                className="text-red-600 focus:ring-red-500"
              />
              <span className="ml-3 text-gray-900">{option}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          onClick={goToPrevious}
          disabled={currentQuestionIndex === 0}
          variant="outline"
        >
          Previous
        </Button>

        <div className="flex gap-2">
          {/* Question Navigation Dots */}
          {session.questions.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentQuestionIndex(index)}
              className={`w-3 h-3 rounded-full ${
                index === currentQuestionIndex
                  ? 'bg-red-500'
                  : answers[session.questions[index].id] !== undefined
                  ? 'bg-green-500'
                  : 'bg-gray-300'
              }`}
              title={`Question ${index + 1}`}
            />
          ))}
        </div>

        {currentQuestionIndex === session.questions.length - 1 ? (
          <Button
            onClick={() => submitQuiz()}
            disabled={!canSubmit() || submitting}
            className="bg-green-600 hover:bg-green-700"
          >
            {submitting ? 'Submitting...' : 'Submit Quiz'}
          </Button>
        ) : (
          <Button onClick={goToNext}>
            Next
          </Button>
        )}
      </div>

      {/* Instructions */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">Quiz Instructions</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• You have 5 minutes to complete the quiz</li>
          <li>• Your progress is automatically saved every 30 seconds</li>
          <li>• Answer all questions to submit</li>
          <li>• You can navigate between questions using the dots or buttons</li>
          <li>• If you leave the page, your progress will be saved</li>
          {isRetake && <li>• This is a retake attempt</li>}
        </ul>
      </div>
    </div>
  )
}

export default QuizPage
