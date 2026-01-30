import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTab } from '../hooks/useTab'
import {
  ArrowLeft,
  Check,
  Loader2,
  AlertCircle,
  CreditCard
} from 'lucide-react'

export default function Checkout() {
  const navigate = useNavigate()
  const { tabId } = useParams()
  const { tab, loading, error, getPersonTotal } = useTab(tabId)

  // Get current participant from localStorage
  const participantId = localStorage.getItem(`tabie_participant_${tabId}`)

  // Redirect if not joined
  useEffect(() => {
    if (!loading && !participantId) {
      navigate(`/join/${tabId}`, { replace: true })
    }
  }, [loading, participantId, tabId, navigate])

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

  if (error || !tab) {
    return (
      <div className="min-h-screen bg-tabie-bg flex items-center justify-center px-6">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-tabie-text mb-2">Tab Not Found</h1>
          <p className="text-tabie-muted">This tab may have been deleted.</p>
        </div>
      </div>
    )
  }

  const currentParticipant = tab.people?.find(p => p.id === participantId)
  const isAdmin = tab.people?.[0]?.id === participantId
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

  // Get the organizer (first person)
  const organizer = tab.people?.[0]

  return (
    <div className="min-h-screen bg-tabie-bg pb-32">
      {/* Header */}
      <div className="sticky top-0 bg-tabie-bg/90 backdrop-blur-lg z-20 px-6 pt-8 pb-4 border-b border-tabie-border">
        <button
          onClick={() => navigate(`/tab/${tabId}/select`)}
          className="flex items-center gap-2 text-tabie-muted hover:text-tabie-text transition-colors mb-4"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Items
        </button>

        <h1 className="text-2xl font-bold text-tabie-text mb-1">Checkout</h1>
        <p className="text-tabie-muted">{tab.restaurantName || 'Bill Split'}</p>
      </div>

      <div className="px-6 py-6 space-y-6">
        {/* Your Total Card */}
        <div className="gradient-border p-6 rounded-2xl text-center">
          <p className="text-tabie-muted mb-2">Your Total</p>
          <p className="text-4xl font-bold font-mono text-tabie-text">${myTotal.toFixed(2)}</p>
        </div>

        {/* Breakdown */}
        <div className="card">
          <h3 className="font-semibold text-tabie-text mb-3">Breakdown</h3>
          <div className="space-y-2">
            {myItems.map(item => {
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
                // Fractional split for single items
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
            })}

            <div className="border-t border-tabie-border my-2 pt-2">
              <div className="flex justify-between text-sm">
                <span className="text-tabie-muted">Subtotal</span>
                <span className="font-mono text-tabie-text">${mySubtotal.toFixed(2)}</span>
              </div>
              {myTaxShare > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-tabie-muted">
                    Tax {tab.splitTaxTipMethod === 'proportional' && '(proportional)'}
                  </span>
                  <span className="font-mono text-tabie-text">${myTaxShare.toFixed(2)}</span>
                </div>
              )}
              {myTipShare > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-tabie-muted">
                    Tip {tab.splitTaxTipMethod === 'proportional' && '(proportional)'}
                  </span>
                  <span className="font-mono text-tabie-text">${myTipShare.toFixed(2)}</span>
                </div>
              )}
            </div>

            <div className="flex justify-between font-semibold">
              <span className="text-tabie-text">Total</span>
              <span className="font-mono text-tabie-primary">${myTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Admin view: See everyone's totals */}
        {isAdmin && (
          <div className="card">
            <h3 className="font-semibold text-tabie-text mb-3">Everyone's Share</h3>
            <div className="space-y-2">
              {tab.people?.map((person) => {
                const personTotal = getPersonTotal(person.id)
                return (
                  <div key={person.id} className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{ backgroundColor: person.color + '30', color: person.color }}
                    >
                      {person.name[0]}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm text-tabie-text">
                        {person.name}
                        {person.id === participantId && <span className="text-tabie-muted"> (you)</span>}
                      </p>
                    </div>
                    <span className="font-mono text-sm text-tabie-text">${personTotal.toFixed(2)}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Payment info for non-admin */}
        {!isAdmin && (
          <div className="card">
            <h3 className="font-semibold text-tabie-text mb-3">Pay {organizer?.name || 'Organizer'}</h3>
            <p className="text-sm text-tabie-muted">
              Payment integration coming soon. For now, please pay the organizer directly.
            </p>
          </div>
        )}
      </div>

      {/* Bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-tabie-bg/90 backdrop-blur-lg border-t border-tabie-border p-4">
        <div className="max-w-[430px] mx-auto">
          <button
            className="w-full btn-primary flex items-center justify-center gap-2 opacity-50 cursor-not-allowed"
            disabled
          >
            <CreditCard className="w-5 h-5" />
            Pay ${myTotal.toFixed(2)} - Coming Soon
          </button>
          <p className="text-xs text-tabie-muted text-center mt-2">
            Stripe payments coming soon
          </p>
        </div>
      </div>
    </div>
  )
}
