import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/contexts/AuthContext'
import Button from '../lib/components/Button'

interface Question {
  id: string
  text: string
  options: string[]
  correctAnswer: number
  type: string
}

interface Session {
  id: string
  name: string
  questions: Question[]
}

interface QuizState {
  currentQuestionIndex: number
  answers: Record<string, number>
  startTime: number
  submitted: boolean
  score?: number
  timeSpent?: number
}

function SessionPage() {
  const { sessionId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [quizState, setQuizState] = useState<QuizState>({
    currentQuestionIndex: 0,
    answers: {},
    startTime: Date.now(),
    submitted: false
  })

  useEffect(() => {
    if (sessionId) {
      fetchSession()
    }
  }, [sessionId])

  const fetchSession = async () => {
    try {
      const response = await fetch(`/api/sessions/${sessionId}`)
      if (response.ok) {
        const sessionData = await response.json()
        setSession(sessionData)
      } else {
        setError('Quiz session not found')
      }
    } catch (err) {
      setError('Failed to load quiz session')
      console.error('Error fetching session:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAnswerSelect = (questionId: string, answerIndex: number) => {
    setQuizState(prev => ({
      ...prev,
      answers: {
        ...prev.answers,
        [questionId]: answerIndex
      }
    }))
  }

  const handleNext = () => {
    if (session && quizState.currentQuestionIndex < session.questions.length - 1) {
      setQuizState(prev => ({
        ...prev,
        currentQuestionIndex: prev.currentQuestionIndex + 1
      }))
    }
  }

  const handlePrevious = () => {
    if (quizState.currentQuestionIndex > 0) {
      setQuizState(prev => ({
        ...prev,
        currentQuestionIndex: prev.currentQuestionIndex - 1
      }))
    }
  }

  const calculateScore = () => {
    if (!session) return 0

    let correct = 0
    session.questions.forEach(question => {
      if (quizState.answers[question.id] === question.correctAnswer) {
        correct++
      }
    })

    return Math.round((correct / session.questions.length) * 100)
  }

  const handleSubmit = async () => {
    const score = calculateScore()
    const timeSpent = Math.floor((Date.now() - quizState.startTime) / 1000) // seconds

    try {
      // Submit the quiz response
      const response = await fetch('/api/responses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          userEmail: user?.email || 'anonymous',
          answers: quizState.answers,
          score,
          timeSpent,
          completedAt: new Date().toISOString()
        })
      })

      if (response.ok) {
        setQuizState(prev => ({
          ...prev,
          submitted: true,
          score,
          timeSpent
        }))
      } else {
        setError('Failed to submit quiz')
      }
    } catch (err) {
      setError('Failed to submit quiz')
      console.error('Error submitting quiz:', err)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading quiz...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">{error}</div>
        <Button onClick={() => navigate('/app/dashboard')}>Back to Dashboard</Button>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">Quiz session not found</div>
        <Button onClick={() => navigate('/app/dashboard')}>Back to Dashboard</Button>
      </div>
    )
  }

  if (quizState.submitted) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <div className="bg-white rounded-lg shadow-md p-8 border border-gray-200">
          <div className="mb-6">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Quiz Submitted!</h2>
            <p className="text-gray-600 mb-4">Your answers have been successfully submitted.</p>
          </div>

          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Results</h3>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-3xl font-bold text-blue-600">{quizState.score}%</div>
                <div className="text-sm text-gray-600">Score</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-green-600">{Math.floor((quizState.timeSpent || 0) / 60)}:{((quizState.timeSpent || 0) % 60).toString().padStart(2, '0')}</div>
                <div className="text-sm text-gray-600">Time Spent</div>
              </div>
            </div>
          </div>

          <div className="flex gap-4 justify-center">
            <Button onClick={() => navigate('/app/dashboard')}>
              Back to Dashboard
            </Button>
            <Button variant="outline" onClick={() => navigate('/app/history')}>
              View History
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const currentQuestion = session.questions[quizState.currentQuestionIndex]
  const progress = ((quizState.currentQuestionIndex + 1) / session.questions.length) * 100

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6 border border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-gray-900">{session.name}</h1>
          <span className="text-sm text-gray-600">
            Question {quizState.currentQuestionIndex + 1} of {session.questions.length}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      {/* Question */}
      <div className="bg-gray-100 rounded-lg p-8 mb-6 border border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">
          {currentQuestion.text}
        </h2>

        {/* Options */}
        <div className="space-y-3">
          {currentQuestion.options.map((option, index) => (
            <label
              key={index}
              className={`flex items-center p-4 rounded-lg border-2 cursor-pointer transition-all ${quizState.answers[currentQuestion.id] === index
                ? 'border-red-500 bg-white shadow-md'
                : 'border-gray-300 bg-white hover:border-gray-400'
                }`}
            >
              <input
                type="radio"
                name={`question-${currentQuestion.id}`}
                value={index}
                checked={quizState.answers[currentQuestion.id] === index}
                onChange={() => handleAnswerSelect(currentQuestion.id, index)}
                className="mr-3"
              />
              <span className="text-gray-900">{option}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={quizState.currentQuestionIndex === 0}
        >
          Previous
        </Button>

        <div className="text-sm text-gray-600">
          {Object.keys(quizState.answers).length} of {session.questions.length} answered
        </div>

        {quizState.currentQuestionIndex === session.questions.length - 1 ? (
          <Button
            onClick={handleSubmit}
            disabled={Object.keys(quizState.answers).length !== session.questions.length}
            className="bg-green-600 hover:bg-green-700"
          >
            Submit Quiz
          </Button>
        ) : (
          <Button
            onClick={handleNext}
            disabled={!quizState.answers[currentQuestion.id] && quizState.answers[currentQuestion.id] !== 0}
          >
            Next
          </Button>
        )}
      </div>
    </div>
  )
}

export default SessionPage

