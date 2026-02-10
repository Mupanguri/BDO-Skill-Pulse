import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react'
import Button from '../lib/components/Button'

function RegisterPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    department: 'Tax'
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const navigate = useNavigate()

  const departments = ['Tax', 'Audit', 'IT', 'Consulting', 'Assurance']

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

    // Check domain restriction
    const domain = email.split('@')[1]
    return domain === 'bdo.co.zw'
  }

  const validatePassword = (password: string) => {
    return passwordRequirements.every(req => req.test(password))
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear errors when user starts typing
    if (error) setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    // Validation
    if (!validateEmail(formData.email)) {
      setError('Please use a valid @bdo.co.zw email address')
      setLoading(false)
      return
    }

    if (!validatePassword(formData.password)) {
      setError('Password does not meet requirements')
      setLoading(false)
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    try {
      const response = await fetch('http://localhost:3001/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          department: formData.department
        })
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess('Account created successfully! Redirecting to login...')
        setTimeout(() => {
          navigate('/login')
        }, 2000)
      } else {
        setError(data.error || 'Registration failed')
      }
    } catch (err) {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const getPasswordStrength = () => {
    const passed = passwordRequirements.filter(req => req.test(formData.password)).length
    if (passed === 0) return { label: 'Very Weak', color: 'bg-red-500', width: '20%' }
    if (passed <= 2) return { label: 'Weak', color: 'bg-orange-500', width: '40%' }
    if (passed <= 4) return { label: 'Good', color: 'bg-yellow-500', width: '75%' }
    return { label: 'Strong', color: 'bg-green-500', width: '100%' }
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
              Join BDO<br />Skills Pulse
            </h1>
            <p className="text-xl text-blue-100 leading-relaxed">
              Create your account and start your journey with continuous learning and skill development.
              Track your progress and measure your professional growth.
            </p>
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute top-10 right-10 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-20 w-40 h-40 bg-bdo-red/20 rounded-full blur-3xl"></div>
      </div>

      {/* Right Side - Form Section (40%) */}
      <div className="flex-1 lg:flex-[4] flex items-center justify-center p-6 sm:p-12 bg-white dark:bg-gray-900 overflow-y-auto flex-shrink-0">
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
              Create Your Account
            </h2>
            <p className="text-gray-600">
              Join BDO Skills Pulse
            </p>
          </div>

          {/* Registration Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="ui-label">
                Email Address
              </label>
              <div className="relative">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="ui-field pr-10"
                  placeholder="your.name@bdo.co.zw"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                />
                {formData.email && (
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    {validateEmail(formData.email) ? (
                      <CheckCircle className="h-5 w-5 text-green-500" aria-label="Valid email" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-red-500" aria-label="Invalid email" />
                    )}
                  </div>
                )}
              </div>
              <p className="mt-1.5 text-xs text-gray-500">
                Must be a valid @bdo.co.zw email address
              </p>
            </div>

            {/* Department Field */}
            <div>
              <label htmlFor="department" className="ui-label">
                Department
              </label>
              <select
                id="department"
                name="department"
                className="ui-field"
                value={formData.department}
                onChange={(e) => handleInputChange('department', e.target.value)}
              >
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
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
                  autoComplete="new-password"
                  required
                  className="ui-field pr-10"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
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

              {/* Password Strength Indicator */}
              {formData.password && (
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-600">Password Strength</span>
                    <span className={`text-xs font-semibold ${getPasswordStrength().color.replace('bg-', 'text-')}`}>
                      {getPasswordStrength().label}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${getPasswordStrength().color}`}
                      style={{ width: getPasswordStrength().width }}
                      role="progressbar"
                      aria-valuenow={passwordRequirements.filter(req => req.test(formData.password)).length}
                      aria-valuemin={0}
                      aria-valuemax={passwordRequirements.length}
                    />
                  </div>
                </div>
              )}

              {/* Password Requirements */}
              <fieldset className="mt-3 space-y-1.5">
                <legend className="sr-only">Password requirements</legend>
                {passwordRequirements.map((req, index) => {
                  const met = req.test(formData.password)
                  return (
                    <div key={index} className="flex items-center gap-2 text-xs">
                      {met ? (
                        <CheckCircle className="h-3.5 w-3.5 text-green-500 flex-shrink-0" aria-hidden="true" />
                      ) : (
                        <div className="h-3.5 w-3.5 rounded-full border-2 border-gray-300 flex-shrink-0" aria-hidden="true" />
                      )}
                      <span className={met ? 'text-green-700 font-medium' : 'text-gray-500'}>
                        {req.label}
                      </span>
                    </div>
                  )
                })}
              </fieldset>
            </div>

            {/* Confirm Password Field */}
            <div>
              <label htmlFor="confirmPassword" className="ui-label">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  className="ui-field pr-10"
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              {formData.confirmPassword && (
                <div className="mt-2 flex items-center gap-2 text-xs" role="status">
                  {formData.password === formData.confirmPassword ? (
                    <>
                      <CheckCircle className="h-3.5 w-3.5 text-green-500" aria-hidden="true" />
                      <span className="text-green-700 font-medium">Passwords match</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-3.5 w-3.5 text-red-500" aria-hidden="true" />
                      <span className="text-red-600 font-medium">Passwords do not match</span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2" role="alert">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-start gap-2" role="alert">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
                <p className="text-sm text-green-700">{success}</p>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              variant="primary"
              loading={loading}
              fullWidth
              className="h-12"
            >
              Create Account
            </Button>

            {/* Login Link */}
            <div className="text-center pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                Already have an account?{' '}
                <Link
                  to="/login"
                  className="font-semibold text-bdo-blue hover:text-blue-700 transition-colors"
                >
                  Sign In
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default RegisterPage
