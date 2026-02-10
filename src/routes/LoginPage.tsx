import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/contexts/AuthContext'
import Button from '../lib/components/Button'
import { Key, Eye, EyeOff, AlertCircle } from 'lucide-react'

function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('http://localhost:3001/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password })
      })

      const data = await response.json()

      if (response.ok) {
        // Login successful - update auth context with tokens
        login(data.email, data.department, data.isAdmin, data.accessToken, data.refreshToken)

        // Redirect to the intended page or appropriate dashboard based on user role
        const from = location.state?.from?.pathname || (data.isAdmin ? '/admin' : '/dashboard')
        navigate(from, { replace: true })
      } else {
        setError(data.error || 'Login failed')
      }
    } catch (err) {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-screen w-full flex flex-col lg:flex-row overflow-hidden">
      {/* Left Side - Image Section (60%) */}
      <div className="hidden lg:flex lg:flex-[6] relative bg-gradient-to-br from-bdo-navy via-bdo-blue to-bdo-navy">
        <div className="absolute inset-0 flex items-center justify-center p-12">
          <div className="max-w-2xl">
            <img
              src="/BDO Corner preview.png"
              alt="BDO Logo"
              className="w-64 h-auto mb-8 drop-shadow-2xl"
            />
            <h1 className="text-5xl font-bold text-white mb-6 leading-tight">
              Welcome to<br />BDO Skills Pulse
            </h1>
            <p className="text-xl text-blue-100 leading-relaxed">
              Empowering teams through continuous learning and skill assessment.
              Track progress, measure performance, and drive excellence across your organization.
            </p>
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute top-10 right-10 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-20 w-40 h-40 bg-bdo-red/20 rounded-full blur-3xl"></div>
      </div>

      {/* Right Side - Form Section (40%) */}
      <div className="flex-1 lg:flex-[4] flex items-center justify-center p-6 sm:p-12 bg-white dark:bg-gray-900 overflow-y-auto">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <img
              src="/BDO Corner preview.png"
              alt="BDO Logo"
              className="mx-auto h-16 w-auto mb-4"
            />
          </div>

          {/* Header */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-bdo-navy mb-2">
              Welcome Back
            </h2>
            <p className="text-gray-600">
              Sign in to continue to your account
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="ui-label">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="ui-field"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="ui-label">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  className="ui-field pr-10"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2" role="alert">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Forgot Password Link */}
            <div className="flex items-center justify-between">
              <Link
                to="/password-reset"
                className="text-sm font-medium text-bdo-blue hover:text-blue-700 flex items-center gap-1 transition-colors"
              >
                <Key className="h-4 w-4" aria-hidden="true" />
                <span>Forgot password?</span>
              </Link>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              variant="primary"
              loading={loading}
              fullWidth
              className="h-12"
            >
              Sign In
            </Button>

            {/* Register Link */}
            <div className="text-center pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                Don't have an account?{' '}
                <Link
                  to="/register"
                  className="font-semibold text-bdo-blue hover:text-blue-700 transition-colors"
                >
                  Create Account
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
