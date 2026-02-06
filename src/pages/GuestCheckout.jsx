import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useTab } from '../hooks/useTab'
import { claimPayment } from '../services/firestore'
import {
  Loader2,
  AlertCircle,
  Receipt,
  CheckCircle2,
  ExternalLink
} from 'lucide-react'

// Custom SVG icons for payment apps
const VenmoIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
    <path d="M19.5 3c.9 1.5 1.3 3 1.3 5 0 5.5-4.7 12.7-8.5 17.7H5.2L2 4.4l6.2-.6 1.8 14.4c1.7-2.8 3.8-7.2 3.8-10.2 0-1.9-.3-3.2-.9-4.2L19.5 3z"/>
  </svg>
)

const CashAppIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
    <path d="M23.59 3.47A5.1 5.1 0 0020.47.35C19.22.12 17.69.07 16 .07c-1.69 0-3.22.05-4.47.28A5.1 5.1 0 008.41 3.47c-.23 1.25-.28 2.78-.28 4.47s.05 3.22.28 4.47a5.1 5.1 0 003.12 3.12c1.25.23 2.78.28 4.47.28 1.69 0 3.22-.05 4.47-.28a5.1 5.1 0 003.12-3.12c.23-1.25.28-2.78.28-4.47s-.05-3.22-.28-4.47zM17.5 11.25l-1.5 1.5-2-2-2 2-1.5-1.5 2-2-2-2 1.5-1.5 2 2 2-2 1.5 1.5-2 2 2 2z"/>
  </svg>
)

const PayPalIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
    <path d="M7.076 21.337H2.47a.641.641 0 01-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797H9.25c-.497 0-.92.369-.997.858l-.846 5.143-.005.034v.002h-.003l-.323 1.97z"/>
  </svg>
)

