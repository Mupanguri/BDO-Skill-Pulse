import { useState, useEffect, useCallback } from 'react'
import { X, ChevronRight, ChevronLeft, SkipForward } from 'lucide-react'

export interface TutorialStep {
  title: string
  message: string
  highlight?: string
}

interface Props {
  pageKey: string
  steps: TutorialStep[]
  role?: 'user' | 'admin' | 'hr' | 'superadmin'
  forceShow?: boolean
  onComplete?: () => void
}

const STORAGE_KEY = (key: string) => `bdo_tutorial_seen_${key}`

export function useTutorialSeen(pageKey: string) {
  return localStorage.getItem(STORAGE_KEY(pageKey)) === 'true'
}

export function markTutorialSeen(pageKey: string) {
  localStorage.setItem(STORAGE_KEY(pageKey), 'true')
}

export function resetAllTutorials() {
  Object.keys(localStorage)
    .filter(k => k.startsWith('bdo_tutorial_seen_'))
    .forEach(k => localStorage.removeItem(k))
}

export default function TutorialAssistant({ pageKey, steps, forceShow = false, onComplete }: Props) {
  const [visible, setVisible] = useState(false)
  const [step, setStep] = useState(0)
  const [animating, setAnimating] = useState(false)
  const [minimized, setMinimized] = useState(false)

  useEffect(() => {
    const seen = localStorage.getItem(STORAGE_KEY(pageKey)) === 'true'
    if (!seen || forceShow) {
      // Small delay so page renders first
      const t = setTimeout(() => setVisible(true), 800)
      return () => clearTimeout(t)
    }
  }, [pageKey, forceShow])

  const dismiss = useCallback((markSeen = true) => {
    setAnimating(true)
    setTimeout(() => {
      setVisible(false)
      setAnimating(false)
      if (markSeen) markTutorialSeen(pageKey)
      onComplete?.()
    }, 300)
  }, [pageKey, onComplete])

  const next = () => {
    if (step < steps.length - 1) {
      setStep(s => s + 1)
    } else {
      dismiss(true)
    }
  }

  const prev = () => {
    if (step > 0) setStep(s => s - 1)
  }

  if (!visible || steps.length === 0) return null

  const current = steps[step]
  const isLast = step === steps.length - 1

  return (
    <div
      className={`fixed bottom-6 right-6 z-[9999] flex flex-col items-end gap-3 transition-all duration-300 ${
        animating ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'
      }`}
      style={{ maxWidth: 340 }}
    >
      {/* Speech bubble */}
      {!minimized && (
        <div
          className="relative rounded-2xl shadow-2xl p-5 w-80 animate-fade-in"
          style={{
            background: 'linear-gradient(135deg, #0a1f5c 0%, #0c2a5e 100%)',
            border: '1px solid rgba(255,255,255,0.15)'
          }}
        >
          {/* Close */}
          <button
            onClick={() => dismiss(true)}
            className="absolute top-3 right-3 text-gray-400 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Step indicator */}
          <div className="flex gap-1 mb-3">
            {steps.map((_, i) => (
              <div
                key={i}
                className="h-1 rounded-full transition-all duration-300"
                style={{
                  flex: 1,
                  background: i <= step ? '#cc2200' : 'rgba(255,255,255,0.2)'
                }}
              />
            ))}
          </div>

          {/* Title */}
          <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: '#cc6644' }}>
            {current.title}
          </p>

          {/* Message */}
          <p className="text-sm leading-relaxed text-white/90 mb-4 pr-2">
            {current.message}
          </p>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => dismiss(true)}
              className="text-xs text-white/50 hover:text-white/80 flex items-center gap-1 transition-colors"
            >
              <SkipForward className="h-3 w-3" />
              Skip all
            </button>

            <div className="flex gap-2">
              {step > 0 && (
                <button
                  onClick={prev}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Back
                </button>
              )}
              <button
                onClick={next}
                className="flex items-center gap-1 px-4 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors"
                style={{ background: '#cc2200' }}
              >
                {isLast ? 'Got it!' : 'Next'}
                {!isLast && <ChevronRight className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

          {/* Tail pointing down-right to the owl */}
          <div
            className="absolute -bottom-2.5 right-14"
            style={{
              width: 0, height: 0,
              borderLeft: '10px solid transparent',
              borderRight: '10px solid transparent',
              borderTop: '10px solid #0c2a5e'
            }}
          />
        </div>
      )}

      {/* Owl avatar */}
      <div className="flex items-end gap-2">
        {minimized && (
          <div
            className="bg-bdo-navy text-white text-xs px-3 py-1.5 rounded-full shadow-md cursor-pointer animate-fade-in"
            onClick={() => setMinimized(false)}
            style={{ background: '#0a1f5c', border: '1px solid rgba(255,255,255,0.15)' }}
          >
            Need help? 👋
          </div>
        )}
        <button
          onClick={() => setMinimized(m => !m)}
          className="relative focus:outline-none group"
          title={minimized ? 'Show tutorial' : 'Minimize tutorial'}
        >
          <div
            className="rounded-full shadow-2xl overflow-hidden transition-transform duration-200 group-hover:scale-105"
            style={{
              width: 72, height: 72,
              border: '3px solid #cc2200',
              background: '#000'
            }}
          >
            <img
              src="/owl-assistant.png"
              alt="BDO Assistant"
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback if image not found
                const t = e.currentTarget
                t.style.display = 'none'
                const parent = t.parentElement
                if (parent) parent.innerHTML = '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#0a1f5c;font-size:28px;">🦉</div>'
              }}
            />
          </div>
          {/* Pulse ring */}
          {!minimized && (
            <span
              className="absolute inset-0 rounded-full animate-ping"
              style={{ border: '2px solid #cc2200', opacity: 0.4 }}
            />
          )}
        </button>
      </div>
    </div>
  )
}
