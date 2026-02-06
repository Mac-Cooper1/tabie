import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { ArrowLeft, Phone, User, Mail, Lock, Eye, EyeOff, DollarSign } from 'lucide-react'

// Custom SVG icons for payment apps
const VenmoIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M19.5 3c.9 1.5 1.3 3 1.3 5 0 5.5-4.7 12.7-8.5 17.7H5.2L2 4.4l6.2-.6 1.8 14.4c1.7-2.8 3.8-7.2 3.8-10.2 0-1.9-.3-3.2-.9-4.2L19.5 3z"/>
  </svg>
)

const CashAppIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M23.59 3.47A5.1 5.1 0 0020.47.35C19.22.12 17.69.07 16 .07c-1.69 0-3.22.05-4.47.28A5.1 5.1 0 008.41 3.47c-.23 1.25-.28 2.78-.28 4.47s.05 3.22.28 4.47a5.1 5.1 0 003.12 3.12c1.25.23 2.78.28 4.47.28 1.69 0 3.22-.05 4.47-.28a5.1 5.1 0 003.12-3.12c.23-1.25.28-2.78.28-4.47s-.05-3.22-.28-4.47zM17.5 11.25l-1.5 1.5-2-2-2 2-1.5-1.5 2-2-2-2 1.5-1.5 2 2 2-2 1.5 1.5-2 2 2 2z"/>
  </svg>
)

const PayPalIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M7.076 21.337H2.47a.641.641 0 01-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797H9.25c-.497 0-.92.369-.997.858l-.846 5.143-.005.034v.002h-.003l-.323 1.97z"/>
  </svg>
)

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

  // Payment account fields
  const [venmo, setVenmo] = useState('')
  const [cashapp, setCashapp] = useState('')
  const [paypal, setPaypal] = useState('')

  // Validation helpers for payment accounts
  const cleanVenmoUsername = (value) => {
    return value.replace(/^@/, '').replace(/[^a-zA-Z0-9-_]/g, '')
  }

  const cleanCashappTag = (value) => {
    return value.replace(/^\$/, '').replace(/[^a-zA-Z0-9]/g, '')
  }

  const cleanPaypalUsername = (value) => {
    return value.replace(/[^a-zA-Z0-9]/g, '')
  }

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

      // Validate phone for signup
      if (!phone.trim()) {
        setFormError('Phone number is required')
        return
      }

      // Validate at least one payment account
      if (!venmo.trim() && !cashapp.trim() && !paypal.trim()) {
        setFormError('Please add at least one payment account (Venmo, Cash App, or PayPal)')
        return
      }

      const paymentAccounts = {
        venmo: venmo.trim() || null,
        cashapp: cashapp.trim() || null,
        paypal: paypal.trim() || null
      }

      result = await signUp(email, password, name, phone, paymentAccounts)
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
        className="flex items-center gap-2 text-tabie-muted hover:text-tabie-text transition-colors mb-8 focus-ring rounded-lg"
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
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors duration-200 focus-ring ${
            mode === 'login'
              ? 'bg-tabie-primary text-white'
              : 'text-tabie-muted hover:text-tabie-text'
          }`}
        >
          Sign In
        </button>
        <button
          onClick={() => handleModeChange('signup')}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors duration-200 focus-ring ${
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
              className="absolute right-4 top-1/2 -translate-y-1/2 text-tabie-muted hover:text-tabie-text transition-colors focus-ring rounded"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Phone - only for signup */}
        {mode === 'signup' && (
          <div>
            <label className="block text-sm text-tabie-muted mb-2">Phone Number *</label>
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

        {/* Payment Accounts - only for signup */}
        {mode === 'signup' && (
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-tabie-primary" />
              <label className="block text-sm text-tabie-muted">
                Payment Accounts <span className="text-tabie-muted/60">(at least one required)</span>
              </label>
            </div>
            <p className="text-xs text-tabie-muted/70 -mt-2 mb-3">
              Add your payment handles so friends can pay you when splitting bills.
            </p>

            {/* Venmo */}
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#008CFF]">
                <VenmoIcon />
              </span>
              <span className="absolute left-10 top-1/2 -translate-y-1/2 text-tabie-muted">@</span>
              <input
                type="text"
                value={venmo}
                onChange={(e) => setVenmo(cleanVenmoUsername(e.target.value))}
                placeholder="venmo-username"
                className="input-field pl-14"
              />
            </div>

            {/* Cash App */}
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#00D632]">
                <CashAppIcon />
              </span>
              <span className="absolute left-10 top-1/2 -translate-y-1/2 text-tabie-muted">$</span>
              <input
                type="text"
                value={cashapp}
                onChange={(e) => setCashapp(cleanCashappTag(e.target.value))}
                placeholder="cashtag"
                className="input-field pl-14"
              />
            </div>

            {/* PayPal */}
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#003087]">
                <PayPalIcon />
              </span>
              <span className="absolute left-10 top-1/2 -translate-y-1/2 text-tabie-muted text-xs">paypal.me/</span>
              <input
                type="text"
                value={paypal}
                onChange={(e) => setPaypal(cleanPaypalUsername(e.target.value))}
                placeholder="username"
                className="input-field pl-24"
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
