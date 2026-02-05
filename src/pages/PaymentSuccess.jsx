import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuthStore } from '../stores/authStore'
import {
  CheckCircle2,
  Loader2,
  Clock,
  Sparkles,
  ArrowRight
} from 'lucide-react'

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuthStore()

  const [loading, setLoading] = useState(true)
  const [tabData, setTabData] = useState(null)
  const [participant, setParticipant] = useState(null)
  const [adminName, setAdminName] = useState('')

  const method = searchParams.get('method')
  const tabId = searchParams.get('tab_id')
  const participantId = searchParams.get('participant_id')

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch tab data
        if (tabId) {
          const tabDoc = await getDoc(doc(db, 'tabs', tabId))
          if (tabDoc.exists()) {
            const tab = tabDoc.data()
            setTabData(tab)
            setAdminName(tab.adminPaymentAccounts?.adminName || 'the organizer')

            // Find participant
            if (participantId) {
              const p = tab.people?.find(p => p.id === participantId)
              setParticipant(p)
            }
          }
        }
      } catch (err) {
        console.error('Error fetching data:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [tabId, participantId])

  if (loading) {
    return (
      <div className="min-h-screen bg-tabie-bg flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-tabie-primary animate-spin mx-auto mb-4" />
          <p className="text-tabie-muted">Loading...</p>
        </div>
      </div>
    )
  }

  // Calculate amount if we have tab data
  let amount = '0.00'
  if (tabData && participantId) {
    let itemsTotal = 0
    tabData.items?.forEach(item => {
      if (item.assignedTo?.includes(participantId)) {
        if (item.assignments && item.assignments[participantId] !== undefined) {
          const personQty = item.assignments[participantId]
          const pricePerUnit = item.totalPrice / item.quantity
          itemsTotal += pricePerUnit * personQty
        } else if (item.assignedTo?.length > 0) {
          itemsTotal += item.totalPrice / item.assignedTo.length
        }
      }
    })

    let taxTipShare = 0
    if (tabData.splitTaxTipMethod === 'equal' && tabData.people?.length > 0) {
      taxTipShare = ((tabData.tax || 0) + (tabData.tip || 0)) / tabData.people.length
    } else if (tabData.subtotal > 0) {
      const proportion = itemsTotal / tabData.subtotal
      taxTipShare = ((tabData.tax || 0) + (tabData.tip || 0)) * proportion
    }

    amount = (itemsTotal + taxTipShare).toFixed(2)
  }

  const restaurantName = tabData?.restaurantName || 'your meal'
  const paymentMethodLabel = method
    ? method.charAt(0).toUpperCase() + method.slice(1)
    : 'the payment app'

  return (
    <div className="min-h-screen bg-tabie-bg flex items-center justify-center px-6">
      <div className="text-center max-w-sm">
        {/* Success Icon with Animation */}
        <div className="relative mb-6">
          <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto bg-green-500/20">
            <CheckCircle2 className="w-12 h-12 text-green-500 animate-bounce-once" />
          </div>
          {/* Celebration dots */}
          <div className="absolute inset-0 animate-fade-in">
            <div className="absolute top-0 left-1/4 w-2 h-2 bg-tabie-primary rounded-full animate-float" />
            <div className="absolute top-4 right-1/4 w-1.5 h-1.5 bg-green-500 rounded-full animate-float-delayed" />
            <div className="absolute bottom-4 left-1/3 w-1 h-1 bg-purple-500 rounded-full animate-float" />
          </div>
        </div>

        {/* Main Message */}
        <h1 className="text-2xl font-bold text-tabie-text mb-2">
          Payment Sent!
        </h1>

        {/* Amount */}
        <p className="text-3xl font-bold font-mono text-tabie-primary mb-2">
          ${amount}
        </p>

        {/* Destination */}
        <p className="text-tabie-muted mb-2">
          Sent to {adminName} via {paymentMethodLabel}
        </p>
        <p className="text-tabie-text font-medium mb-6">
          {restaurantName}
        </p>

        {/* Pending Confirmation Notice */}
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 mt-0.5 text-yellow-500" />
            <div className="text-left">
              <p className="text-sm font-medium text-yellow-400">
                Awaiting Confirmation
              </p>
              <p className="text-sm text-tabie-muted">
                {adminName} will confirm your payment once they receive it.
                You'll see a green checkmark when confirmed.
              </p>
            </div>
          </div>
        </div>

        {/* Conversion CTA */}
        {isAuthenticated ? (
          // Logged-in user: Go to their tabs
          <div className="space-y-3">
            <button
              onClick={() => navigate('/home')}
              className="w-full btn-primary flex items-center justify-center gap-2"
            >
              Go to My Tabs
              <ArrowRight className="w-4 h-4" />
            </button>

            {tabId && participantId && (
              <button
                onClick={() => navigate(`/pay/${tabId}/${participantId}`)}
                className="w-full btn-secondary"
              >
                View Your Bill
              </button>
            )}
          </div>
        ) : (
          // Guest: Prompt to sign up
          <div className="space-y-4">
            {/* Primary CTA - Sign up */}
            <div className="bg-gradient-to-br from-tabie-primary/20 to-purple-500/20 border border-tabie-primary/30 rounded-2xl p-5">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Sparkles className="w-5 h-5 text-tabie-primary" />
                <h3 className="font-semibold text-tabie-text">Your turn to split a bill?</h3>
              </div>
              <p className="text-sm text-tabie-muted mb-4">
                Never do receipt math again. Scan, split, and get paid back in seconds.
              </p>
              <button
                onClick={() => navigate('/auth')}
                className="w-full btn-primary flex items-center justify-center gap-2"
              >
                Start Your Own Tab
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Secondary options */}
            <div className="flex items-center gap-3">
              {tabId && participantId && (
                <button
                  onClick={() => navigate(`/pay/${tabId}/${participantId}`)}
                  className="flex-1 btn-secondary text-sm"
                >
                  View Bill
                </button>
              )}
              <button
                onClick={() => navigate('/')}
                className="flex-1 text-tabie-muted hover:text-tabie-text text-sm py-3 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        )}

        {/* Footer note */}
        <p className="text-xs text-tabie-muted mt-6">
          Payment sent directly via {paymentMethodLabel}
        </p>
      </div>

      {/* Custom CSS for animations */}
      <style>{`
        @keyframes bounce-once {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); opacity: 1; }
          50% { transform: translateY(-10px) rotate(180deg); opacity: 0.5; }
        }
        @keyframes float-delayed {
          0%, 100% { transform: translateY(0) rotate(0deg); opacity: 1; }
          50% { transform: translateY(-8px) rotate(-180deg); opacity: 0.5; }
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-bounce-once {
          animation: bounce-once 0.5s ease-out;
        }
        .animate-float {
          animation: float 2s ease-in-out infinite;
        }
        .animate-float-delayed {
          animation: float-delayed 2s ease-in-out infinite 0.5s;
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}
