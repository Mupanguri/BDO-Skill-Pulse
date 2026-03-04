import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertTriangle, CheckCircle, Clock, Users } from 'lucide-react'
import Button from '../lib/components/Button'

function PasswordResetPage() {
  const [email, setEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [resetData, setResetData] = useState<any>(null)
  const [showResetForm, setShowResetForm] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  // Password validation requirements
  const passwordRequirements = [
    { test: (pwd: string) => pwd.length >= 8, label: 'At least 8 characters' },
    { test: (pwd: string) => /[A-Z]/.test(pwd), label: 'One uppercase letter' },
    { test: (pwd: string) => /[a-z]/.test(pwd), label: 'One lowercase letter' },
    { test: (pwd: string) => /\d/.test(pwd), label: 'One number' },
    { test: (pwd: string) => /[!@#$%^&*(),.?":{}|<>]/.test(pwd), label: 'One special character' }
  ]

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) return false
    const domain = email.split('@')[1]
    return domain === 'bdo.co.zw'
  }

  const validatePassword = (password: string) => {
    return passwordRequirements.every(req => req.test(password))
  }

  const checkResetEligibility = async () => {
    if (!validateEmail(email)) {
      setError('Please enter a valid @bdo.co.zw email address')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/password-reset/check/${email}`)
      const data = await response.json()

      if (response.ok) {
        setResetData(data)
        if (data.canReset) {
          setShowResetForm(true)
        } else {
          setShowResetForm(false)
        }
      } else {
        setError(data.error || 'Failed to check reset eligibility')
      }
    } catch (err) {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validatePassword(newPassword)) {
      setError('Password does not meet requirements')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/password-reset/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          newPassword: newPassword
        })
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess('Password reset successfully! Redirecting to login...')
        setTimeout(() => {
          navigate('/login')
        }, 2000)
      } else {
        setError(data.error || 'Password reset failed')
      }
    } catch (err) {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleContactAdmin = async () => {
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/password-reset/contact-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userEmail: email,
          reason: 'Monthly password reset limit exceeded'
        })
      })

      if (response.ok) {
        setSuccess('Request sent to admin. You will be contacted soon.')
      } else {
        setError('Failed to send request to admin')
      }
    } catch (err) {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const getPasswordStrength = () => {
    const passed = passwordRequirements.filter(req => req.test(newPassword)).length
    if (passed === 0) return { label: 'Very Weak', color: 'bg-red-500' }
    if (passed <= 2) return { label: 'Weak', color: 'bg-orange-500' }
    if (passed <= 4) return { label: 'Good', color: 'bg-yellow-500' }
    return { label: 'Strong', color: 'bg-green-500' }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <img
            src="/bdo_logo.png"
            alt="BDO Logo"
            className="mx-auto h-16 w-auto object-contain"
          />
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Reset Password
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Reset your BDO Quiz System password
          </p>
        </div>

        {!resetData && !showResetForm && (
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <input
                id="email"
                type="email"
                required
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500 focus:z-10 sm:text-sm"
                placeholder="your.email@bdo.co.zw"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <p className="mt-1 text-xs text-gray-500">
                Must be a valid @bdo.co.zw email address
              </p>
            </div>

            <Button
              onClick={checkResetEligibility}
              disabled={loading || !email}
              className="w-full"
            >
              {loading ? 'Checking...' : 'Check Reset Eligibility'}
            </Button>
          </div>
        )}

        {resetData && !resetData.canReset && !showResetForm && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-start">
              <AlertTriangle className="h-6 w-6 text-red-600 mt-0.5 mr-3" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-red-900 mb-2">
                  Monthly Reset Limit Exceeded
                </h3>
                <p className="text-red-800 mb-4">
                  You have used all 3 password resets for this month. You can reset your password again after {new Date(resetData.nextResetDate).toLocaleDateString()}.
                </p>
                <div className="bg-red-100 rounded p-3 mb-4">
                  <div className="flex items-center text-sm text-red-800">
                    <Clock className="h-4 w-4 mr-2" />
                    <span>Next reset available: {new Date(resetData.nextResetDate).toLocaleDateString()}</span>
                  </div>
                </div>
                <Button
                  onClick={handleContactAdmin}
                  disabled={loading}
                  className="w-full bg-red-600 hover:bg-red-700"
                >
                  <Users className="h-4 w-4 mr-2" />
                  {loading ? 'Sending...' : 'Contact Admin for Help'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {showResetForm && (
          <form onSubmit={handlePasswordReset} className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center text-sm text-blue-800">
                <CheckCircle className="h-4 w-4 mr-2" />
                <span>You can reset your password. {resetData.remainingResets} resets remaining this month.</span>
              </div>
            </div>

            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                New Password
              </label>
              <input
                id="newPassword"
                type="password"
                required
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500 focus:z-10 sm:text-sm"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />

              {newPassword && (
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-600">Password Strength:</span>
                    <span className={`text-xs font-medium ${getPasswordStrength().color.replace('bg-', 'text-')}`}>
                      {getPasswordStrength().label}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${getPasswordStrength().color}`}
                      style={{
                        width: `${(passwordRequirements.filter(req => req.test(newPassword)).length / passwordRequirements.length) * 100}%`
                      }}
                    ></div>
                  </div>
                </div>
              )}

              <div className="mt-2 space-y-1">
                {passwordRequirements.map((req, index) => (
                  <div key={index} className="flex items-center text-xs">
                    {req.test(newPassword) ? (
                      <CheckCircle className="h-3 w-3 text-green-500 mr-2" />
                    ) : (
                      <AlertTriangle className="h-3 w-3 text-gray-400 mr-2" />
                    )}
                    <span className={req.test(newPassword) ? 'text-green-600' : 'text-gray-500'}>
                      {req.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm New Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                required
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500 focus:z-10 sm:text-sm"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              {confirmPassword && (
                <div className="mt-1 flex items-center text-xs">
                  {newPassword === confirmPassword ? (
                    <>
                      <CheckCircle className="h-3 w-3 text-green-500 mr-2" />
                      <span className="text-green-600">Passwords match</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-3 w-3 text-red-500 mr-2" />
                      <span className="text-red-600">Passwords do not match</span>
                    </>
                  )}
                </div>
              )}
            </div>

            <Button
              type="submit"
              disabled={loading || !validatePassword(newPassword) || newPassword !== confirmPassword}
              className="w-full"
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </Button>
          </form>
        )}

        {error && (
          <div className="text-red-600 text-sm text-center bg-red-50 p-3 rounded">
            {error}
          </div>
        )}

        {success && (
          <div className="text-green-600 text-sm text-center bg-green-50 p-3 rounded">
            {success}
          </div>
        )}

        <div className="text-center">
          <Link to="/login" className="font-medium text-red-600 hover:text-red-500">
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  )
}

export default PasswordResetPage

