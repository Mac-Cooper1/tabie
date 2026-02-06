import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import {
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertCircle,
  User,
  Mail,
  Phone,
  LogOut,
  ExternalLink,
  DollarSign
} from 'lucide-react'

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

export default function Settings() {
  const navigate = useNavigate()
  const { user, updateUser, logout, isAuthenticated } = useAuthStore()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  // Payment account form state
  const [venmo, setVenmo] = useState('')
  const [cashapp, setCashapp] = useState('')
  const [paypal, setPaypal] = useState('')
  const [hasChanges, setHasChanges] = useState(false)

  // Load existing payment accounts
  useEffect(() => {
    if (user?.paymentAccounts) {
      setVenmo(user.paymentAccounts.venmo || '')
      setCashapp(user.paymentAccounts.cashapp || '')
      setPaypal(user.paymentAccounts.paypal || '')
    }
  }, [user?.paymentAccounts])

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth', { replace: true })
    }
  }, [isAuthenticated, navigate])

  // Track changes
  useEffect(() => {
    const original = user?.paymentAccounts || {}
    const changed =
      venmo !== (original.venmo || '') ||
      cashapp !== (original.cashapp || '') ||
      paypal !== (original.paypal || '')
    setHasChanges(changed)
  }, [venmo, cashapp, paypal, user?.paymentAccounts])

  // Validation helpers
  const cleanVenmoUsername = (value) => {
    // Remove @ prefix if present, keep alphanumeric and hyphens
    return value.replace(/^@/, '').replace(/[^a-zA-Z0-9-_]/g, '')
  }

  const cleanCashappTag = (value) => {
    // Remove $ prefix for storage, keep alphanumeric
    return value.replace(/^\$/, '').replace(/[^a-zA-Z0-9]/g, '')
  }

  const cleanPaypalUsername = (value) => {
    // Keep alphanumeric only
    return value.replace(/[^a-zA-Z0-9]/g, '')
  }

  const handleSave = async () => {
    setLoading(true)
    setError('')
    setSuccessMessage('')

    try {
      await updateUser({
        paymentAccounts: {
          venmo: venmo.trim() || null,
          cashapp: cashapp.trim() || null,
          paypal: paypal.trim() || null
        }
      })
      setSuccessMessage('Payment accounts saved!')
      setHasChanges(false)
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err) {
      console.error('Error saving payment accounts:', err)
      setError('Failed to save payment accounts')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    navigate('/', { replace: true })
  }

  // Generate test link for preview
  const generateTestLink = (type) => {
    const amount = '10.00'
    const note = encodeURIComponent('Test payment via Tabie')

    switch (type) {
      case 'venmo':
        return venmo ? `https://venmo.com/${venmo}?txn=pay&amount=${amount}&note=${note}&audience=private` : null
      case 'cashapp':
        return cashapp ? `https://cash.app/$${cashapp}/${amount}` : null
      case 'paypal':
        return paypal ? `https://paypal.me/${paypal}/${amount}` : null
      default:
        return null
    }
  }

  const handleTestLink = (type) => {
    const url = generateTestLink(type)
    if (url) {
      window.open(url, '_blank')
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-tabie-bg flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-tabie-primary animate-spin" />
      </div>
    )
  }

  const hasAnyAccount = venmo || cashapp || paypal

  return (
    <div className="min-h-screen bg-tabie-bg pb-8">
      {/* Header */}
      <div className="sticky top-0 bg-tabie-bg/95 backdrop-blur-lg z-20 px-6 pt-8 pb-4 border-b border-tabie-border">
        <button
          onClick={() => navigate('/home')}
          className="flex items-center gap-2 text-tabie-muted hover:text-tabie-text transition-colors mb-4 focus-ring rounded-lg"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>
        <h1 className="text-2xl font-bold text-tabie-text">Settings</h1>
      </div>

      <div className="px-6 py-6 space-y-6">
        {/* Success Message */}
        {successMessage && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <p className="text-green-400 text-sm">{successMessage}</p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Profile Section */}
        <div className="card">
          <h3 className="font-semibold text-tabie-text mb-4">Profile</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-tabie-primary/20 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-tabie-primary" />
              </div>
              <div>
                <p className="text-sm text-tabie-muted">Name</p>
                <p className="text-tabie-text">{user.name || 'Not set'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-tabie-primary/20 rounded-full flex items-center justify-center">
                <Mail className="w-5 h-5 text-tabie-primary" />
              </div>
              <div>
                <p className="text-sm text-tabie-muted">Email</p>
                <p className="text-tabie-text">{user.email}</p>
              </div>
            </div>

            {user.phone && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-tabie-primary/20 rounded-full flex items-center justify-center">
                  <Phone className="w-5 h-5 text-tabie-primary" />
                </div>
                <div>
                  <p className="text-sm text-tabie-muted">Phone</p>
                  <p className="text-tabie-text">{user.phone}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Payment Accounts Section */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="w-5 h-5 text-tabie-primary" />
            <h3 className="font-semibold text-tabie-text">Payment Accounts</h3>
          </div>
          <p className="text-sm text-tabie-muted mb-4">
            Add your payment accounts so guests can pay you directly when splitting bills.
          </p>

          <div className="space-y-4">
            {/* Venmo */}
            <div>
              <label className="text-sm text-tabie-muted mb-1.5 flex items-center gap-2">
                <span className="text-[#008CFF]"><VenmoIcon /></span>
                Venmo Username
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-tabie-muted">@</span>
                <input
                  type="text"
                  value={venmo}
                  onChange={(e) => setVenmo(cleanVenmoUsername(e.target.value))}
                  placeholder="your-username"
                  className="input-field w-full pl-8"
                />
              </div>
              {venmo && (
                <button
                  onClick={() => handleTestLink('venmo')}
                  className="text-xs text-[#008CFF] hover:underline mt-1 flex items-center gap-1 focus-ring rounded"
                >
                  <ExternalLink className="w-3 h-3" />
                  Test Venmo link
                </button>
              )}
            </div>

            {/* Cash App */}
            <div>
              <label className="text-sm text-tabie-muted mb-1.5 flex items-center gap-2">
                <span className="text-[#00D632]"><CashAppIcon /></span>
                Cash App $Cashtag
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-tabie-muted">$</span>
                <input
                  type="text"
                  value={cashapp}
                  onChange={(e) => setCashapp(cleanCashappTag(e.target.value))}
                  placeholder="yourcashtag"
                  className="input-field w-full pl-8"
                />
              </div>
              {cashapp && (
                <button
                  onClick={() => handleTestLink('cashapp')}
                  className="text-xs text-[#00D632] hover:underline mt-1 flex items-center gap-1 focus-ring rounded"
                >
                  <ExternalLink className="w-3 h-3" />
                  Test Cash App link
                </button>
              )}
              <p className="text-xs text-tabie-muted/70 mt-1">
                Note: Cash App links work best on mobile
              </p>
            </div>

            {/* PayPal */}
            <div>
              <label className="text-sm text-tabie-muted mb-1.5 flex items-center gap-2">
                <span className="text-[#003087]"><PayPalIcon /></span>
                PayPal.me Username
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-tabie-muted text-xs">paypal.me/</span>
                <input
                  type="text"
                  value={paypal}
                  onChange={(e) => setPaypal(cleanPaypalUsername(e.target.value))}
                  placeholder="username"
                  className="input-field w-full pl-20"
                />
              </div>
              {paypal && (
                <button
                  onClick={() => handleTestLink('paypal')}
                  className="text-xs text-[#003087] hover:underline mt-1 flex items-center gap-1 focus-ring rounded"
                >
                  <ExternalLink className="w-3 h-3" />
                  Test PayPal link
                </button>
              )}
            </div>

            {/* Save Button */}
            {hasChanges && (
              <button
                onClick={handleSave}
                disabled={loading}
                className="w-full btn-primary flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Payment Accounts'
                )}
              </button>
            )}
          </div>

          {/* Status indicator */}
          {!hasAnyAccount && !hasChanges && (
            <div className="mt-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-500 mt-0.5" />
                <p className="text-xs text-yellow-400">
                  Add at least one payment account to receive payments from guests when you split bills.
                </p>
              </div>
            </div>
          )}

          {hasAnyAccount && !hasChanges && (
            <div className="mt-4 bg-green-500/10 border border-green-500/30 rounded-xl p-3">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                <p className="text-xs text-green-400">
                  You're all set! Guests will see payment options when you create a tab.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* How It Works */}
        <div className="card bg-tabie-surface/50">
          <h4 className="text-sm font-medium text-tabie-text mb-2">How Payment Works</h4>
          <ol className="text-xs text-tabie-muted space-y-1 list-decimal list-inside">
            <li>Add your payment accounts above</li>
            <li>When you create a tab, guests see your payment options</li>
            <li>Guests tap to pay you directly via Venmo, Cash App, or PayPal</li>
            <li>You confirm payments as they come in</li>
          </ol>
          <p className="text-xs text-tabie-muted mt-3">
            Tabie doesn't process payments - we just connect guests to your payment apps.
          </p>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full card flex items-center justify-center gap-2 text-red-400 hover:bg-red-500/10 transition-colors focus-ring"
        >
          <LogOut className="w-5 h-5" />
          Sign Out
        </button>

        {/* Legal Links */}
        <div className="flex justify-center gap-4 pt-4">
          <button
            onClick={() => navigate('/privacy')}
            className="text-xs text-tabie-muted hover:text-tabie-text transition-colors focus-ring rounded"
          >
            Privacy Policy
          </button>
          <span className="text-tabie-muted/50">•</span>
          <button
            onClick={() => navigate('/terms')}
            className="text-xs text-tabie-muted hover:text-tabie-text transition-colors focus-ring rounded"
          >
            Terms of Service
          </button>
        </div>
      </div>
    </div>
  )
}
