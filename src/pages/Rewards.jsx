import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import {
  ArrowLeft,
  Star,
  Gift,
  Receipt,
  TrendingUp,
  Clock
} from 'lucide-react'

export default function Rewards() {
  const navigate = useNavigate()
  const { user, isAuthenticated, refreshUser } = useAuthStore()

  // Refresh user data to get latest points
  useEffect(() => {
    if (isAuthenticated) {
      refreshUser()
    }
  }, [isAuthenticated, refreshUser])

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth', { replace: true })
    }
  }, [isAuthenticated, navigate])

  const points = user?.points || { balance: 0, lifetime: 0, history: [] }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

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
        <h1 className="text-2xl font-bold text-tabie-text">Rewards</h1>
      </div>

      <div className="px-6 py-6 space-y-6">
        {/* Points Balance Card */}
        <div className="card bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-yellow-500/30">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Star className="w-6 h-6 text-yellow-500 fill-current" />
              <span className="font-medium text-tabie-text">Your Points</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-tabie-muted">
              <TrendingUp className="w-3 h-3" />
              Lifetime: {points.lifetime.toLocaleString()}
            </div>
          </div>

          <div className="text-center py-4">
            <p className="text-5xl font-bold text-yellow-500">
              {points.balance.toLocaleString()}
            </p>
            <p className="text-sm text-tabie-muted mt-1">available points</p>
          </div>
        </div>

        {/* How Points Work */}
        <div className="card bg-tabie-surface/50">
          <h3 className="font-semibold text-tabie-text mb-3 flex items-center gap-2">
            <Gift className="w-5 h-5 text-tabie-primary" />
            How Points Work
          </h3>
          <ul className="text-sm text-tabie-muted space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-tabie-primary">1.</span>
              <span>Pay for the group when splitting bills</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-tabie-primary">2.</span>
              <span>Earn points when everyone pays you back</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-tabie-primary">3.</span>
              <span>Redeem for rewards at partner restaurants</span>
            </li>
          </ul>
        </div>

        {/* Redemption Section - Coming Soon */}
        <div className="card text-center py-6">
          <div className="w-16 h-16 bg-tabie-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Gift className="w-8 h-8 text-tabie-primary" />
          </div>
          <h3 className="font-semibold text-tabie-text mb-2">Redeem Points</h3>
          <p className="text-sm text-tabie-muted mb-4">
            Partner rewards launching soon! Keep earning points — they won't expire.
          </p>
          <div className="inline-block px-4 py-2 bg-tabie-surface rounded-full text-sm text-tabie-muted">
            Coming Soon
          </div>
        </div>

        {/* Points History */}
        <div>
          <h3 className="font-semibold text-tabie-text mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-tabie-muted" />
            Points History
          </h3>

          {points.history && points.history.length > 0 ? (
            <div className="space-y-3">
              {points.history.map((entry, index) => (
                <div key={index} className="card flex items-center gap-4">
                  <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center">
                    <Receipt className="w-5 h-5 text-green-500" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-tabie-text">
                      {entry.tabName || 'Tab'}
                    </p>
                    <p className="text-xs text-tabie-muted">
                      <span className="font-mono">${entry.subtotal?.toFixed(2)}</span> • {formatDate(entry.earnedAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-500">
                      +{entry.pointsEarned.toLocaleString()}
                    </p>
                    <p className="text-xs text-tabie-muted">points</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card text-center py-8">
              <Receipt className="w-10 h-10 text-tabie-muted mx-auto mb-3" />
              <p className="text-tabie-muted text-sm">
                No points earned yet. Create a tab and get paid back to start earning!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