export default function GuestCheckout() {
  const { tabId, participantId } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { tab, loading: tabLoading, error: tabError, getPersonTotal } = useTab(tabId)

  const [showConfirmation, setShowConfirmation] = useState(false)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  // Check if returning from payment
  useEffect(() => {
    if (searchParams.get('payment') === 'initiated') {
      setShowConfirmation(true)
      setSelectedPaymentMethod(searchParams.get('method'))
    }
  }, [searchParams])

  // Generate deep link URLs
  const generatePaymentLinks = () => {
    if (!tab?.adminPaymentAccounts || !participantId) return {}

    const amount = getPersonTotal(participantId)
    const { venmo, cashapp, paypal, adminName } = tab.adminPaymentAccounts
    const restaurantName = tab.restaurantName || 'Bill Split'
    const participant = tab.people?.find(p => p.id === participantId)
    const guestName = participant?.name || 'Guest'

    const note = encodeURIComponent(`${restaurantName} - ${guestName} via Tabie`)

    return {
      venmo: venmo
        ? `https://venmo.com/${venmo}?txn=pay&amount=${amount.toFixed(2)}&note=${note}&audience=private`
        : null,
      cashapp: cashapp
        ? `https://cash.app/$${cashapp}/${amount.toFixed(2)}`
        : null,
      paypal: paypal
        ? `https://paypal.me/${paypal}/${amount.toFixed(2)}`
        : null
    }
  }

  const paymentLinks = generatePaymentLinks()
  const hasPaymentMethods = paymentLinks.venmo || paymentLinks.cashapp || paymentLinks.paypal

  const handlePayment = (method) => {
    const url = paymentLinks[method]
    if (!url) return

    setSelectedPaymentMethod(method)

    // Open payment link
    window.open(url, '_blank')

    // Show confirmation after a short delay
    setTimeout(() => {
      setShowConfirmation(true)
    }, 1000)
  }

  const handleConfirmPayment = async (didPay) => {
    if (!didPay) {
      setShowConfirmation(false)
      setSelectedPaymentMethod(null)
      return
    }

    setIsSubmitting(true)
    setErrorMessage('')

    try {
      // Mark payment as claimed in Firestore
      await claimPayment(tabId, participantId, selectedPaymentMethod)

      // Navigate to success page
      navigate(`/pay/success?method=${selectedPaymentMethod}&tab_id=${tabId}&participant_id=${participantId}`)
    } catch (err) {
      console.error('Error claiming payment:', err)
      setErrorMessage('Failed to record payment. Please try again.')
      setIsSubmitting(false)
    }
  }

  // Loading state
  if (tabLoading) {
    return (
      <div className="min-h-screen bg-tabie-bg pb-8">
        {/* Skeleton Header */}
        <div className="sticky top-0 bg-tabie-bg/95 backdrop-blur-lg z-20 px-6 pt-8 pb-4 border-b border-tabie-border">
          <div className="flex items-center gap-3 mb-4">
            <div className="skeleton-circle w-6 h-6" />
            <div>
              <div className="skeleton-text w-32 h-5 mb-1" />
              <div className="skeleton-text w-40 h-3" />
            </div>
          </div>
        </div>

        <div className="px-6 py-6 space-y-6">
          {/* Skeleton Total Card */}
          <div className="card text-center py-6">
            <div className="skeleton-text w-24 mx-auto mb-2 h-3" />
            <div className="skeleton-text w-32 mx-auto h-10" />
          </div>

          {/* Skeleton Breakdown */}
          <div className="card space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex justify-between">
                <div className="skeleton-text w-40 h-4" />
                <div className="skeleton-text w-16 h-4" />
              </div>
            ))}
          </div>

          {/* Skeleton Payment Section */}
          <div className="card">
            <div className="skeleton-text w-40 h-5 mb-4" />
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton h-16 rounded-xl" />
              ))}
            </div>
          </div>
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

  // Check if already paid
  if (participant.paymentStatus === 'claimed' || participant.paymentStatus === 'confirmed') {
    return (
      <div className="min-h-screen bg-tabie-bg flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </div>
          <h1 className="text-xl font-bold text-tabie-text mb-2">
            {participant.paymentStatus === 'confirmed' ? 'Payment Confirmed!' : 'Payment Pending'}
          </h1>
          <p className="text-tabie-muted mb-2">
            {participant.paymentStatus === 'confirmed'
              ? <>Your payment of <span className="font-mono">${getPersonTotal(participantId).toFixed(2)}</span> has been confirmed.</>
              : <>Your payment of <span className="font-mono">${getPersonTotal(participantId).toFixed(2)}</span> is awaiting confirmation from the organizer.</>
            }
          </p>
          {participant.paidVia && (
            <p className="text-sm text-tabie-muted mb-4">
              Paid via {participant.paidVia.charAt(0).toUpperCase() + participant.paidVia.slice(1)}
            </p>
          )}
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

  const myTotal = getPersonTotal(participantId)
  const myItems = tab.items?.filter(item => item.assignedTo?.includes(participantId)) || []
  const adminName = tab.adminPaymentAccounts?.adminName || 'the organizer'

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

  return (
    <div className="min-h-screen bg-tabie-bg pb-8">
      {/* Header */}
      <div className="sticky top-0 bg-tabie-bg/95 backdrop-blur-lg z-20 px-6 pt-8 pb-4 border-b border-tabie-border">
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
          <p className="text-sm text-tabie-muted mt-2">
            Pay to {adminName}
          </p>
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
        {!hasPaymentMethods ? (
          <div className="card text-center py-8">
            <AlertCircle className="w-10 h-10 text-yellow-500 mx-auto mb-4" />
            <h3 className="font-semibold text-tabie-text mb-2">Payment Not Available</h3>
            <p className="text-tabie-muted text-sm">
              The tab organizer hasn't set up payment accounts yet.
              Please pay {adminName} directly.
            </p>
          </div>
        ) : showConfirmation ? (
          // Confirmation Dialog
          <div className="card text-center py-6">
            <h3 className="font-semibold text-tabie-text mb-2">Did you complete your payment?</h3>
            <p className="text-tabie-muted text-sm mb-4">
              If you paid <span className="font-mono">${myTotal.toFixed(2)}</span> via{' '}
              {selectedPaymentMethod?.charAt(0).toUpperCase() + selectedPaymentMethod?.slice(1)},
              confirm below.
            </p>
            <div className="space-y-2">
              <button
                onClick={() => handleConfirmPayment(true)}
                disabled={isSubmitting}
                className="w-full btn-primary flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Recording...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    Yes, I Paid
                  </>
                )}
              </button>
              <button
                onClick={() => handleConfirmPayment(false)}
                disabled={isSubmitting}
                className="w-full btn-secondary"
              >
                Not Yet
              </button>
            </div>
          </div>
        ) : (
          // Payment Buttons
          <div className="space-y-3">
            <p className="text-sm text-tabie-muted text-center">
              Tap to pay {adminName}
            </p>

            {/* Venmo Button */}
            {paymentLinks.venmo && (
              <button
                onClick={() => handlePayment('venmo')}
                className="w-full bg-[#008CFF] hover:bg-[#0070cc] text-white rounded-xl p-4 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <VenmoIcon />
                    <div className="text-left">
                      <p className="font-semibold">Pay with Venmo</p>
                      <p className="text-sm text-white/80">@{tab.adminPaymentAccounts.venmo}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold">${myTotal.toFixed(2)}</span>
                    <ExternalLink className="w-4 h-4" />
                  </div>
                </div>
              </button>
            )}

            {/* Cash App Button */}
            {paymentLinks.cashapp && (
              <button
                onClick={() => handlePayment('cashapp')}
                className="w-full bg-[#00D632] hover:bg-[#00b52a] text-white rounded-xl p-4 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CashAppIcon />
                    <div className="text-left">
                      <p className="font-semibold">Pay with Cash App</p>
                      <p className="text-sm text-white/80">${tab.adminPaymentAccounts.cashapp}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold">${myTotal.toFixed(2)}</span>
                    <ExternalLink className="w-4 h-4" />
                  </div>
                </div>
              </button>
            )}

            {/* PayPal Button */}
            {paymentLinks.paypal && (
              <button
                onClick={() => handlePayment('paypal')}
                className="w-full bg-[#003087] hover:bg-[#00256b] text-white rounded-xl p-4 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <PayPalIcon />
                    <div className="text-left">
                      <p className="font-semibold">Pay with PayPal</p>
                      <p className="text-sm text-white/80">paypal.me/{tab.adminPaymentAccounts.paypal}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold">${myTotal.toFixed(2)}</span>
                    <ExternalLink className="w-4 h-4" />
                  </div>
                </div>
              </button>
            )}

            <p className="text-xs text-tabie-muted text-center pt-2">
              Payments are sent directly to {adminName} through their payment app.
              <br />
              Tabie does not process payments.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
