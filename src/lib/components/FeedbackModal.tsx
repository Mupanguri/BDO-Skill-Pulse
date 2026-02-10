import { useState, useEffect, useRef } from 'react'
import { Star, X } from 'lucide-react'
import Button from './Button'

interface FeedbackModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (rating: number, comments: string) => void
  quizName: string
  loading?: boolean
}

function FeedbackModal({ isOpen, onClose, onSubmit, quizName, loading = false }: FeedbackModalProps) {
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [comments, setComments] = useState('')
  const modalRef = useRef<HTMLDivElement>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (rating > 0) {
      onSubmit(rating, comments.trim())
    }
  }

  const handleClose = () => {
    setRating(0)
    setHoverRating(0)
    setComments('')
    onClose()
  }

  // Handle Escape key
  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen])

  // Focus trap
  useEffect(() => {
    if (!isOpen || !modalRef.current) return

    const focusableElements = modalRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )

    const firstElement = focusableElements[0] as HTMLElement
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault()
          lastElement?.focus()
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault()
          firstElement?.focus()
        }
      }
    }

    document.addEventListener('keydown', handleTab)
    firstElement?.focus()

    return () => document.removeEventListener('keydown', handleTab)
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fade-in">
      <div
        ref={modalRef}
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-zoom-in"
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 id="feedback-title" className="text-xl font-semibold text-bdo-navy">
            Quiz Feedback
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
            aria-label="Close feedback form"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              How was your experience with:
            </h3>
            <p className="text-gray-600 font-medium">{quizName}</p>
          </div>

          {/* Star Rating */}
          <div className="space-y-3">
            <label id="rating-label" className="block text-sm font-medium text-gray-700 text-center">
              Rate your experience
            </label>
            <div className="flex justify-center space-x-1" role="group" aria-labelledby="rating-label">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="focus:outline-none focus:ring-2 focus:ring-bdo-red rounded-lg p-1 transition-transform hover:scale-110"
                  aria-label={`Rate ${star} out of 5 stars`}
                  aria-pressed={rating === star}
                >
                  <Star
                    className={`h-8 w-8 ${
                      star <= (hoverRating || rating)
                        ? 'text-yellow-400 fill-current'
                        : 'text-gray-300'
                    } transition-colors`}
                    aria-hidden="true"
                  />
                </button>
              ))}
            </div>
            <div className="text-center text-sm text-gray-600 font-medium" role="status" aria-live="polite">
              {rating === 0 ? 'Click to rate' :
               rating === 1 ? 'Poor' :
               rating === 2 ? 'Fair' :
               rating === 3 ? 'Good' :
               rating === 4 ? 'Very Good' : 'Excellent'}
            </div>
          </div>

          {/* Comments */}
          <div>
            <label htmlFor="comments" className="block text-sm font-medium text-gray-700 mb-2">
              Additional Comments (Optional)
            </label>
            <textarea
              id="comments"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Tell us about your experience..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-bdo-red focus:border-bdo-red transition-colors"
              maxLength={500}
              aria-describedby="char-count"
            />
            <div id="char-count" className="text-xs text-gray-500 mt-1">
              {comments.length}/500 characters
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
              fullWidth
            >
              Skip
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={rating === 0 || loading}
              loading={loading}
              fullWidth
            >
              Submit Feedback
            </Button>
          </div>

          {/* Privacy Note */}
          <div className="text-xs text-gray-500 text-center bg-gray-50 p-3 rounded">
            Your feedback helps us improve the quiz experience. All responses are anonymous.
          </div>
        </form>
      </div>
    </div>
  )
}

export default FeedbackModal
