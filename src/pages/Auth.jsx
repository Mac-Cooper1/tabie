import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { ArrowLeft, Phone, User, Mail, Lock, Eye, EyeOff } from 'lucide-react'

export default function Auth() {
  const navigate = useNavigate()
  const { signUp, signIn, error, clearError, loading, isAuthenticated } = useAuthStore()

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/home', { replace: true })
    }
  }, [isAuthenticated, navigate])

  const [mode, setMode] = useState('login') // login, signup
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [formError, setFormError] = useState('')

  const handleModeChange = (newMode) => {
    setMode(newMode)
    clearError()
    setFormError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError('')

    // Validate email
    if (!email.trim()) {
      setFormError('Email is required')
      return
    }

    // Validate password
    if (!password) {
      setFormError('Password is required')
      return
    }

    if (mode === 'signup' && password.length < 6) {
      setFormError('Password must be at least 6 characters')
      return
    }

    let result
    if (mode === 'signup') {
      // Validate name for signup
      if (!name.trim()) {
        setFormError('Name is required')
        return
      }
      result = await signUp(email, password, name, phone)
    } else {
      result = await signIn(email, password)
    }

    // Navigation is handled by useEffect when isAuthenticated becomes true
    // This prevents race condition with Firebase auth state
  }

  // Get friendly error message
  const getErrorMessage = (error) => {
    if (!error) return ''
    if (error.includes('email-already-in-use')) {
      return 'This email is already registered. Try signing in instead.'
    }
    if (error.includes('invalid-email')) {
      return 'Please enter a valid email address.'
    }
    if (error.includes('weak-password')) {
      return 'Password should be at least 6 characters.'
    }
    if (error.includes('user-not-found') || error.includes('wrong-password') || error.includes('invalid-credential')) {
      return 'Invalid email or password.'
    }
    if (error.includes('too-many-requests')) {
      return 'Too many attempts. Please try again later.'
    }
    return error
  }

  const displayError = formError || getErrorMessage(error)

  return (
    <div className="min-h-screen bg-tabie-bg px-6 py-8 flex flex-col">
      {/* Header */}
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-2 text-tabie-muted hover:text-tabie-text transition-colors mb-8"
      >
        <ArrowLeft className="w-5 h-5" />
        Back
      </button>

      {/* Title */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-tabie-text mb-2">
          {mode === 'login' ? 'Welcome back' : 'Create account'}
        </h1>
        <p className="text-tabie-muted">
          {mode === 'login'
            ? 'Sign in to continue splitting bills'
            : 'Join Tabie and start splitting bills'}
        </p>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-2 p-1 bg-tabie-surface rounded-xl mb-8">
        <button
          onClick={() => handleModeChange('login')}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
            mode === 'login'
              ? 'bg-tabie-primary text-white'
              : 'text-tabie-muted hover:text-tabie-text'
          }`}
        >
          Sign In
        </button>
        <button
          onClick={() => handleModeChange('signup')}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
            mode === 'signup'
              ? 'bg-tabie-primary text-white'
              : 'text-tabie-muted hover:text-tabie-text'
          }`}
        >
          Sign Up
        </button>
      </div>

      {/* Error display */}
      {displayError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-4">
          <p className="text-red-400 text-sm">{displayError}</p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4 flex-1">
        {/* Name - only for signup */}
        {mode === 'signup' && (
          <div>
            <label className="block text-sm text-tabie-muted mb-2">Name *</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-tabie-muted" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="input-field pl-12"
              />
            </div>
          </div>
        )}

        {/* Email */}
        <div>
          <label className="block text-sm text-tabie-muted mb-2">Email *</label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-tabie-muted" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="input-field pl-12"
              autoComplete="email"
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <label className="block text-sm text-tabie-muted mb-2">Password *</label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-tabie-muted" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'signup' ? 'At least 6 characters' : 'Your password'}
              className="input-field pl-12 pr-12"
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-tabie-muted hover:text-tabie-text"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Phone - only for signup */}
        {mode === 'signup' && (
          <div>
            <label className="block text-sm text-tabie-muted mb-2">
              Phone Number <span className="text-tabie-muted/60">(optional)</span>
            </label>
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-tabie-muted" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 123-4567"
                className="input-field pl-12"
              />
            </div>
          </div>
        )}

        {/* Submit button */}
        <div className="pt-4">
          <button
            type="submit"
            className="w-full btn-primary"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {mode === 'login' ? 'Signing in...' : 'Creating account...'}
              </span>
            ) : (
              mode === 'login' ? 'Sign In' : 'Create Account'
            )}
          </button>
        </div>
      </form>

      {/* Footer */}
      <p className="text-center text-tabie-muted text-sm mt-8">
        By continuing, you agree to our Terms & Privacy Policy
      </p>
    </div>
  )
}
