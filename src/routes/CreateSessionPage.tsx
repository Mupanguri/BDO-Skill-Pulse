import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Trash2, AlertCircle } from 'lucide-react'
import Button from '../lib/components/Button'
import Breadcrumb from '../lib/components/Breadcrumb'

interface Question {
  id: string
  text: string
  options: string[]
  correctAnswer: number
  type: 'multiple-choice' | 'true-false'
}

function CreateSessionPage() {
  const navigate = useNavigate()
  const [sessionName, setSessionName] = useState('')
  const [sessionDate, setSessionDate] = useState('')
  const [sessionTime, setSessionTime] = useState('')
  const [targetDepartment, setTargetDepartment] = useState('Tax')
  const [questions, setQuestions] = useState<Question[]>([
    {
      id: '1',
      text: '',
      options: ['', '', '', ''],
      correctAnswer: 0,
      type: 'multiple-choice'
    }
  ])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const addQuestion = () => {
    const newQuestion: Question = {
      id: Date.now().toString(),
      text: '',
      options: ['', '', '', ''],
      correctAnswer: 0,
      type: 'multiple-choice'
    }
    setQuestions([...questions, newQuestion])
  }

  const removeQuestion = (questionId: string) => {
    if (questions.length > 1) {
      setQuestions(questions.filter(q => q.id !== questionId))
    }
  }

  const updateQuestion = (questionId: string, field: keyof Question, value: any) => {
    setQuestions(questions.map(q =>
      q.id === questionId ? { ...q, [field]: value } : q
    ))
  }

  const updateQuestionOption = (questionId: string, optionIndex: number, value: string) => {
    setQuestions(questions.map(q =>
      q.id === questionId
        ? { ...q, options: q.options.map((opt, i) => i === optionIndex ? value : opt) }
        : q
    ))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Validate form
      if (!sessionName.trim() || !sessionDate || !sessionTime) {
        setError('Please fill in all session details')
        setLoading(false)
        return
      }

      // Validate questions
      for (const question of questions) {
        if (!question.text.trim()) {
          setError('Please fill in all question texts')
          setLoading(false)
          return
        }
        if (question.options.some(opt => !opt.trim())) {
          setError('Please fill in all answer options')
          setLoading(false)
          return
        }
      }

      const sessionData = {
        name: sessionName,
        date: new Date(`${sessionDate}T${sessionTime}`).toISOString(),
        time: sessionTime,
        department: targetDepartment,
        questions: questions.map(q => ({
          id: q.id,
          text: q.text,
          options: q.options,
          correctAnswer: q.correctAnswer,
          type: q.type
        })),
        createdBy: 'admin@bdo.co.zw', // This should come from auth context
        isActive: false
      }

      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sessionData),
      })

      if (response.ok) {
        // Send notifications to the target department
        try {
          const notificationResponse = await fetch(`/api/department/${targetDepartment}/notifications`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              type: 'quiz_posted',
              title: 'New Quiz Available',
              message: `${'ADMIN'} has posted a quiz for the ${targetDepartment === 'everyone' ? 'all departments' : targetDepartment + ' department'} to be completed within the stated time lines. please address this ticket.`,
              adminEmail: 'admin@bdo.co.zw',
              quizName: sessionName
            })
          })

          if (!notificationResponse.ok) {
            console.error('Failed to send notifications')
          }
        } catch (error) {
          console.error('Error sending notifications:', error)
        }

        navigate('/admin')
      } else {
        throw new Error('Failed to create session')
      }
    } catch (error) {
      console.error('Failed to create session:', error)
      setError('Failed to create session. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="ui-page page-enter">
      {/* Breadcrumb */}
      <Breadcrumb items={[
        { label: 'Dashboard', href: '/admin' },
        { label: 'Create Session' }
      ]} />

      {/* Header */}
      <div className="ui-page-header mb-6">
        <h1 className="ui-page-title">Create New Quiz Session</h1>
        <Button variant="outline" onClick={() => navigate('/admin')}>
          Cancel
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3" role="alert">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Session Details */}
        <div className="ui-card-strong">
          <h2 className="text-xl font-bold text-bdo-navy mb-4">Session Details</h2>
          <div className="ui-grid-form">
            <div className="col-span-full sm:col-span-2">
              <label htmlFor="session-name" className="ui-label">
                Session Name
              </label>
              <input
                id="session-name"
                type="text"
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
                className="ui-field w-full"
                placeholder="e.g., Q1 2024 Tax Quiz"
                required
              />
            </div>
            <div>
              <label htmlFor="target-department" className="ui-label">
                Target Department
              </label>
              <select
                id="target-department"
                value={targetDepartment}
                onChange={(e) => setTargetDepartment(e.target.value)}
                className="ui-field w-full"
                required
              >
                <option value="Tax">Tax Department</option>
                <option value="Audit">Audit Department</option>
                <option value="everyone">Everyone (All Departments)</option>
              </select>
            </div>
            <div>
              <label htmlFor="session-date" className="ui-label">
                Date
              </label>
              <input
                id="session-date"
                type="date"
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
                className="ui-field w-full"
                required
              />
            </div>
            <div>
              <label htmlFor="session-time" className="ui-label">
                Time
              </label>
              <input
                id="session-time"
                type="time"
                value={sessionTime}
                onChange={(e) => setSessionTime(e.target.value)}
                className="ui-field w-full"
                required
              />
            </div>
          </div>
        </div>

        {/* Questions */}
        <div className="ui-card-strong">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <h2 className="text-xl font-bold text-bdo-navy">Questions ({questions.length})</h2>
            <Button type="button" variant="secondary" onClick={addQuestion} size="sm">
              <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
              Add Question
            </Button>
          </div>

          <div className="space-y-6">
            {questions.map((question, questionIndex) => (
              <div key={question.id} className="border-2 border-gray-200 rounded-xl p-4 sm:p-6 hover:border-bdo-blue transition-colors">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <h3 className="text-lg font-bold text-bdo-navy">
                    Question {questionIndex + 1}
                  </h3>
                  {questions.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeQuestion(question.id)}
                      aria-label={`Delete question ${questionIndex + 1}`}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <label htmlFor={`question-text-${question.id}`} className="ui-label">
                      Question Text
                    </label>
                    <textarea
                      id={`question-text-${question.id}`}
                      value={question.text}
                      onChange={(e) => updateQuestion(question.id, 'text', e.target.value)}
                      className="ui-field w-full"
                      rows={3}
                      placeholder="Enter your question here..."
                      required
                    />
                  </div>

                  <div>
                    <label className="ui-label">Answer Options</label>
                    <fieldset className="space-y-3">
                      <legend className="sr-only">Select the correct answer</legend>
                      {question.options.map((option, optionIndex) => (
                        <div key={optionIndex} className="flex items-center gap-3">
                          <input
                            type="radio"
                            id={`correct-${question.id}-${optionIndex}`}
                            name={`correct-${question.id}`}
                            checked={question.correctAnswer === optionIndex}
                            onChange={() => updateQuestion(question.id, 'correctAnswer', optionIndex)}
                            className="h-4 w-4 text-bdo-red focus:ring-bdo-red flex-shrink-0"
                            aria-label={`Mark option ${optionIndex + 1} as correct answer`}
                          />
                          <input
                            type="text"
                            value={option}
                            onChange={(e) => updateQuestionOption(question.id, optionIndex, e.target.value)}
                            className="ui-field flex-1"
                            placeholder={`Option ${optionIndex + 1}`}
                            required
                            aria-label={`Answer option ${optionIndex + 1}`}
                          />
                        </div>
                      ))}
                    </fieldset>
                    <p className="text-xs text-gray-500 mt-2">
                      Select the radio button next to the correct answer
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/admin')}
            disabled={loading}
            className="sm:order-1"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={loading}
            className="sm:order-2"
          >
            Create Session
          </Button>
        </div>
      </form>
    </div>
  )
}

export default CreateSessionPage
