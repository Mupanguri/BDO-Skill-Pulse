import { useState, useEffect } from 'react'
import { User, Shield, Sun, Moon, Mail, Building, Key, Save, Upload, X, AlertCircle, CheckCircle } from 'lucide-react'
import Button from '../lib/components/Button'
import Breadcrumb from '../lib/components/Breadcrumb'
import LoadingSpinner from '../lib/components/LoadingSpinner'
import { useAuth } from '../lib/contexts/AuthContext'

interface UserProfile {
  id: string
  email: string
  department: string
  isAdmin: boolean
  darkMode: boolean
  hasPassword: boolean
  profileImage?: string
  displayName?: string
  lastPasswordChange?: string
  createdAt: string
}

function ProfilePage() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [passwordForm, setPasswordForm] = useState({
    newPassword: '',
    confirmPassword: ''
  })
  const [pwStep, setPwStep] = useState<'idle' | 'otp-sent'>('idle')
  const [pwOtp, setPwOtp] = useState('')
  const [profileForm, setProfileForm] = useState({
    displayName: '',
    darkMode: false
  })
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>('')
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const { user, isDarkMode, toggleDarkMode } = useAuth()

  useEffect(() => {
    if (user) {
      fetchUserProfile(user.email)
      setProfileForm({
        displayName: userProfile?.displayName || '',
        darkMode: isDarkMode
      })
    }
  }, [user, isDarkMode])

  const fetchUserProfile = async (email: string) => {
    try {
      const response = await fetch(`/api/user/${email}/profile`, {
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        setUserProfile(data)
        setProfileForm({
          displayName: data.displayName || '',
          darkMode: data.darkMode || false
        })
      } else {
        console.error('Failed to fetch user profile:', response.status)
      }
    } catch (error) {
      console.error('Error fetching user profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    try {
      const updateData: any = {}
      if (profileForm.displayName !== (userProfile?.displayName || '')) {
        updateData.displayName = profileForm.displayName
      }
      if (profileForm.darkMode !== (userProfile?.darkMode || false)) {
        updateData.darkMode = profileForm.darkMode
      }

      if (Object.keys(updateData).length === 0) {
        setMessage({ type: 'error', text: 'No changes to save' })
        return
      }

      const response = await fetch(`/api/user/${user?.email}/profile`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      })

      if (response.ok) {
        const data = await response.json()
        setUserProfile(prev => prev ? { ...prev, ...data.profile } : data.profile)
        setMessage({ type: 'success', text: 'Profile updated successfully' })
      } else {
        const error = await response.json()
        setMessage({ type: 'error', text: error.error || 'Failed to update profile' })
      }
    } catch (error) {
      console.error('Error updating profile:', error)
      setMessage({ type: 'error', text: 'Failed to update profile' })
    } finally {
      setSaving(false)
    }
  }

  const sendPwOtp = async () => {
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch('/api/auth/otp/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: user?.email, forgot: true }),
      })
      if (res.ok) {
        setPwStep('otp-sent')
        setMessage({ type: 'success', text: `A verification code was sent to ${user?.email}` })
      } else {
        setMessage({ type: 'error', text: 'Failed to send code. Try again.' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error. Try again.' })
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' })
      setSaving(false)
      return
    }

    if (passwordForm.newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters' })
      setSaving(false)
      return
    }

    try {
      const body: Record<string, string> = {
        newPassword: passwordForm.newPassword,
        otpCode: pwOtp
      }

      const response = await fetch(`/api/user/${user?.email}/password`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (response.ok) {
        const label = userProfile?.hasPassword ? 'Password changed successfully' : 'Password set successfully'
        setMessage({ type: 'success', text: label })
        setPasswordForm({ newPassword: '', confirmPassword: '' })
        setPwStep('idle')
        setPwOtp('')
        setUserProfile(prev => prev ? { ...prev, hasPassword: true } : prev)
      } else {
        const error = await response.json()
        setMessage({ type: 'error', text: error.error || 'Failed to change password' })
      }
    } catch (error) {
      console.error('Error changing password:', error)
      setMessage({ type: 'error', text: 'Failed to change password' })
    } finally {
      setSaving(false)
    }
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.type.startsWith('image/')) {
        setMessage({ type: 'error', text: 'Please upload an image file' })
        return
      }

      if (file.size > 5 * 1024 * 1024) {
        setMessage({ type: 'error', text: 'Image file must be less than 5MB' })
        return
      }

      setImageFile(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const removeImage = () => {
    setImageFile(null)
    setImagePreview('')
  }

  const compressImage = (dataUrl: string): Promise<string> =>
    new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const maxSize = 400
        const ratio = Math.min(maxSize / img.width, maxSize / img.height, 1)
        canvas.width = Math.round(img.width * ratio)
        canvas.height = Math.round(img.height * ratio)
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', 0.7))
      }
      img.src = dataUrl
    })

  const handleImageSave = async () => {
    if (!imageFile) return

    setSaving(true)
    setMessage(null)

    try {
      const compressed = await compressImage(imagePreview)

      const response = await fetch(`/api/user/${user?.email}/profile`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileImage: compressed })
      })

      if (response.ok) {
        const data = await response.json()
        setUserProfile(prev => prev ? { ...prev, ...data.profile } : data.profile)
        setMessage({ type: 'success', text: 'Profile image updated successfully' })
      } else {
        const error = await response.json()
        setMessage({ type: 'error', text: error.error || 'Failed to update profile image' })
      }
    } catch (error) {
      console.error('Error updating profile image:', error)
      setMessage({ type: 'error', text: 'Failed to update profile image' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <LoadingSpinner text="Loading profile..." />
  }

  if (!userProfile) {
    return (
      <div className="ui-page">
        <Breadcrumb items={[
          { label: 'Dashboard', href: '/app' },
          { label: 'Profile' }
        ]} />
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold dark:text-gray-100 mb-2" style={{ color: 'var(--ui-text)' }}>Profile Not Found</h2>
          <p style={{ color: 'var(--ui-text-muted)' }}>Unable to load your profile information.</p>
        </div>
      </div>
    )
  }

  const hasPassword = userProfile.hasPassword

  return (
    <div className="ui-page page-enter">
      <Breadcrumb items={[
        { label: 'Dashboard', href: '/app' },
        { label: 'Profile' }
      ]} />

      {/* Banner for users who haven't set a password yet */}
      {!hasPassword && (
        <div className="mb-6 p-5 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800">
          <h2 className="text-base font-bold text-amber-900 dark:text-amber-200 mb-1">Set a password for easier sign-in</h2>
          <p className="text-sm text-amber-700 dark:text-amber-300">
            You're currently signing in with email codes. Set a password below to have the option to sign in directly.
          </p>
        </div>
      )}

      {/* Header */}
      <div className="ui-page-header mb-6">
        <div>
          <h1 className="ui-page-title">User Profile</h1>
          <p className="ui-page-subtitle">Manage your account settings and preferences</p>
        </div>
      </div>

      {/* Success/Error Messages */}
      {message && (
        <div className={`mb-6 p-4 rounded-lg ${
          message.type === 'success'
            ? 'bg-green-50 border border-green-200'
            : 'bg-red-50 border border-red-200'
        }`}>
          <div className="flex">
            <div className="flex-shrink-0">
              {message.type === 'success' ? (
                <CheckCircle className="h-5 w-5 text-green-400" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-400" />
              )}
            </div>
            <div className="ml-3">
              <p className={`text-sm font-medium ${
                message.type === 'success' ? 'text-green-800' : 'text-red-800'
              }`}>
                {message.text}
              </p>
            </div>
            <div className="ml-auto pl-3">
              <div className="-mx-1.5 -my-1.5">
                <button
                  onClick={() => setMessage(null)}
                  className={`inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                    message.type === 'success'
                      ? 'focus:ring-green-500 text-green-500 hover:bg-green-100'
                      : 'focus:ring-red-500 text-red-500 hover:bg-red-100'
                  }`}
                >
                  <span className="sr-only">Dismiss</span>
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Information Card */}
        <div className="lg:col-span-2 ui-card-strong">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-bdo-navy">Profile Information</h2>
            <div className="flex items-center space-x-2">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                userProfile.isAdmin
                  ? 'bg-purple-100 text-purple-800'
                  : 'bg-green-100 text-green-800'
              }`}>
                {userProfile.isAdmin ? (
                  <>
                    <Shield className="h-3 w-3 mr-1" />
                    Administrator
                  </>
                ) : (
                  <>
                    <User className="h-3 w-3 mr-1" />
                    User
                  </>
                )}
              </span>
            </div>
          </div>

          <form onSubmit={handleProfileUpdate} className="space-y-6">
            {/* Display Name */}
            <div>
              <label htmlFor="displayName" className="ui-label">Display Name</label>
              <input
                type="text"
                id="displayName"
                value={profileForm.displayName}
                onChange={(e) => setProfileForm({ ...profileForm, displayName: e.target.value })}
                className="ui-field"
                placeholder="Enter your display name"
              />
            </div>

            {/* Email (Read-only) */}
            <div>
              <label className="ui-label">Email Address</label>
              <div className="ui-field bg-gray-50 dark:bg-gray-800 cursor-not-allowed">
                <div className="flex items-center">
                  <Mail className="h-4 w-4 text-gray-400 mr-2" />
                  <span style={{ color: 'var(--ui-text-muted)' }}>{userProfile.email}</span>
                </div>
              </div>
            </div>

            {/* Department (Read-only) */}
            <div>
              <label className="ui-label">Department</label>
              <div className="ui-field bg-gray-50 dark:bg-gray-800 cursor-not-allowed">
                <div className="flex items-center">
                  <Building className="h-4 w-4 text-gray-400 mr-2" />
                  <span style={{ color: 'var(--ui-text-muted)' }}>{userProfile.department}</span>
                </div>
              </div>
            </div>

            {/* Dark Mode Toggle */}
            <div>
              <label className="ui-label">Appearance</label>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      {profileForm.darkMode ? (
                        <Moon className="h-5 w-5" style={{ color: 'var(--ui-text-muted)' }} />
                      ) : (
                        <Sun className="h-5 w-5" style={{ color: 'var(--ui-text-muted)' }} />
                      )}
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium" style={{ color: 'var(--ui-text)' }}>Dark Mode</p>
                      <p className="text-sm" style={{ color: 'var(--ui-text-muted)' }}>Toggle between light and dark themes</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const newDarkMode = !profileForm.darkMode
                      setProfileForm({ ...profileForm, darkMode: newDarkMode })
                      toggleDarkMode()
                    }}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      profileForm.darkMode ? 'bg-bdo-navy' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        profileForm.darkMode ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Save Profile Button */}
            <div className="flex justify-end">
              <Button type="submit" disabled={saving} size="sm">
                <Save className="h-4 w-4 mr-2" aria-hidden="true" />
                {saving ? 'Saving...' : 'Save Profile'}
              </Button>
            </div>
          </form>
        </div>

        {/* Profile Actions Card */}
        <div className="lg:col-span-1 space-y-6">
          {/* Profile Image Section */}
          <div className="ui-card-strong">
            <h3 className="text-lg font-semibold text-bdo-navy mb-4">Profile Image</h3>
            <div className="space-y-4">
              <div className="flex justify-center">
                <div className="relative">
                  <div className="h-24 w-24 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                    {imagePreview || userProfile.profileImage ? (
                      <img
                        src={imagePreview || userProfile.profileImage}
                        alt="Profile"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-sm font-medium text-gray-700">
                        {userProfile.displayName ? userProfile.displayName.charAt(0).toUpperCase() : userProfile.email.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="absolute -bottom-2 -right-2 bg-white rounded-full p-1 shadow-sm border">
                    <Upload className="h-4 w-4 text-gray-600" />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="ui-label">Upload New Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-bdo-red file:text-white hover:file:bg-bdo-red/90"
                />
                {imageFile && (
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>Selected: {imageFile.name}</span>
                    <button
                      type="button"
                      onClick={removeImage}
                      className="text-red-600 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                )}
                <div className="text-xs text-gray-500">
                  Supported formats: JPG, PNG, GIF. Max size: 5MB.
                </div>
              </div>

              {imageFile && (
                <div className="flex justify-end">
                  <Button onClick={handleImageSave} disabled={saving} size="sm" variant="secondary">
                    <Save className="h-4 w-4 mr-2" aria-hidden="true" />
                    {saving ? 'Saving...' : 'Save Image'}
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Password Section */}
          <div className="ui-card-strong">
            <h3 className="text-lg font-semibold text-bdo-navy mb-1">
              {hasPassword ? 'Change Password' : 'Set a Password'}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              {hasPassword
                ? "We'll send a verification code to your email to confirm your identity."
                : "Create a password to sign in without needing an email code each time."}
            </p>

            {pwStep === 'idle' && (
              <Button onClick={sendPwOtp} disabled={saving} size="sm" variant="secondary" type="button">
                <Mail className="h-4 w-4 mr-2" aria-hidden="true" />
                {saving ? 'Sending…' : 'Send verification code'}
              </Button>
            )}

            {pwStep === 'otp-sent' && (
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div>
                  <label htmlFor="pwOtp" className="ui-label">Verification code</label>
                  <input
                    type="text"
                    id="pwOtp"
                    inputMode="numeric"
                    maxLength={6}
                    value={pwOtp}
                    onChange={(e) => setPwOtp(e.target.value.replace(/\D/g, ''))}
                    className="ui-field font-mono tracking-widest"
                    placeholder="000000"
                    required
                    autoFocus
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    <button type="button" onClick={sendPwOtp} disabled={saving} className="text-bdo-blue hover:underline">
                      Resend code
                    </button>
                  </p>
                </div>

                <div>
                  <label htmlFor="newPassword" className="ui-label">New Password</label>
                  <input
                    type="password"
                    id="newPassword"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    className="ui-field"
                    placeholder="Enter your new password"
                    minLength={6}
                    required
                  />
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="ui-label">Confirm Password</label>
                  <input
                    type="password"
                    id="confirmPassword"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    className="ui-field"
                    placeholder="Confirm your password"
                    minLength={6}
                    required
                  />
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={saving} size="sm" variant="secondary">
                    <Key className="h-4 w-4 mr-2" aria-hidden="true" />
                    {saving ? 'Saving...' : hasPassword ? 'Change Password' : 'Set Password'}
                  </Button>
                </div>
              </form>
            )}
          </div>

          {/* Account Information Section */}
          <div className="ui-card-strong">
            <h3 className="text-lg font-semibold text-bdo-navy mb-4">Account Information</h3>
            <div className="space-y-3 text-sm" style={{ color: 'var(--ui-text-muted)' }}>
              <div className="flex justify-between">
                <span>Member Since:</span>
                <span className="font-medium">{new Date(userProfile.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Last Password Change:</span>
                <span className="font-medium">
                  {userProfile.lastPasswordChange
                    ? new Date(userProfile.lastPasswordChange).toLocaleDateString()
                    : 'Never'
                  }
                </span>
              </div>
              <div className="flex justify-between">
                <span>Account Type:</span>
                <span className="font-medium">{userProfile.isAdmin ? 'Administrator' : 'Standard User'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProfilePage
