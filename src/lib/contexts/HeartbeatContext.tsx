import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'

interface HeartbeatContextType {
  soundEnabled: boolean
  toggleSound: () => void
}

const HeartbeatContext = createContext<HeartbeatContextType>({ soundEnabled: false, toggleSound: () => {} })

export function useHeartbeat() {
  return useContext(HeartbeatContext)
}

export function HeartbeatProvider({ children }: { children: React.ReactNode }) {
  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem('heartbeat') === 'on')
  const audioCtxRef = useRef<AudioContext | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const getCtx = () => {
    if (!audioCtxRef.current) audioCtxRef.current = new AudioContext()
    if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume()
    return audioCtxRef.current
  }

  const playBeat = useCallback(() => {
    try {
      const ctx = getCtx()
      const now = ctx.currentTime

      const makeBeat = (startOffset: number, startHz: number, endHz: number, gainPeak: number, filterHz: number) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        const filter = ctx.createBiquadFilter()

        filter.type = 'lowpass'
        filter.frequency.value = filterHz

        osc.connect(filter)
        filter.connect(gain)
        gain.connect(ctx.destination)

        osc.frequency.setValueAtTime(startHz, now + startOffset)
        osc.frequency.exponentialRampToValueAtTime(endHz, now + startOffset + 0.15)

        gain.gain.setValueAtTime(0, now + startOffset)
        gain.gain.linearRampToValueAtTime(gainPeak, now + startOffset + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.001, now + startOffset + 0.15)

        osc.start(now + startOffset)
        osc.stop(now + startOffset + 0.2)
      }

      makeBeat(0, 80, 40, 0.4, 200)
      makeBeat(0.2, 70, 35, 0.3, 180)
    } catch {
      // AudioContext may not be available in all environments
    }
  }, [])

  // Init AudioContext on first user gesture (browser autoplay policy)
  useEffect(() => {
    const init = () => {
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContext()
    }
    document.addEventListener('click', init, { once: true })
    document.addEventListener('keydown', init, { once: true })
    return () => {
      document.removeEventListener('click', init)
      document.removeEventListener('keydown', init)
    }
  }, [])

  // Start/stop interval when soundEnabled changes
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (soundEnabled) {
      playBeat()
      intervalRef.current = setInterval(playBeat, 6000)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [soundEnabled, playBeat])

  const toggleSound = () => {
    const next = !soundEnabled
    setSoundEnabled(next)
    localStorage.setItem('heartbeat', next ? 'on' : 'off')
    if (next) getCtx()
  }

  return (
    <HeartbeatContext.Provider value={{ soundEnabled, toggleSound }}>
      {children}
    </HeartbeatContext.Provider>
  )
}
