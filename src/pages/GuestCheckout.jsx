import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { loadStripe } from '@stripe/stripe-js'
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js'
import { useTab } from '../hooks/useTab'
import { getDoc, doc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle2,
  CreditCard,
  Receipt
} from 'lucide-react'

// Stripe promise - will be initialized when config is fetched
let stripePromise = null

const getStripePromise = async () => {
  if (!stripePromise) {
    try {
      const response = await fetch('/api/stripe/config')
      const { publishableKey } = await response.json()
      stripePromise = loadStripe(publishableKey)
    } catch (err) {
      console.error('Failed to load Stripe config:', err)
    }
  }
  return stripePromise
}

// Payment Form Component
function PaymentForm({ amount, onSuccess, onError }) {
  const stripe = useStripe()
  const elements = useElements()
  const [isProcessing, setIsProcessing] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!stripe || !elements) {
      return
    }

    setIsProcessing(true)
    setErrorMessage('')

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.href,
        },
        redirect: 'if_required',
      })

      if (error) {
        setErrorMessage(error.message)
        onError?.(error)
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        onSuccess?.(paymentIntent)
      }
    } catch (err) {
      setErrorMessage('An unexpected error occurred.')
      onError?.(err)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="card p-4">
        <PaymentElement
          options={{
            layout: 'tabs',
          }}
        />
      </div>

      {errorMessage && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3">
          <p className="text-red-400 text-sm">{errorMessage}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full btn-primary flex items-center justify-center gap-2"
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <CreditCard className="w-5 h-5" />
            Pay ${amount.toFixed(2)}
          </>
        )}
      </button>

      <p className="text-xs text-tabie-muted text-center">
        Payments securely processed by Stripe
      </p>
    </form>
  )
}

