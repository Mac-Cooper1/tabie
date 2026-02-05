import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTab } from '../hooks/useTab'
import { confirmPayment, rejectPayment } from '../services/firestore'
import {
  Receipt,
  Users,
  Loader2,
  AlertCircle,
  Check,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Share2,
  Copy,
  Divide,
  UserPlus,
  Clock,
  CheckCircle2,
  XCircle,
  MessageSquare
} from 'lucide-react'

export default function GuestItemSelection() {
  const { tabId } = useParams()
  const navigate = useNavigate()
  const {
    tab,
    loading,
    error,
    toggleItemAssignment,
    updateItemAssignment,
    familySplitItem,
    clearItemAssignments,
    setSplitShare,
    getPersonTotal
  } = useTab(tabId)

  const [expandedItem, setExpandedItem] = useState(null)
  const [showSharePanel, setShowSharePanel] = useState(false)
  const [showPaymentPanel, setShowPaymentPanel] = useState(false)
  const [copied, setCopied] = useState(false)
  const [confirmingPayment, setConfirmingPayment] = useState(null)
  const [sendingReminder, setSendingReminder] = useState(null)

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
  const isAdmin = tab.people?.[0]?.id === participantId // First person is the admin
  const myTotal = getPersonTotal(participantId)
  const myItems = tab.items?.filter(item => item.assignedTo?.includes(participantId)) || []

  // Payment tracking stats (for admin)
  const confirmedCount = tab.people?.filter(p => p.paymentStatus === 'confirmed').length || 0
  const claimedCount = tab.people?.filter(p => p.paymentStatus === 'claimed').length || 0
  const pendingCount = tab.people?.filter(p => !p.paymentStatus || p.paymentStatus === 'pending').length || 0
  const totalPeople = tab.people?.length || 0

  // Handle confirming a payment claim
  const handleConfirmPayment = async (personId) => {
    setConfirmingPayment(personId)
    try {
      await confirmPayment(tabId, personId)
    } catch (err) {
      console.error('Error confirming payment:', err)
      alert('Failed to confirm payment. Please try again.')
    } finally {
      setConfirmingPayment(null)
    }
  }

  // Handle rejecting a payment claim
  const handleRejectPayment = async (personId) => {
    if (!confirm('Are you sure? This will reset their payment status to pending.')) return
    setConfirmingPayment(personId)
    try {
      await rejectPayment(tabId, personId)
    } catch (err) {
      console.error('Error rejecting payment:', err)
      alert('Failed to reject payment. Please try again.')
    } finally {
      setConfirmingPayment(null)
    }
  }

  // Handle sending a reminder
  const handleSendReminder = async (person) => {
    if (!person.phone) {
      alert(`${person.name} doesn't have a phone number on file.`)
      return
    }
    setSendingReminder(person.id)
    try {
      const personTotal = getPersonTotal(person.id)
      const response = await fetch('/api/twilio/send-payment-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: person.phone,
          name: person.name,
          amount: personTotal,
          restaurant: tab.restaurantName || 'your meal',
          tabId,
          participantId: person.id,
          organizerName: tab.adminPaymentAccounts?.adminName || tab.people?.[0]?.name || 'the organizer'
        })
      })
      if (response.ok) {
        alert(`Reminder sent to ${person.name}!`)
      } else {
        throw new Error('Failed to send')
      }
    } catch (err) {
      console.error('Error sending reminder:', err)
      alert('Failed to send reminder. Please try again.')
    } finally {
      setSendingReminder(null)
    }
  }

  // Get payment status display info
  const getPaymentStatusInfo = (person) => {
    const status = person.paymentStatus || 'pending'
    switch (status) {
      case 'confirmed':
        return { label: 'Paid', color: 'text-green-500', bg: 'bg-green-500/20', icon: CheckCircle2 }
      case 'claimed':
        return { label: 'Awaiting confirmation', color: 'text-yellow-500', bg: 'bg-yellow-500/20', icon: Clock }
      default:
        return { label: 'Unpaid', color: 'text-tabie-muted', bg: 'bg-tabie-surface', icon: null }
    }
  }

  // Calculate my subtotal (before tax/tip)
  let mySubtotal = 0
  myItems.forEach(item => {
    if (item.assignments && item.assignments[participantId] !== undefined) {
      const personQty = item.assignments[participantId]
      const pricePerUnit = item.totalPrice / item.quantity
      mySubtotal += pricePerUnit * personQty
    } else {
      mySubtotal += item.totalPrice / item.assignedTo.length
    }
  })

  // Calculate my tax/tip share
  let myTaxTipShare = 0
  if (tab.splitTaxTipMethod === 'equal' && tab.people?.length > 0) {
    myTaxTipShare = ((tab.tax || 0) + (tab.tip || 0)) / tab.people.length
  } else if (tab.subtotal > 0) {
    const proportion = mySubtotal / tab.subtotal
    myTaxTipShare = ((tab.tax || 0) + (tab.tip || 0)) * proportion
  }

  const shareLink = `${window.location.origin}/join/${tabId}`

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `${tab.restaurantName || 'Bill'} Split`,
        text: `Join my bill split!`,
        url: shareLink
      }).catch(console.error)
    } else {
      handleCopyLink()
    }
  }

  return (
    <div className="min-h-screen bg-tabie-bg pb-40">
      {/* Header */}
      <div className="sticky top-0 bg-tabie-bg/90 backdrop-blur-lg z-20 px-6 pt-8 pb-4 border-b border-tabie-border">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-xl font-bold text-tabie-text">{tab.restaurantName || 'Bill Split'}</h1>
            <p className="text-sm text-tabie-muted">
              Hi {currentParticipant?.name}! Select what you had
            </p>
          </div>
          <button
            onClick={() => setShowSharePanel(!showSharePanel)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-tabie-surface border border-tabie-border text-sm"
          >
            <Users className="w-4 h-4 text-tabie-muted" />
            <span className="text-tabie-text">{tab.people?.length || 0}</span>
          </button>
        </div>

        {/* Live participants */}
        <div className="flex items-center gap-2 mt-3">
          <div className="flex -space-x-2 flex-1">
            {tab.people?.map((person) => (
              <div
                key={person.id}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                  person.id === participantId ? 'border-tabie-primary' : 'border-tabie-bg'
                }`}
                style={{ backgroundColor: person.color + '30', color: person.color }}
                title={person.name}
              >
                {person.name[0]}
              </div>
            ))}
          </div>
          {isAdmin && (
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-tabie-primary/20 text-tabie-primary text-sm font-medium"
            >
              <Share2 className="w-4 h-4" />
              Invite
            </button>
          )}
        </div>

        {/* Share panel */}
        {showSharePanel && (
          <div className="mt-4 p-4 bg-tabie-card rounded-xl border border-tabie-border">
            <p className="text-sm text-tabie-muted mb-2">Share this link to invite friends:</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={shareLink}
                readOnly
                className="flex-1 bg-tabie-bg rounded-lg px-3 py-2 text-sm text-tabie-text"
              />
              <button
                onClick={handleCopyLink}
                className={`px-3 py-2 rounded-lg transition-all ${
                  copied ? 'bg-green-500/20 text-green-600' : 'bg-tabie-border text-tabie-muted'
                }`}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <div className="mt-3 space-y-1">
              <p className="text-xs text-tabie-muted font-medium">People in this tab:</p>
              {tab.people?.map((person, index) => (
                <div key={person.id} className="flex items-center gap-2 text-sm">
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ backgroundColor: person.color + '30', color: person.color }}
                  >
                    {person.name[0]}
                  </div>
                  <span className="text-tabie-text">{person.name}</span>
                  {index === 0 && <span className="text-xs text-tabie-muted">(organizer)</span>}
                  {person.id === participantId && <span className="text-xs text-tabie-primary">(you)</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Admin Payment Tracking Panel */}
        {isAdmin && (
          <div className="mt-4">
            <button
              onClick={() => setShowPaymentPanel(!showPaymentPanel)}
              className={`w-full p-3 rounded-xl border transition-all flex items-center justify-between ${
                claimedCount > 0
                  ? 'bg-yellow-500/10 border-yellow-500/30'
                  : confirmedCount === totalPeople
                    ? 'bg-green-500/10 border-green-500/30'
                    : 'bg-tabie-card border-tabie-border'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  claimedCount > 0 ? 'bg-yellow-500/20' : confirmedCount === totalPeople ? 'bg-green-500/20' : 'bg-tabie-surface'
                }`}>
                  {claimedCount > 0 ? (
                    <Clock className="w-5 h-5 text-yellow-500" />
                  ) : confirmedCount === totalPeople ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  ) : (
                    <DollarSign className="w-5 h-5 text-tabie-muted" />
                  )}
                </div>
                <div className="text-left">
                  <p className="font-medium text-tabie-text">
                    {confirmedCount === totalPeople
                      ? 'All payments confirmed!'
                      : `${confirmedCount}/${totalPeople} paid`}
                  </p>
                  {claimedCount > 0 && (
                    <p className="text-xs text-yellow-500">
                      {claimedCount} awaiting your confirmation
                    </p>
                  )}
                </div>
              </div>
              {showPaymentPanel ? (
                <ChevronUp className="w-5 h-5 text-tabie-muted" />
              ) : (
                <ChevronDown className="w-5 h-5 text-tabie-muted" />
              )}
            </button>

            {showPaymentPanel && (
              <div className="mt-2 p-4 bg-tabie-card rounded-xl border border-tabie-border space-y-3">
                <p className="text-xs text-tabie-muted font-medium">Payment Status</p>

                {tab.people?.map((person, index) => {
                  const statusInfo = getPaymentStatusInfo(person)
                  const personTotal = getPersonTotal(person.id)
                  const isCurrentUser = person.id === participantId
                  const StatusIcon = statusInfo.icon

                  return (
                    <div
                      key={person.id}
                      className={`p-3 rounded-lg ${statusInfo.bg}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                            style={{ backgroundColor: person.color + '30', color: person.color }}
                          >
                            {person.name[0]}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-tabie-text">
                              {person.name}
                              {index === 0 && <span className="text-xs text-tabie-muted ml-1">(you)</span>}
                            </p>
                            <p className="text-xs text-tabie-muted font-mono">${personTotal.toFixed(2)}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {StatusIcon && (
                            <StatusIcon className={`w-4 h-4 ${statusInfo.color}`} />
                          )}
                          <span className={`text-xs font-medium ${statusInfo.color}`}>
                            {statusInfo.label}
                          </span>
                        </div>
                      </div>

                      {/* Show payment method if claimed or confirmed */}
                      {person.paidVia && (
                        <p className="text-xs text-tabie-muted mt-1 ml-10">
                          via {person.paidVia.charAt(0).toUpperCase() + person.paidVia.slice(1)}
                          {person.paidAt && ` • ${new Date(person.paidAt).toLocaleDateString()}`}
                        </p>
                      )}

                      {/* Action buttons for admin */}
                      {!isCurrentUser && (
                        <div className="mt-2 ml-10 flex gap-2">
                          {person.paymentStatus === 'claimed' && (
                            <>
                              <button
                                onClick={() => handleConfirmPayment(person.id)}
                                disabled={confirmingPayment === person.id}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-500 text-white text-xs font-medium disabled:opacity-50"
                              >
                                {confirmingPayment === person.id ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Check className="w-3 h-3" />
                                )}
                                Confirm
                              </button>
                              <button
                                onClick={() => handleRejectPayment(person.id)}
                                disabled={confirmingPayment === person.id}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 text-xs font-medium disabled:opacity-50"
                              >
                                <XCircle className="w-3 h-3" />
                                Reject
                              </button>
                            </>
                          )}
                          {(!person.paymentStatus || person.paymentStatus === 'pending') && (
                            <button
                              onClick={() => handleSendReminder(person)}
                              disabled={sendingReminder === person.id}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-tabie-primary/20 text-tabie-primary text-xs font-medium disabled:opacity-50"
                            >
                              {sendingReminder === person.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <MessageSquare className="w-3 h-3" />
                              )}
                              Send Reminder
                            </button>
                          )}
                          {person.paymentStatus === 'confirmed' && (
                            <span className="text-xs text-green-500 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              Payment received
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Items list */}
      <div className="px-6 py-4 space-y-3">
        <p className="text-sm text-tabie-muted mb-2">
          Tap items you had. Changes sync in real-time!
        </p>

        {tab.items?.length === 0 ? (
          <div className="text-center py-12">
            <Receipt className="w-12 h-12 text-tabie-muted mx-auto mb-3" />
            <p className="text-tabie-muted">No items yet</p>
            {isAdmin && (
              <p className="text-sm text-tabie-muted mt-1">
                Go back to add items from the receipt
              </p>
            )}
          </div>
        ) : (
          tab.items?.map((item) => {
            const isMyItem = item.assignedTo?.includes(participantId)
            const myQty = item.assignments?.[participantId] || 0
            const totalAssigned = Object.values(item.assignments || {}).reduce((a, b) => a + b, 0)
            const remainingQty = item.quantity - totalAssigned
            const myRemainingQty = item.quantity - totalAssigned + myQty
            const canClaim = isMyItem || remainingQty > 0
            const numClaimers = item.assignedTo?.length || 0
            const isExpanded = expandedItem === item.id
            const isFamilySplit = numClaimers === tab.people?.length && numClaimers > 1

            // Get who else claimed this
            const otherClaimers = item.assignedTo?.filter(id => id !== participantId)
              .map(id => tab.people?.find(p => p.id === id))
              .filter(Boolean) || []

            // Calculate my share for display
            const getMyShare = () => {
              if (!isMyItem) return null
              if (item.quantity > 1) {
                return `${myQty} of ${item.quantity}`
              }
              // For single items, show the actual fraction based on what they selected
              if (myQty === 1) return 'Just you'
              // Check for common fractions 1/2 through 1/10
              for (let d = 2; d <= 10; d++) {
                if (Math.abs(myQty - 1/d) < 0.01) {
                  // Only say "Everyone" if the fraction matches the number of people
                  if (isFamilySplit && d === tab.people?.length) return 'Everyone'
                  return `1/${d} split`
                }
              }
              // Fallback for other values
              return `${Math.round(myQty * 100)}%`
            }

            return (
              <div key={item.id} className="card">
                <div
                  onClick={() => setExpandedItem(isExpanded ? null : item.id)}
                  className={`flex items-center gap-3 cursor-pointer ${!canClaim && !isMyItem ? 'opacity-50' : ''}`}
                >
                  {/* Checkbox */}
                  <div
                    className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                      isMyItem
                        ? 'bg-tabie-primary border-tabie-primary'
                        : canClaim
                          ? 'border-tabie-border'
                          : 'border-tabie-border bg-tabie-surface'
                    }`}
                  >
                    {isMyItem && <Check className="w-4 h-4 text-white" />}
                  </div>

                  {/* Item info */}
                  <div className="flex-1">
                    <p className="font-medium text-tabie-text">
                      {item.quantity > 1 && (
                        <span className="text-tabie-muted">{item.quantity}x </span>
                      )}
                      {item.description}
                    </p>

                    {/* Show split status */}
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {isMyItem && (
                        <span
                          className="text-xs px-2 py-0.5 rounded-full"
                          style={{
                            backgroundColor: currentParticipant?.color + '30',
                            color: currentParticipant?.color
                          }}
                        >
                          {getMyShare()}
                        </span>
                      )}
                      {otherClaimers.length > 0 && !isFamilySplit && (
                        <span className="text-xs text-tabie-muted">
                          +{otherClaimers.length} {otherClaimers.length === 1 ? 'other' : 'others'}
                        </span>
                      )}
                      {!isMyItem && numClaimers > 0 && (
                        <span className="text-xs text-tabie-muted">
                          {isFamilySplit ? 'Everyone' : `${numClaimers} ${numClaimers === 1 ? 'person' : 'people'}`}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Price */}
                  <div className="text-right">
                    <p className="font-mono font-semibold text-tabie-text">${item.totalPrice.toFixed(2)}</p>
                    {isMyItem && item.quantity === 1 && myQty < 1 && (
                      <p className="text-xs text-tabie-primary">
                        ${(item.totalPrice * myQty).toFixed(2)} yours
                      </p>
                    )}
                    {item.quantity > 1 && (
                      <p className="text-xs text-tabie-muted">
                        ${(item.totalPrice / item.quantity).toFixed(2)} ea
                      </p>
                    )}
                  </div>

                  {isExpanded
                    ? <ChevronUp className="w-5 h-5 text-tabie-muted" />
                    : <ChevronDown className="w-5 h-5 text-tabie-muted" />
                  }
                </div>

                {/* Expanded options */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-tabie-border">
                    {item.quantity === 1 ? (
                      /* Split options for single items */
                      <div className="space-y-2">
                        <p className="text-xs text-tabie-muted mb-2">What's your share?</p>

                        {/* Dynamic split buttons based on number of people */}
                        <div className="flex flex-wrap gap-1.5">
                          {/* Just me - full price */}
                          <button
                            onClick={async (e) => {
                              e.stopPropagation()
                              // Clear all assignments first, then set just me
                              await clearItemAssignments(item.id)
                              setSplitShare(item.id, participantId, 1)
                            }}
                            className={`py-1.5 px-3 rounded-lg text-xs font-medium transition-all ${
                              isMyItem && myQty === 1 && numClaimers === 1
                                ? 'bg-tabie-primary text-white'
                                : 'bg-tabie-surface text-tabie-text hover:bg-tabie-border'
                            }`}
                          >
                            Just me
                          </button>

                          {/* Dynamic fraction buttons from 1/2 up to 1/n (number of people) */}
                          {Array.from({ length: Math.max(1, (tab.people?.length || 2) - 1) }, (_, i) => i + 2).map(divisor => {
                            const share = 1 / divisor
                            const isSelected = isMyItem && Math.abs(myQty - share) < 0.01 && !isFamilySplit
                            return (
                              <button
                                key={divisor}
                                onClick={async (e) => {
                                  e.stopPropagation()
                                  // Clear all assignments first, then set my share
                                  await clearItemAssignments(item.id)
                                  setSplitShare(item.id, participantId, share)
                                }}
                                className={`py-1.5 px-3 rounded-lg text-xs font-medium transition-all ${
                                  isSelected
                                    ? 'bg-tabie-primary text-white'
                                    : 'bg-tabie-surface text-tabie-text hover:bg-tabie-border'
                                }`}
                              >
                                1/{divisor}
                              </button>
                            )
                          })}

                          {/* Everyone button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              familySplitItem(item.id)
                            }}
                            className={`py-1.5 px-3 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${
                              isFamilySplit
                                ? 'bg-tabie-primary text-white'
                                : 'bg-tabie-surface text-tabie-text hover:bg-tabie-border'
                            }`}
                          >
                            <Users className="w-3 h-3" />
                            All
                          </button>
                        </div>

                        {/* Show calculated price */}
                        {isMyItem && (
                          <p className="text-xs text-tabie-muted text-center mt-1">
                            Your share: <span className="text-tabie-primary font-mono font-medium">${(item.totalPrice * myQty).toFixed(2)}</span>
                          </p>
                        )}

                        {/* Clear button if assigned */}
                        {isMyItem && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setSplitShare(item.id, participantId, 0)
                            }}
                            className="w-full py-1.5 px-3 rounded-lg text-xs font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all"
                          >
                            Remove me from this item
                          </button>
                        )}
                      </div>
                    ) : (
                      /* Quantity selector for multi-qty items */
                      <div>
                        <p className="text-xs text-tabie-muted mb-2">How many did you have?</p>
                        <div className="flex items-center justify-center gap-4">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              updateItemAssignment(item.id, participantId, Math.max(0, myQty - 1))
                            }}
                            className="w-10 h-10 rounded-xl bg-tabie-surface text-tabie-text flex items-center justify-center text-xl font-bold disabled:opacity-50"
                            disabled={myQty <= 0}
                          >
                            -
                          </button>
                          <span className="font-mono text-2xl font-bold w-12 text-center text-tabie-text">{myQty}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              updateItemAssignment(item.id, participantId, Math.min(myRemainingQty, myQty + 1))
                            }}
                            className="w-10 h-10 rounded-xl bg-tabie-primary text-white flex items-center justify-center text-xl font-bold disabled:opacity-50"
                            disabled={myQty >= myRemainingQty}
                          >
                            +
                          </button>
                        </div>
                        {remainingQty > 0 && remainingQty < item.quantity && (
                          <p className="text-xs text-tabie-muted text-center mt-2">
                            {remainingQty} still unclaimed
                          </p>
                        )}
                      </div>
                    )}

                    {/* Who's splitting this */}
                    {numClaimers > 0 && (
                      <div className="mt-3 pt-3 border-t border-tabie-border">
                        <p className="text-xs text-tabie-muted mb-2">Who's paying:</p>
                        <div className="flex flex-wrap gap-2">
                          {item.assignedTo?.map(id => {
                            const person = tab.people?.find(p => p.id === id)
                            if (!person) return null
                            const isMe = id === participantId
                            return (
                              <span
                                key={id}
                                className="text-xs px-2 py-1 rounded-full flex items-center gap-1"
                                style={{
                                  backgroundColor: person.color + '30',
                                  color: person.color
                                }}
                              >
                                {person.name}
                                {isMe && ' (you)'}
                              </span>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Bottom summary */}
      <div className="fixed bottom-0 left-0 right-0 bg-tabie-bg/95 backdrop-blur-lg border-t border-tabie-border">
        <div className="max-w-[430px] mx-auto p-4">
          {/* Breakdown */}
          <div className="space-y-1 mb-3 text-sm">
            <div className="flex justify-between text-tabie-muted">
              <span>Your items ({myItems.length})</span>
              <span className="font-mono">${mySubtotal.toFixed(2)}</span>
            </div>
            {myTaxTipShare > 0 && (
              <div className="flex justify-between text-tabie-muted">
                <span>Tax & tip share</span>
                <span className="font-mono">${myTaxTipShare.toFixed(2)}</span>
              </div>
            )}
          </div>

          {/* Total */}
          <div className="flex items-center justify-between py-3 border-t border-tabie-border">
            <div>
              <p className="text-sm text-tabie-muted">Your Total</p>
              <p className="text-2xl font-bold text-tabie-primary font-mono">
                ${myTotal.toFixed(2)}
              </p>
            </div>
            <button
              className="btn-primary flex items-center gap-2"
              onClick={() => navigate(`/checkout/${tabId}`)}
            >
              <DollarSign className="w-4 h-4" />
              Pay Now
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
