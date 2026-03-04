import { useState, useEffect } from 'react'

interface QuizTimerProps {
  duration?: number // in seconds, default 300 (5 minutes)
  onTimeUp: () => void
  onAutoSave?: (answers: any, timeRemaining: number) => void
  sessionId?: string
  userEmail?: string
  className?: string
}

function QuizTimer({
  duration = 300,
  onTimeUp,
  onAutoSave,
  sessionId,
  userEmail,
  className = ''
}: QuizTimerProps) {
  const [timeLeft, setTimeLeft] = useState(duration)
  const [isRunning, setIsRunning] = useState(true)
  const [lastAutoSave, setLastAutoSave] = useState(0)

  // Calculate progress (0 to 100)
  const progress = ((duration - timeLeft) / duration) * 100

  // Calculate stroke dash offset for circular progress
  const radius = 40
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (progress / 100) * circumference

  // Format time display
  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60
  const timeDisplay = `${minutes}:${seconds.toString().padStart(2, '0')}`

  // Color based on time remaining
  const getColor = () => {
    if (timeLeft <= 60) return '#ef4444' // Red - last minute
    if (timeLeft <= 120) return '#f59e0b' // Orange - last 2 minutes
    return '#10b981' // Green - normal
  }

  // Warning messages
  const getWarningMessage = () => {
    if (timeLeft <= 30) return '⚠️ Time almost up!'
    if (timeLeft <= 60) return '⏰ 1 minute remaining'
    if (timeLeft <= 120) return '⚡ 2 minutes remaining'
    return null
  }

  useEffect(() => {
    if (!isRunning || timeLeft <= 0) return

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        const newTime = prev - 1

        // Auto-save every 30 seconds
        const now = Date.now()
        if (now - lastAutoSave >= 30000 && onAutoSave) {
          // Get current answers from localStorage or component state
          const answers = JSON.parse(localStorage.getItem(`quiz_answers_${sessionId}`) || '{}')
          onAutoSave(answers, newTime)
          setLastAutoSave(now)
        }

        if (newTime <= 0) {
          setIsRunning(false)
          onTimeUp()
          return 0
        }

        return newTime
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [timeLeft, isRunning, onTimeUp, lastAutoSave, onAutoSave, sessionId])

  // Resume timer from saved state
  useEffect(() => {
    if (sessionId && userEmail) {
      // Check if there's saved progress
      const savedProgress = localStorage.getItem(`quiz_progress_${sessionId}_${userEmail}`)
      if (savedProgress) {
        const { timeRemaining } = JSON.parse(savedProgress)
        if (timeRemaining > 0) {
          setTimeLeft(timeRemaining)
        }
      }
    }
  }, [sessionId, userEmail])

  return (
    <div className={`flex flex-col items-center space-y-2 ${className}`}>
      {/* Circular Progress Timer */}
      <div className="relative w-24 h-24">
        <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
          {/* Background circle */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            stroke="#e5e7eb"
            strokeWidth="8"
            fill="none"
          />
          {/* Progress circle */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            stroke={getColor()}
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-1000 ease-linear"
          />
        </svg>

        {/* Time display in center */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className={`text-xl font-bold`} style={{ color: getColor() }}>
              {timeDisplay}
            </div>
            <div className="text-xs text-gray-500">remaining</div>
          </div>
        </div>
      </div>

      {/* Warning message */}
      {getWarningMessage() && (
        <div className="text-sm font-medium animate-pulse" style={{ color: getColor() }}>
          {getWarningMessage()}
        </div>
      )}

      {/* Auto-save indicator */}
      <div className="text-xs text-gray-400">
        Auto-saving progress...
      </div>
    </div>
  )
}

export default QuizTimer