// Main GuestCheckout Component
export default function GuestCheckout() {
  const { tabId, participantId } = useParams()
  const navigate = useNavigate()
  const { tab, loading: tabLoading, error: tabError, getPersonTotal } = useTab(tabId)

  const [stripePromise, setStripePromise] = useState(null)
  const [clientSecret, setClientSecret] = useState('')
  const [paymentStatus, setPaymentStatus] = useState('idle') // idle, loading, ready, success, error
  const [errorMessage, setErrorMessage] = useState('')
  const [tabAdmin, setTabAdmin] = useState(null)

  // Load Stripe
  useEffect(() => {
    getStripePromise().then(setStripePromise)
  }, [])

  // Fetch tab admin's Stripe Connect info
  useEffect(() => {
    async function fetchTabAdmin() {
      if (!tab?.createdBy) return

      try {
        const userDoc = await getDoc(doc(db, 'users', tab.createdBy))
        if (userDoc.exists()) {
          const userData = userDoc.data()
          setTabAdmin({
            name: userData.name,
            stripeConnectId: userData.stripeConnectId,
            stripeConnectOnboarded: userData.stripeConnectOnboarded
          })
        }
      } catch (err) {
        console.error('Error fetching tab admin:', err)
      }
    }

    fetchTabAdmin()
  }, [tab?.createdBy])

  // Create payment intent when we have all the info
  useEffect(() => {
    async function createPaymentIntent() {
      if (!tab || !participantId || paymentStatus !== 'idle') return

      const participant = tab.people?.find(p => p.id === participantId)
      if (!participant) return

      const amount = getPersonTotal(participantId)
      if (amount < 0.50) {
        setErrorMessage('Minimum payment amount is $0.50')
        setPaymentStatus('error')
        return
      }

      setPaymentStatus('loading')

      try {
        const response = await fetch('/api/stripe/create-payment-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount,
            tabId,
            participantId,
            participantName: participant.name,
            connectedAccountId: tabAdmin?.stripeConnectId || null
          })
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to create payment')
        }

        const data = await response.json()
        setClientSecret(data.clientSecret)
        setPaymentStatus('ready')
      } catch (err) {
        console.error('Error creating payment intent:', err)
        setErrorMessage(err.message)
        setPaymentStatus('error')
      }
    }

    if (tabAdmin !== null) {
      createPaymentIntent()
    }
  }, [tab, participantId, tabAdmin, getPersonTotal, tabId, paymentStatus])

  const handlePaymentSuccess = () => {
    setPaymentStatus('success')
  }

  const handlePaymentError = (error) => {
    console.error('Payment error:', error)
  }

  // Loading state
  if (tabLoading) {
    return (
      <div className="min-h-screen bg-tabie-bg flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-tabie-primary animate-spin mx-auto mb-4" />
          <p className="text-tabie-muted">Loading your bill...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (tabError || !tab) {
    return (
      <div className="min-h-screen bg-tabie-bg flex items-center justify-center px-6">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-tabie-text mb-2">Tab Not Found</h1>
          <p className="text-tabie-muted mb-4">This tab may have been deleted or the link is invalid.</p>
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

  // Find participant
  const participant = tab.people?.find(p => p.id === participantId)
  if (!participant) {
    return (
      <div className="min-h-screen bg-tabie-bg flex items-center justify-center px-6">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-tabie-text mb-2">Participant Not Found</h1>
          <p className="text-tabie-muted mb-4">You may need to join this tab first.</p>
          <button
            onClick={() => navigate(`/join/${tabId}`)}
            className="btn-primary"
          >
            Join Tab
          </button>
        </div>
      </div>
    )
  }

  const myTotal = getPersonTotal(participantId)
  const myItems = tab.items?.filter(item => item.assignedTo?.includes(participantId)) || []

  // Calculate my subtotal (before tax/tip)
  let mySubtotal = 0
  myItems.forEach(item => {
    if (item.assignments && item.assignments[participantId] !== undefined) {
      const personQty = item.assignments[participantId]
      const pricePerUnit = item.totalPrice / item.quantity
      mySubtotal += pricePerUnit * personQty
    } else if (item.assignedTo?.length > 0) {
      mySubtotal += item.totalPrice / item.assignedTo.length
    }
  })

  // Calculate my tax/tip share
  let myTaxShare = 0
  let myTipShare = 0
  if (tab.splitTaxTipMethod === 'equal' && tab.people?.length > 0) {
    myTaxShare = (tab.tax || 0) / tab.people.length
    myTipShare = (tab.tip || 0) / tab.people.length
  } else if (tab.subtotal > 0) {
    const proportion = mySubtotal / tab.subtotal
    myTaxShare = (tab.tax || 0) * proportion
    myTipShare = (tab.tip || 0) * proportion
  }

  // Success state
  if (paymentStatus === 'success') {
    return (
      <div className="min-h-screen bg-tabie-bg flex items-center justify-center px-6">
        <div className="text-center">
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold text-tabie-text mb-2">Payment Successful!</h1>
          <p className="text-tabie-muted mb-2">
            You paid ${myTotal.toFixed(2)} for your share at
          </p>
          <p className="text-tabie-text font-semibold mb-6">{tab.restaurantName || 'the restaurant'}</p>
          <p className="text-sm text-tabie-muted mb-8">
            The tab organizer has been notified.
          </p>
          <button
            onClick={() => navigate('/')}
            className="btn-secondary"
          >
            Done
          </button>
        </div>
      </div>
    )
  }

  // Check if tab admin can receive payments
  const canAcceptPayments = tabAdmin?.stripeConnectOnboarded

  return (
    <div className="min-h-screen bg-tabie-bg pb-8">
      {/* Header */}
      <div className="sticky top-0 bg-tabie-bg/90 backdrop-blur-lg z-20 px-6 pt-8 pb-4 border-b border-tabie-border">
        <div className="flex items-center gap-3 mb-4">
          <Receipt className="w-6 h-6 text-tabie-primary" />
          <div>
            <h1 className="text-xl font-bold text-tabie-text">
              {tab.restaurantName || 'Bill Split'}
            </h1>
            <p className="text-sm text-tabie-muted">
              Hi {participant.name}, here's your share
            </p>
          </div>
        </div>
      </div>

      <div className="px-6 py-6 space-y-6">
        {/* Total Card */}
        <div className="gradient-border p-6 rounded-2xl text-center">
          <p className="text-tabie-muted mb-2">Your Total</p>
          <p className="text-4xl font-bold font-mono text-tabie-text">${myTotal.toFixed(2)}</p>
        </div>

        {/* Items Breakdown */}
        <div className="card">
          <h3 className="font-semibold text-tabie-text mb-3">Your Items</h3>
          <div className="space-y-2">
            {myItems.length === 0 ? (
              <p className="text-tabie-muted text-sm">No items claimed yet.</p>
            ) : (
              myItems.map(item => {
                let itemPrice = 0
                if (item.assignments && item.assignments[participantId] !== undefined) {
                  const personQty = item.assignments[participantId]
                  const pricePerUnit = item.totalPrice / item.quantity
                  itemPrice = pricePerUnit * personQty
                } else if (item.assignedTo?.length > 0) {
                  itemPrice = item.totalPrice / item.assignedTo.length
                }

                // Determine split display
                let splitInfo = ''
                if (item.quantity > 1 && item.assignments?.[participantId]) {
                  splitInfo = ` (${item.assignments[participantId]} of ${item.quantity})`
                } else if (item.quantity === 1 && item.assignments?.[participantId] && item.assignments[participantId] < 1) {
                  const fraction = item.assignments[participantId]
                  if (fraction === 0.5) splitInfo = ' (1/2)'
                  else if (Math.abs(fraction - 1/3) < 0.01) splitInfo = ' (1/3)'
                  else if (fraction === 0.25) splitInfo = ' (1/4)'
                  else splitInfo = ` (${Math.round(fraction * 100)}%)`
                }

                return (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-tabie-muted">
                      {item.description}
                      <span className="text-tabie-muted/70">{splitInfo}</span>
                    </span>
                    <span className="font-mono text-tabie-text">${itemPrice.toFixed(2)}</span>
                  </div>
                )
              })
            )}

            <div className="border-t border-tabie-border my-2 pt-2">
              <div className="flex justify-between text-sm">
                <span className="text-tabie-muted">Subtotal</span>
                <span className="font-mono text-tabie-text">${mySubtotal.toFixed(2)}</span>
              </div>
              {myTaxShare > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-tabie-muted">Tax</span>
                  <span className="font-mono text-tabie-text">${myTaxShare.toFixed(2)}</span>
                </div>
              )}
              {myTipShare > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-tabie-muted">Tip</span>
                  <span className="font-mono text-tabie-text">${myTipShare.toFixed(2)}</span>
                </div>
              )}
            </div>

            <div className="flex justify-between font-semibold pt-1">
              <span className="text-tabie-text">Total</span>
              <span className="font-mono text-tabie-primary">${myTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Payment Section */}
        {!canAcceptPayments ? (
          <div className="card text-center py-8">
            <AlertCircle className="w-10 h-10 text-yellow-500 mx-auto mb-4" />
            <h3 className="font-semibold text-tabie-text mb-2">Payment Not Available</h3>
            <p className="text-tabie-muted text-sm">
              The tab organizer hasn't set up payment receiving yet.
              Please pay them directly.
            </p>
          </div>
        ) : paymentStatus === 'loading' ? (
          <div className="card text-center py-8">
            <Loader2 className="w-8 h-8 text-tabie-primary animate-spin mx-auto mb-4" />
            <p className="text-tabie-muted">Setting up payment...</p>
          </div>
        ) : paymentStatus === 'error' ? (
          <div className="card text-center py-8">
            <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-4" />
            <h3 className="font-semibold text-tabie-text mb-2">Payment Error</h3>
            <p className="text-tabie-muted text-sm mb-4">{errorMessage}</p>
            <button
              onClick={() => setPaymentStatus('idle')}
              className="btn-secondary"
            >
              Try Again
            </button>
          </div>
        ) : stripePromise && clientSecret ? (
          <Elements
            stripe={stripePromise}
            options={{
              clientSecret,
              appearance: {
                theme: 'night',
                variables: {
                  colorPrimary: '#722F37',
                  colorBackground: '#1a1a1a',
                  colorText: '#ffffff',
                  colorDanger: '#ef4444',
                  fontFamily: 'system-ui, sans-serif',
                  borderRadius: '12px',
                },
              },
            }}
          >
            <PaymentForm
              amount={myTotal}
              onSuccess={handlePaymentSuccess}
              onError={handlePaymentError}
            />
          </Elements>
        ) : (
          <div className="card text-center py-8">
            <Loader2 className="w-8 h-8 text-tabie-primary animate-spin mx-auto mb-4" />
            <p className="text-tabie-muted">Loading payment form...</p>
          </div>
        )}
      </div>
    </div>
  )
}
