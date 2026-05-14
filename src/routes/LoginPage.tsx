import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/contexts/AuthContext'
import { API_ENDPOINTS } from '../lib/services/api'
import { Key, Eye, EyeOff, AlertCircle, ArrowLeft, Mail } from 'lucide-react'

type Step = 'email' | 'password' | 'otp'

function LoginPage() {
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [otpInfo, setOtpInfo] = useState('')

  const { login, loginWithData, user, isLoading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (!isLoading && user) navigate('/app/dashboard', { replace: true })
  }, [user, isLoading, navigate])

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/app/dashboard'

  // Step 1 — check if the email has a password or needs OTP
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError('')

    try {
      const res = await fetch(API_ENDPOINTS.OTP_REQUEST, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Something went wrong. Try again.')
        return
      }

      if (data.hasPassword) {
        setStep('password')
      } else {
        // OTP sent (or silently dropped if email not found — security)
        setOtpInfo(`A 6-digit code was sent to ${email}. Check your inbox.`)
        setStep('otp')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Step 2a — password login
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const result = await login(email, password, false)
      if (result.success) {
        navigate(from, { replace: true })
      } else {
        setError(result.error || 'Login failed')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Step 2b — OTP verify
  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (otp.length !== 6) { setError('Enter the 6-digit code from your email.'); return }
    setLoading(true)
    setError('')
    try {
      const res = await fetch(API_ENDPOINTS.OTP_VERIFY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: email.trim(), code: otp.trim() }),
      })
      const data = await res.json()
      if (res.ok) {
        loginWithData(data)
        navigate(from, { replace: true })
      } else {
        setError(data.error || 'Invalid code. Please try again.')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Forgot password — request OTP even for password users
  const handleForgotPassword = async () => {
    if (!email.trim()) { setError('Enter your email address first.'); return }
    setLoading(true)
    setError('')
    try {
      const res = await fetch(API_ENDPOINTS.OTP_REQUEST, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: email.trim(), forgot: true }),
      })
      const data = await res.json()
      if (res.ok && data.sent) {
        setOtpInfo(`A reset code was sent to ${email}. Enter it below to sign in.`)
        setStep('otp')
      } else {
        setError(data.error || 'Could not send reset code.')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const resendOtp = async () => {
    setLoading(true)
    setError('')
    setOtp('')
    try {
      await fetch(API_ENDPOINTS.OTP_REQUEST, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: email.trim(), forgot: true }),
      })
      setOtpInfo(`A new code was sent to ${email}.`)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-screen w-full flex flex-col lg:flex-row overflow-hidden">

      {/* ── Left Panel ── */}
      <div className="hidden lg:flex lg:flex-[6] relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0a1628 0%, #0c2a5e 50%, #0a1628 100%)' }}>

        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #cc0000 0%, transparent 70%)', animation: 'pulse 6s ease-in-out infinite' }} />
        <div className="absolute bottom-0 -left-16 w-80 h-80 rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, #0066cc 0%, transparent 70%)', animation: 'pulse 8s ease-in-out infinite 2s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-5 border border-white" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full opacity-5 border border-white" />

        <div className="relative z-10 flex flex-col justify-between p-16 w-full">
          <div>
            <img src="/BDO Corner preview.png" alt="BDO" className="h-20 w-auto mb-14 drop-shadow-2xl" />
            <h1 className="text-5xl font-bold text-white leading-tight mb-6 tracking-tight">
              BDO<br />
              <span style={{ color: '#cc2200' }}>Skills</span> Pulse
            </h1>
            <p className="text-lg text-blue-100 leading-relaxed max-w-md">
              Empowering professionals through continuous assessment, knowledge validation,
              and competency tracking — aligned to BDO's quality and professional standards.
            </p>
          </div>
          <div>
            <div className="flex gap-10 mb-12">
              {[
                { value: '7', label: 'Departments' },
                { value: '100+', label: 'Staff Members' },
                { value: '∞', label: 'Learning Sessions' },
              ].map(stat => (
                <div key={stat.label}>
                  <p className="text-3xl font-bold text-white">{stat.value}</p>
                  <p className="text-sm text-blue-300 mt-0.5">{stat.label}</p>
                </div>
              ))}
            </div>
            <blockquote className="border-l-4 border-red-600 pl-4">
              <p className="text-sm text-blue-200 italic leading-relaxed">
                "Continuous learning is the foundation of professional excellence."
              </p>
              <footer className="text-xs text-blue-400 mt-1">BDO Zimbabwe</footer>
            </blockquote>
          </div>
        </div>
      </div>

      {/* ── Right Panel ── */}
      <div className="flex-1 lg:flex-[4] flex flex-col bg-gray-50 dark:bg-gray-900 overflow-y-auto">
        <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-md">

            <div className="lg:hidden text-center mb-8">
              <img src="/BDO Corner preview.png" alt="BDO" className="mx-auto h-14 w-auto mb-3" />
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-8 sm:p-10">

              {/* Back button (steps 2a/2b) */}
              {step !== 'email' && (
                <button
                  type="button"
                  onClick={() => { setStep('email'); setError(''); setPassword(''); setOtp('') }}
                  className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-6 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Change email
                </button>
              )}

              <div className="mb-8">
                <h2 className="text-2xl font-bold text-bdo-navy dark:text-gray-100 mb-1">
                  {step === 'email' && 'Welcome back'}
                  {step === 'password' && 'Enter your password'}
                  {step === 'otp' && 'Check your email'}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {step === 'email' && 'Sign in to your BDO Skills Pulse account'}
                  {step === 'password' && email}
                  {step === 'otp' && (otpInfo || `We sent a code to ${email}`)}
                </p>
              </div>

              {/* ── Step 1: Email ── */}
              {step === 'email' && (
                <form onSubmit={handleEmailSubmit} className="space-y-5">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Email Address
                    </label>
                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      required
                      autoFocus
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent transition-all text-sm"
                      placeholder="your.name@bdo.co.zw"
                      value={email}
                      onChange={e => { setEmail(e.target.value); setError('') }}
                    />
                  </div>

                  {error && <ErrorBox message={error} />}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-12 rounded-lg font-semibold text-white text-sm transition-all duration-150 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{ background: loading ? '#999' : 'linear-gradient(135deg, #cc2200 0%, #e63300 100%)' }}
                  >
                    {loading ? <Spinner /> : 'Continue'}
                  </button>

                  <div className="text-center pt-4 border-t border-gray-100 dark:border-gray-700">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Don't have an account?{' '}
                      <Link to="/register" className="font-semibold text-bdo-blue hover:text-blue-700 transition-colors">
                        Create Account
                      </Link>
                    </p>
                  </div>
                </form>
              )}

              {/* ── Step 2a: Password ── */}
              {step === 'password' && (
                <form onSubmit={handlePasswordSubmit} className="space-y-5">
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        required
                        autoFocus
                        className="w-full px-4 py-3 pr-11 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent transition-all text-sm"
                        placeholder="Enter your password"
                        value={password}
                        onChange={e => { setPassword(e.target.value); setError('') }}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  <div className="text-right">
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      disabled={loading}
                      className="text-sm font-medium text-bdo-blue hover:text-blue-700 inline-flex items-center gap-1 transition-colors disabled:opacity-50"
                    >
                      <Key className="h-3.5 w-3.5" />
                      Forgot password?
                    </button>
                  </div>

                  {error && <ErrorBox message={error} />}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-12 rounded-lg font-semibold text-white text-sm transition-all duration-150 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{ background: loading ? '#999' : 'linear-gradient(135deg, #cc2200 0%, #e63300 100%)' }}
                  >
                    {loading ? <Spinner /> : 'Sign In'}
                  </button>
                </form>
              )}

              {/* ── Step 2b: OTP ── */}
              {step === 'otp' && (
                <form onSubmit={handleOtpSubmit} className="space-y-5">
                  <div>
                    <label htmlFor="otp" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      6-digit code
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                      <input
                        id="otp"
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={6}
                        autoComplete="one-time-code"
                        autoFocus
                        required
                        className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent transition-all text-sm tracking-widest font-mono"
                        placeholder="000000"
                        value={otp}
                        onChange={e => { setOtp(e.target.value.replace(/\D/g, '')); setError('') }}
                      />
                    </div>
                    <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                      Code expires in 10 minutes.{' '}
                      <button type="button" onClick={resendOtp} disabled={loading}
                        className="text-bdo-blue hover:underline disabled:opacity-50">
                        Resend code
                      </button>
                    </p>
                  </div>

                  {error && <ErrorBox message={error} />}

                  <button
                    type="submit"
                    disabled={loading || otp.length !== 6}
                    className="w-full h-12 rounded-lg font-semibold text-white text-sm transition-all duration-150 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{ background: (loading || otp.length !== 6) ? '#999' : 'linear-gradient(135deg, #cc2200 0%, #e63300 100%)' }}
                  >
                    {loading ? <Spinner /> : 'Verify & Sign In'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 text-center">
          <p className="text-xs text-gray-400 dark:text-gray-600">
            Confidential. For authorized BDO Zimbabwe staff only.
          </p>
        </div>
      </div>
    </div>
  )
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 flex items-start gap-2" role="alert">
      <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
      <p className="text-sm text-red-700 dark:text-red-300">{message}</p>
    </div>
  )
}

function Spinner() {
  return (
    <span className="flex items-center justify-center gap-2">
      <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      Please wait…
    </span>
  )
}

export default LoginPage
