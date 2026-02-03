import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useTab } from '../hooks/useTab'
import { getDoc, doc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Building2,
  CreditCard,
  Receipt,
  ChevronRight,
  Info
} from 'lucide-react'

export default function GuestCheckout() {
  const { tabId, participantId } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { tab, loading: tabLoading, error: tabError, getPersonTotal } = useTab(tabId)

  const [isRedirecting, setIsRedirecting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [tabAdmin, setTabAdmin] = useState(null)
  const [showFeeInfo, setShowFeeInfo] = useState(false)

  // Check if payment was cancelled
  useEffect(() => {
    if (searchParams.get('cancelled') === 'true') {
      setErrorMessage('Payment was cancelled. You can try again when ready.')
    }
  }, [searchParams])

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

  const handlePayment = async (paymentMethod) => {
    if (!tab || !participantId || !tabAdmin?.stripeConnectId) return

    const participant = tab.people?.find(p => p.id === participantId)
    if (!participant) return

    const amount = getPersonTotal(participantId)
    if (amount < 0.50) {
      setErrorMessage('Minimum payment amount is $0.50')
      return
    }

    setIsRedirecting(true)
    setErrorMessage('')

    try {
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          tabId,
          participantId,
          participantName: participant.name,
          connectedAccountId: tabAdmin.stripeConnectId,
          paymentMethod, // 'bank' or 'card'
          restaurantName: tab.restaurantName
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create checkout session')
      }

      const data = await response.json()

      // Redirect to Stripe Checkout
      window.location.href = data.url
    } catch (err) {
      console.error('Error creating checkout session:', err)
      setErrorMessage(err.message)
      setIsRedirecting(false)
    }
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

  // Check if tab admin can receive payments
  const canAcceptPayments = tabAdmin?.stripeConnectOnboarded

  // Fee calculations for display
  const amountInCents = Math.round(myTotal * 100)
  const achFee = Math.round(amountInCents * 0.008) // 0.8% capped at $5
  const achFeeCapped = Math.min(achFee, 500)
  const cardFee = Math.round(amountInCents * 0.029) + 30 // 2.9% + 30¢

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
        {/* Error Message */}
        {errorMessage && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 mt-0.5" />
              <p className="text-red-300 text-sm">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Total Card */}
        <div className="gradient-border p-6 rounded-2xl text-center">
          <p className="text-tabie-muted mb-2">Your Total</p>
          <p className="text-4xl font-bold font-mono text-tabie-text">${myTotal.toFixed(2)}</p>
          {tabAdmin?.name && (
            <p className="text-sm text-tabie-muted mt-2">
              Pay to {tabAdmin.name}
            </p>
          )}
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
        ) : isRedirecting ? (
          <div className="card text-center py-8">
            <Loader2 className="w-8 h-8 text-tabie-primary animate-spin mx-auto mb-4" />
            <p className="text-tabie-muted">Redirecting to secure checkout...</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Bank Payment - Primary Option */}
            <button
              onClick={() => handlePayment('bank')}
              className="w-full card hover:border-green-500/50 transition-colors group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-green-500" />
                  </div>
                  <div className="text-left">
                    <h4 className="font-semibold text-tabie-text">Pay with Bank</h4>
                    <p className="text-sm text-green-400">Recommended - Lower fees</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-tabie-muted group-hover:text-tabie-text transition-colors" />
              </div>
            </button>

            {/* Card Payment - Secondary Option */}
            <button
              onClick={() => handlePayment('card')}
              className="w-full card hover:border-tabie-primary/50 transition-colors group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-tabie-primary/20 rounded-xl flex items-center justify-center">
                    <CreditCard className="w-6 h-6 text-tabie-primary" />
                  </div>
                  <div className="text-left">
                    <h4 className="font-semibold text-tabie-text">Pay with Card</h4>
                    <p className="text-sm text-tabie-muted">Instant payment</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-tabie-muted group-hover:text-tabie-text transition-colors" />
              </div>
            </button>

            {/* Fee Info Toggle */}
            <button
              onClick={() => setShowFeeInfo(!showFeeInfo)}
              className="w-full flex items-center justify-center gap-2 text-tabie-muted text-sm hover:text-tabie-text transition-colors py-2"
            >
              <Info className="w-4 h-4" />
              {showFeeInfo ? 'Hide fee comparison' : 'Compare payment fees'}
            </button>

            {/* Fee Comparison */}
            {showFeeInfo && (
              <div className="card bg-tabie-surface/50 text-sm">
                <h4 className="font-medium text-tabie-text mb-3">Fee Comparison for ${myTotal.toFixed(2)}</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-green-500" />
                      <span className="text-tabie-muted">Bank (ACH)</span>
                    </div>
                    <span className="text-green-400 font-mono">
                      ${(achFeeCapped / 100).toFixed(2)} fee
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-tabie-primary" />
                      <span className="text-tabie-muted">Card</span>
                    </div>
                    <span className="text-tabie-muted font-mono">
                      ${(cardFee / 100).toFixed(2)} fee
                    </span>
                  </div>
                </div>
                <p className="text-xs text-tabie-muted mt-3">
                  Bank payments take 2-3 business days to process. Card payments are instant.
                </p>
              </div>
            )}

            <p className="text-xs text-tabie-muted text-center pt-2">
              Payments securely processed by Stripe
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
