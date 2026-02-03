import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import {
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Building2,
  ExternalLink,
  RefreshCw,
  User,
  Mail,
  Phone,
  LogOut
} from 'lucide-react'

export default function Settings() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user, updateUser, logout, isAuthenticated } = useAuthStore()

  const [loading, setLoading] = useState(false)
  const [connectStatus, setConnectStatus] = useState(null)
  const [statusLoading, setStatusLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  // Handle onboarding return
  useEffect(() => {
    const onboarding = searchParams.get('onboarding')
    if (onboarding === 'complete') {
      setSuccessMessage('Bank account setup completed! Checking status...')
      checkConnectStatus()
    } else if (onboarding === 'refresh') {
      setError('Onboarding was interrupted. Please try again.')
    }
  }, [searchParams])

  // Check Connect account status on mount
  useEffect(() => {
    if (user?.stripeConnectId) {
      checkConnectStatus()
    }
  }, [user?.stripeConnectId])

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth', { replace: true })
    }
  }, [isAuthenticated, navigate])

  const checkConnectStatus = async () => {
    if (!user?.stripeConnectId) return

    setStatusLoading(true)
    try {
      const response = await fetch(`/api/stripe/connect/account-status/${user.stripeConnectId}`)
      if (response.ok) {
        const data = await response.json()
        setConnectStatus(data)

        // Update local user state if onboarding is complete
        if (data.isOnboarded && !user.stripeConnectOnboarded) {
          await updateUser({
            stripeConnectOnboarded: true,
            stripeConnectEmail: data.email
          })
        }
      }
    } catch (err) {
      console.error('Error checking connect status:', err)
    } finally {
      setStatusLoading(false)
    }
  }

  const handleConnectBank = async () => {
    setLoading(true)
    setError('')

    try {
      let accountId = user?.stripeConnectId

      // Create account if doesn't exist
      if (!accountId) {
        const createResponse = await fetch('/api/stripe/connect/create-account', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: user.email,
            userId: user.id
          })
        })

        if (!createResponse.ok) {
          const err = await createResponse.json()
          throw new Error(err.error || 'Failed to create account')
        }

        const createData = await createResponse.json()
        accountId = createData.accountId

        // Save to user profile
        await updateUser({
          stripeConnectId: accountId,
          stripeConnectOnboarded: false
        })
      }

      // Create onboarding link
      const linkResponse = await fetch('/api/stripe/connect/create-onboarding-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId,
          userId: user.id
        })
      })

      if (!linkResponse.ok) {
        const err = await linkResponse.json()
        throw new Error(err.error || 'Failed to create onboarding link')
      }

      const linkData = await linkResponse.json()

      // Redirect to Stripe
      window.location.href = linkData.url
    } catch (err) {
      console.error('Error connecting bank:', err)
      setError(err.message)
      setLoading(false)
    }
  }

  const handleOpenDashboard = async () => {
    if (!user?.stripeConnectId) return

    setLoading(true)
    try {
      const response = await fetch('/api/stripe/connect/create-login-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: user.stripeConnectId })
      })

      if (response.ok) {
        const data = await response.json()
        window.open(data.url, '_blank')
      }
    } catch (err) {
      console.error('Error opening dashboard:', err)
      setError('Failed to open dashboard')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    navigate('/', { replace: true })
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-tabie-bg flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-tabie-primary animate-spin" />
      </div>
    )
  }

  const isOnboarded = connectStatus?.isOnboarded || user?.stripeConnectOnboarded
  const hasAccount = !!user?.stripeConnectId

  return (
    <div className="min-h-screen bg-tabie-bg pb-8">
      {/* Header */}
      <div className="sticky top-0 bg-tabie-bg/90 backdrop-blur-lg z-20 px-6 pt-8 pb-4 border-b border-tabie-border">
        <button
          onClick={() => navigate('/home')}
          className="flex items-center gap-2 text-tabie-muted hover:text-tabie-text transition-colors mb-4"
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

        {/* Bank Connection Section */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-tabie-text">Payment Receiving</h3>
            {hasAccount && (
              <button
                onClick={checkConnectStatus}
                disabled={statusLoading}
                className="text-tabie-muted hover:text-tabie-text transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${statusLoading ? 'animate-spin' : ''}`} />
              </button>
            )}
          </div>

          {!hasAccount ? (
            // No account yet
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-tabie-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Building2 className="w-8 h-8 text-tabie-primary" />
              </div>
              <h4 className="font-medium text-tabie-text mb-2">Connect Your Bank</h4>
              <p className="text-sm text-tabie-muted mb-4">
                Set up your account to receive payments when guests pay their share.
                Powered by Stripe.
              </p>
              <button
                onClick={handleConnectBank}
                disabled={loading}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Setting up...
                  </>
                ) : (
                  <>
                    <Building2 className="w-5 h-5" />
                    Connect Bank Account
                  </>
                )}
              </button>
            </div>
          ) : !isOnboarded ? (
            // Account exists but not onboarded
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-yellow-500" />
              </div>
              <h4 className="font-medium text-tabie-text mb-2">Setup Incomplete</h4>
              <p className="text-sm text-tabie-muted mb-4">
                Your account was created but setup wasn't completed.
                Please complete the setup to start receiving payments.
              </p>
              <button
                onClick={handleConnectBank}
                disabled={loading}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <ExternalLink className="w-5 h-5" />
                    Complete Setup
                  </>
                )}
              </button>
            </div>
          ) : (
            // Fully onboarded
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
              <h4 className="font-medium text-tabie-text mb-2">Bank Connected</h4>
              <p className="text-sm text-tabie-muted mb-1">
                You're all set to receive payments!
              </p>
              {connectStatus?.externalAccounts?.[0] && (
                <p className="text-sm text-tabie-text mb-4">
                  {connectStatus.externalAccounts[0].bankName} ****{connectStatus.externalAccounts[0].last4}
                </p>
              )}
              <button
                onClick={handleOpenDashboard}
                disabled={loading}
                className="btn-secondary w-full flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <ExternalLink className="w-5 h-5" />
                    Open Stripe Dashboard
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Platform Fee Info */}
        <div className="card bg-tabie-surface/50">
          <h4 className="text-sm font-medium text-tabie-text mb-2">Platform Fees</h4>
          <p className="text-xs text-tabie-muted">
            Tabie charges a small fee of $0.50 or 1% (whichever is greater, max $2) per payment.
            Stripe processing fees also apply.
          </p>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full card flex items-center justify-center gap-2 text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Sign Out
        </button>
      </div>
    </div>
  )
}
