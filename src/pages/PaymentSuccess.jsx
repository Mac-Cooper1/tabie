import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import {
  CheckCircle2,
  Loader2,
  Clock,
  AlertCircle
} from 'lucide-react'

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [sessionData, setSessionData] = useState(null)
  const [tabData, setTabData] = useState(null)
  const [tabAdminName, setTabAdminName] = useState('')
  const [error, setError] = useState('')

  const sessionId = searchParams.get('session_id')
  const tabId = searchParams.get('tab_id')
  const participantId = searchParams.get('participant_id')

  useEffect(() => {
    async function fetchData() {
      if (!sessionId) {
        setError('Invalid session')
        setLoading(false)
        return
      }

      try {
        // Fetch checkout session status from backend
        const sessionResponse = await fetch(`/api/stripe/checkout-session/${sessionId}`)
        if (sessionResponse.ok) {
          const data = await sessionResponse.json()
          setSessionData(data)
        }

        // Fetch tab data if we have tabId
        if (tabId) {
          const tabDoc = await getDoc(doc(db, 'tabs', tabId))
          if (tabDoc.exists()) {
            const tab = tabDoc.data()
            setTabData(tab)

            // Fetch tab admin name
            if (tab.createdBy) {
              const userDoc = await getDoc(doc(db, 'users', tab.createdBy))
              if (userDoc.exists()) {
                setTabAdminName(userDoc.data().name || '')
              }
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
  }, [sessionId, tabId])

  if (loading) {
    return (
      <div className="min-h-screen bg-tabie-bg flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-tabie-primary animate-spin mx-auto mb-4" />
          <p className="text-tabie-muted">Confirming your payment...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-tabie-bg flex items-center justify-center px-6">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-tabie-text mb-2">Something went wrong</h1>
          <p className="text-tabie-muted mb-4">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="btn-secondary"
          >
            Go Home
          </button>
        </div>
      </div>
    )
  }

  // Determine if this was an ACH or card payment
  const paymentMethod = sessionData?.metadata?.paymentMethod || 'card'
  const isACH = paymentMethod === 'bank'
  const amount = sessionData?.amountTotal ? (sessionData.amountTotal / 100).toFixed(2) : '0.00'
  const restaurantName = tabData?.restaurantName || 'the restaurant'

  // Check payment status
  const paymentStatus = sessionData?.paymentStatus
  const isPending = paymentStatus === 'unpaid' // ACH payments start as unpaid
  const isPaid = paymentStatus === 'paid'

  return (
    <div className="min-h-screen bg-tabie-bg flex items-center justify-center px-6">
      <div className="text-center max-w-sm">
        {/* Success Icon with Animation */}
        <div className="relative mb-6">
          <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto ${
            isPending ? 'bg-yellow-500/20' : 'bg-green-500/20'
          }`}>
            {isPending ? (
              <Clock className="w-12 h-12 text-yellow-500" />
            ) : (
              <CheckCircle2 className="w-12 h-12 text-green-500 animate-bounce-once" />
            )}
          </div>
          {/* Celebration dots */}
          {isPaid && (
            <div className="absolute inset-0 animate-fade-in">
              <div className="absolute top-0 left-1/4 w-2 h-2 bg-tabie-primary rounded-full animate-float" />
              <div className="absolute top-4 right-1/4 w-1.5 h-1.5 bg-green-500 rounded-full animate-float-delayed" />
              <div className="absolute bottom-4 left-1/3 w-1 h-1 bg-purple-500 rounded-full animate-float" />
            </div>
          )}
        </div>

        {/* Main Message */}
        <h1 className="text-2xl font-bold text-tabie-text mb-2">
          {isPending ? 'Payment Processing' : 'Payment Successful!'}
        </h1>

        {/* Amount */}
        <p className="text-3xl font-bold font-mono text-tabie-primary mb-2">
          ${amount}
        </p>

        {/* Destination */}
        <p className="text-tabie-muted mb-2">
          {isPending ? 'Being sent to' : 'Sent to'} {tabAdminName || 'the organizer'}
        </p>
        <p className="text-tabie-text font-medium mb-6">
          {restaurantName}
        </p>

        {/* ACH Notice */}
        {isACH && (
          <div className={`rounded-xl p-4 mb-6 ${
            isPending ? 'bg-yellow-500/10 border border-yellow-500/30' : 'bg-tabie-surface'
          }`}>
            <div className="flex items-start gap-3">
              <Clock className={`w-5 h-5 mt-0.5 ${isPending ? 'text-yellow-500' : 'text-tabie-muted'}`} />
              <div className="text-left">
                <p className={`text-sm font-medium ${isPending ? 'text-yellow-400' : 'text-tabie-text'}`}>
                  Bank Transfer
                </p>
                <p className="text-sm text-tabie-muted">
                  ACH payments typically take 2-3 business days to process.
                  You'll receive a confirmation once the transfer completes.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Card payment notice */}
        {!isACH && isPaid && (
          <div className="bg-tabie-surface rounded-xl p-4 mb-6">
            <p className="text-sm text-tabie-muted">
              {tabAdminName || 'The organizer'} has been notified of your payment.
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={() => navigate('/')}
            className="w-full btn-primary"
          >
            Done
          </button>

          {tabId && participantId && (
            <button
              onClick={() => navigate(`/pay/${tabId}/${participantId}`)}
              className="w-full btn-secondary"
            >
              View Receipt
            </button>
          )}
        </div>

        {/* Powered by Stripe */}
        <p className="text-xs text-tabie-muted mt-6">
          Securely processed by Stripe
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
