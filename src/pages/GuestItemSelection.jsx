import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTab } from '../hooks/useTab'
import { useParticipantId } from '../hooks/useParticipantId'
import { useAuthStore } from '../stores/authStore'
import { confirmPayment, rejectPayment, updateTab, addParticipant, removeParticipant } from '../services/firestore'
import {
  Receipt,
  Users,
  Loader2,
  AlertCircle,
  Check,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  DollarSign,
  Share2,
  Copy,
  Divide,
  UserPlus,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Crown,
  Archive,
  RotateCcw,
  AlertTriangle,
  X,
  Trash2,
  Plus,
  Edit3
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

  const { isAuthenticated, user } = useAuthStore()

  const [expandedItem, setExpandedItem] = useState(null)
  const [showSharePanel, setShowSharePanel] = useState(false)
  const [showPaymentPanel, setShowPaymentPanel] = useState(false)
  const [copied, setCopied] = useState(false)
  const [confirmingPayment, setConfirmingPayment] = useState(null)
  const [showCloseModal, setShowCloseModal] = useState(false)
  const [closingTab, setClosingTab] = useState(false)
  const [assigningItem, setAssigningItem] = useState(null) // For admin item assignment
  const [showEditPeopleModal, setShowEditPeopleModal] = useState(false)
  const [newPersonName, setNewPersonName] = useState('')
  const [addingPerson, setAddingPerson] = useState(false)
  const [removingPerson, setRemovingPerson] = useState(null)

  // Resolve participant identity (admin auto-recognition + localStorage)
  const participantId = useParticipantId(tabId, tab, loading)

  if (loading) {
    return (
      <div className="min-h-screen bg-tabie-bg pb-32">
        {/* Skeleton Header */}
        <div className="sticky top-0 bg-tabie-bg/95 backdrop-blur-lg z-20 px-6 pt-8 pb-4 border-b border-tabie-border">
          <div className="flex items-center gap-2 mb-4">
            <div className="skeleton-text w-6 h-6" />
            <div className="skeleton-text w-32 h-5" />
          </div>
          <div className="skeleton-text w-48 h-4" />
        </div>

        {/* Skeleton Items */}
        <div className="px-6 py-4 space-y-3">
          <div className="skeleton-text w-56 mb-4 h-3" />
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card flex items-center gap-4">
              <div className="flex-1">
                <div className="skeleton-text w-40 mb-2 h-5" />
                <div className="skeleton-text w-24 h-3" />
              </div>
              <div className="skeleton-text w-16 h-6" />
            </div>
          ))}
        </div>

        {/* Skeleton Bottom Bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-tabie-bg/95 backdrop-blur-lg border-t border-tabie-border p-4">
          <div className="max-w-[430px] mx-auto">
            <div className="skeleton h-14 rounded-xl" />
          </div>
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
  // Admin is the user who created the tab (using createdBy field)
  const isAdmin = user?.id && tab.createdBy === user.id
  const myTotal = getPersonTotal(participantId)
  const myItems = tab.items?.filter(item => item.assignedTo?.includes(participantId)) || []
  const isTabClosed = tab.status === 'closed' || tab.status === 'completed'

  // Payment tracking stats (for admin) — exclude organizer (index 0) since they paid the bill
  const guests = tab.people?.slice(1) || []
  const confirmedCount = guests.filter(p => p.paymentStatus === 'confirmed').length
  const claimedCount = guests.filter(p => p.paymentStatus === 'claimed').length
  const pendingCount = guests.filter(p => !p.paymentStatus || p.paymentStatus === 'pending').length
  const totalPeople = guests.length

  // Unassigned items tracking
  const unassignedItems = tab.items?.filter(item => !item.assignedTo || item.assignedTo.length === 0) || []
  const unassignedCount = unassignedItems.length

  // Calculate outstanding amount for close tab confirmation
  const billTotal = (tab.subtotal || 0) + (tab.tax || 0) + (tab.tip || 0)
  const totalCollected = tab.people
    ?.filter(p => p.paymentStatus === 'confirmed')
    .reduce((sum, p) => sum + getPersonTotal(p.id), 0) || 0
  const outstandingAmount = billTotal - totalCollected

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

  // Get payment status display info
  const getPaymentStatusInfo = (person, isOrganizer = false) => {
    if (isOrganizer) {
      return { label: 'Organizer', color: 'text-tabie-primary', bg: 'bg-tabie-primary/10', icon: Crown }
    }
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

  // Handle admin directly marking someone as paid (without them claiming first)
  const handleMarkAsPaid = async (personId) => {
    setConfirmingPayment(personId)
    try {
      await confirmPayment(tabId, personId)
    } catch (err) {
      console.error('Error marking as paid:', err)
      alert('Failed to mark as paid. Please try again.')
    } finally {
      setConfirmingPayment(null)
    }
  }

  // Handle admin marking someone as unpaid
  const handleMarkAsUnpaid = async (personId) => {
    setConfirmingPayment(personId)
    try {
      await rejectPayment(tabId, personId)
    } catch (err) {
      console.error('Error marking as unpaid:', err)
      alert('Failed to mark as unpaid. Please try again.')
    } finally {
      setConfirmingPayment(null)
    }
  }

  // Handle closing the tab
  const handleCloseTab = async () => {
    setClosingTab(true)
    try {
      await updateTab(tabId, {
        status: 'closed',
        closedAt: new Date().toISOString()
      })
      setShowCloseModal(false)
    } catch (err) {
      console.error('Error closing tab:', err)
      alert('Failed to close tab. Please try again.')
    } finally {
      setClosingTab(false)
    }
  }

  // Handle reopening the tab
  const handleReopenTab = async () => {
    try {
      await updateTab(tabId, {
        status: 'open',
        closedAt: null
      })
    } catch (err) {
      console.error('Error reopening tab:', err)
      alert('Failed to reopen tab. Please try again.')
    }
  }

  // Handle admin assigning an item to a specific person
  const handleAdminAssignItem = async (itemId, personId, share = 1) => {
    try {
      await setSplitShare(itemId, personId, share)
    } catch (err) {
      console.error('Error assigning item:', err)
    }
  }

  // Generate a random color for new participants
  const generateColor = () => {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9']
    return colors[Math.floor(Math.random() * colors.length)]
  }

  // Handle adding a new person
  const handleAddPerson = async (e) => {
    e.preventDefault()
    if (!newPersonName.trim()) return

    setAddingPerson(true)
    try {
      const newPerson = {
        id: `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: newPersonName.trim(),
        color: generateColor(),
        isAdmin: false,
        paymentStatus: 'pending',
        paid: false
      }
      await addParticipant(tabId, newPerson)
      setNewPersonName('')
    } catch (err) {
      console.error('Error adding person:', err)
      alert('Failed to add person. Please try again.')
    } finally {
      setAddingPerson(false)
    }
  }

  // Handle removing a person
  const handleRemovePerson = async (personId) => {
    // Don't allow removing yourself (the admin)
    if (personId === participantId) {
      alert("You can't remove yourself from the tab.")
      return
    }

    const person = tab.people?.find(p => p.id === personId)
    if (!confirm(`Remove ${person?.name} from this tab? This will also remove their item assignments.`)) {
      return
    }

    setRemovingPerson(personId)
    try {
      await removeParticipant(tabId, personId)
    } catch (err) {
      console.error('Error removing person:', err)
      alert('Failed to remove person. Please try again.')
    } finally {
      setRemovingPerson(null)
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
    <div className="min-h-screen bg-tabie-bg pb-52">
      {/* Header */}
      <div className="sticky top-0 bg-tabie-bg/95 backdrop-blur-lg z-20 px-6 pt-8 pb-4 border-b border-tabie-border">
        {/* Back button for logged-in users */}
        {isAuthenticated && (
          <button
            onClick={() => navigate('/home')}
            className="flex items-center gap-2 text-tabie-muted hover:text-tabie-text transition-colors mb-3 focus-ring rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to My Tabs
          </button>
        )}

        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-tabie-text">{tab.restaurantName || 'Bill Split'}</h1>
              {isAdmin && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-tabie-primary/20 text-tabie-primary text-xs font-medium">
                  <Crown className="w-3 h-3" />
                  Admin
                </span>
              )}
              {isTabClosed && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-tabie-surface text-tabie-muted text-xs font-medium">
                  <Archive className="w-3 h-3" />
                  Closed
                </span>
              )}
            </div>
            <p className="text-sm text-tabie-muted">
              {isAdmin ? 'Manage your tab' : `Hi ${currentParticipant?.name}! Select what you had`}
            </p>
          </div>
          {!isAdmin && (
            <button
              onClick={() => setShowSharePanel(!showSharePanel)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-tabie-surface border border-tabie-border text-sm focus-ring"
            >
              <Users className="w-5 h-5 text-tabie-muted" />
              <span className="text-tabie-text">{tab.people?.length || 0}</span>
            </button>
          )}
        </div>

        {/* Unassigned items warning (admin only) */}
        {isAdmin && unassignedCount > 0 && !isTabClosed && (
          <div className="mt-2 px-3 py-2 rounded-xl bg-yellow-500/10 border border-yellow-500/30 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0" />
            <p className="text-sm font-medium text-yellow-500">
              {unassignedCount} item{unassignedCount > 1 ? 's' : ''} unassigned
            </p>
          </div>
        )}

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
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowEditPeopleModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-tabie-surface border border-tabie-border text-tabie-text text-sm font-medium hover:bg-tabie-border transition-colors"
              >
                <Edit3 className="w-4 h-4" />
                Edit
              </button>
              <button
                onClick={handleShare}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-tabie-primary/20 text-tabie-primary text-sm font-medium"
              >
                <Share2 className="w-4 h-4" />
                Invite
              </button>
            </div>
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

        {/* Admin Payment Status Summary (compact, stays in header) */}
        {isAdmin && (
          <button
            onClick={() => setShowPaymentPanel(true)}
            className={`mt-2 w-full px-3 py-2 rounded-xl border transition-all flex items-center justify-between ${
              claimedCount > 0
                ? 'bg-yellow-500/10 border-yellow-500/30'
                : confirmedCount === totalPeople
                  ? 'bg-green-500/10 border-green-500/30'
                  : 'bg-tabie-card border-tabie-border'
            }`}
          >
            <div className="flex items-center gap-2">
              {claimedCount > 0 ? (
                <Clock className="w-4 h-4 text-yellow-500" />
              ) : confirmedCount === totalPeople ? (
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              ) : (
                <DollarSign className="w-4 h-4 text-tabie-muted" />
              )}
              <span className="font-medium text-sm text-tabie-text">
                {confirmedCount === totalPeople
                  ? 'All paid!'
                  : `${confirmedCount}/${totalPeople} paid`}
              </span>
              {claimedCount > 0 && (
                <span className="text-xs text-yellow-500">
                  • {claimedCount} pending
                </span>
              )}
            </div>
            <ChevronRight className="w-4 h-4 text-tabie-muted" />
          </button>
        )}

      </div>

      {/* Close Tab Confirmation Modal */}
      {showCloseModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-tabie-card border border-tabie-border rounded-2xl p-6 max-w-sm w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-tabie-text">Close Tab?</h3>
              <button
                onClick={() => setShowCloseModal(false)}
                className="p-1 rounded-lg hover:bg-tabie-surface text-tabie-muted"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {outstandingAmount > 0 && (
              <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30 mb-4">
                <div className="flex items-center gap-2 text-yellow-500 mb-1">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="font-medium text-sm">Outstanding balance</span>
                </div>
                <p className="text-2xl font-bold font-mono text-yellow-500">
                  ${outstandingAmount.toFixed(2)}
                </p>
                <p className="text-xs text-yellow-500/70 mt-1">
                  {pendingCount} guest{pendingCount !== 1 ? 's' : ''} still unpaid
                </p>
              </div>
            )}

            <p className="text-tabie-muted text-sm mb-4">
              {outstandingAmount > 0
                ? 'Are you sure you want to close this tab? You can reopen it later if needed.'
                : 'All payments collected! Close this tab to archive it.'}
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCloseModal(false)}
                className="flex-1 btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleCloseTab}
                disabled={closingTab}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-4 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {closingTab ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Archive className="w-4 h-4" />
                )}
                Close Tab
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit People Modal (Admin only) */}
      {showEditPeopleModal && isAdmin && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-tabie-card border border-tabie-border rounded-2xl p-6 max-w-sm w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-tabie-text">Edit People</h3>
              <button
                onClick={() => setShowEditPeopleModal(false)}
                className="p-1 rounded-lg hover:bg-tabie-surface text-tabie-muted"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Add new person form */}
            <form onSubmit={handleAddPerson} className="mb-4 p-3 rounded-xl bg-tabie-surface border border-tabie-border">
              <p className="text-xs text-tabie-muted mb-2 font-medium">Add a person</p>
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Name"
                  value={newPersonName}
                  onChange={(e) => setNewPersonName(e.target.value)}
                  className="w-full bg-tabie-bg rounded-lg px-3 py-2 text-sm text-tabie-text placeholder-tabie-muted border border-tabie-border focus:outline-none focus:ring-2 focus:ring-tabie-primary/50"
                />
                <button
                  type="submit"
                  disabled={!newPersonName.trim() || addingPerson}
                  className="w-full flex items-center justify-center gap-2 bg-tabie-primary text-white font-medium py-2 px-4 rounded-lg disabled:opacity-50 transition-colors hover:bg-tabie-primary/90"
                >
                  {addingPerson ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  Add Person
                </button>
              </div>
            </form>

            {/* People list */}
            <div className="flex-1 overflow-y-auto space-y-2">
              <p className="text-xs text-tabie-muted font-medium">
                People on this tab ({tab.people?.length || 0})
              </p>
              {tab.people?.map((person, index) => {
                const isCurrentUser = person.id === participantId
                const personTotal = getPersonTotal(person.id)
                const statusInfo = getPaymentStatusInfo(person, index === 0)

                return (
                  <div
                    key={person.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-tabie-surface"
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                      style={{ backgroundColor: person.color + '30', color: person.color }}
                    >
                      {person.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-tabie-text truncate">
                          {person.name}
                        </p>
                        {isCurrentUser && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-tabie-primary/20 text-tabie-primary flex-shrink-0">
                            You
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-tabie-muted">
                        <span className="font-mono">${personTotal.toFixed(2)}</span>
                        <span>•</span>
                        <span className={statusInfo.color}>{statusInfo.label}</span>
                      </div>
                    </div>
                    {!isCurrentUser && (
                      <button
                        onClick={() => handleRemovePerson(person.id)}
                        disabled={removingPerson === person.id}
                        className="p-2 rounded-lg hover:bg-red-500/20 text-tabie-muted hover:text-red-400 transition-colors disabled:opacity-50"
                      >
                        {removingPerson === person.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Done button */}
            <button
              onClick={() => setShowEditPeopleModal(false)}
              className="mt-4 w-full btn-secondary"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Payment Status Modal (Admin only) */}
      {showPaymentPanel && isAdmin && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center p-4">
          <div className="bg-tabie-card border border-tabie-border rounded-2xl w-full max-w-[430px] max-h-[75vh] overflow-hidden flex flex-col mb-4">
            <div className="flex items-center justify-between p-4 pb-2">
              <div>
                <h3 className="text-lg font-bold text-tabie-text">Payments</h3>
                <p className="text-xs text-tabie-muted">Owed based on items each person selected</p>
              </div>
              <button
                onClick={() => setShowPaymentPanel(false)}
                className="p-1 rounded-lg hover:bg-tabie-surface text-tabie-muted"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 pt-2 space-y-2">
              {tab.people?.map((person, index) => {
                const isOrganizer = index === 0
                const statusInfo = getPaymentStatusInfo(person, isOrganizer)
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
                            {isCurrentUser && <span className="text-xs text-tabie-muted ml-1">(you)</span>}
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
                    {!isOrganizer && person.paidVia && (
                      <p className="text-xs text-tabie-muted mt-1 ml-10">
                        via {person.paidVia.charAt(0).toUpperCase() + person.paidVia.slice(1)}
                        {person.paidAt && ` • ${new Date(person.paidAt).toLocaleDateString()}`}
                      </p>
                    )}

                    {/* Action buttons for admin (not shown for organizer row) */}
                    {!isCurrentUser && !isOrganizer && (
                      <div className="mt-2 ml-10 flex flex-wrap gap-2">
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
                            onClick={() => handleMarkAsPaid(person.id)}
                            disabled={confirmingPayment === person.id}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-500 text-white text-xs font-medium disabled:opacity-50"
                          >
                            {confirmingPayment === person.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <CheckCircle2 className="w-3 h-3" />
                            )}
                            Mark Paid
                          </button>
                        )}
                        {person.paymentStatus === 'confirmed' && (
                          <button
                            onClick={() => handleMarkAsUnpaid(person.id)}
                            disabled={confirmingPayment === person.id}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-tabie-surface text-tabie-muted text-xs font-medium hover:bg-red-500/20 hover:text-red-400 disabled:opacity-50"
                          >
                            {confirmingPayment === person.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <XCircle className="w-3 h-3" />
                            )}
                            Mark Unpaid
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="p-4 pt-2">
              <button
                onClick={() => setShowPaymentPanel(false)}
                className="w-full btn-secondary"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

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

            const isUnassigned = !item.assignedTo || item.assignedTo.length === 0

            return (
              <div key={item.id} className={`card ${isAdmin && isUnassigned ? 'border-yellow-500/50 bg-yellow-500/5' : ''}`}>
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
                    <p className={`font-medium text-tabie-text ${!isExpanded ? 'line-clamp-1' : ''}`}>
                      {item.quantity > 1 && (
                        <span className="text-tabie-muted">{item.quantity}x </span>
                      )}
                      {item.description}
                    </p>

                    {/* Show split status */}
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {isAdmin && isUnassigned && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-500">
                          Tap to assign
                        </span>
                      )}
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

                          {/* Dynamic fraction buttons from 1/2 up to 1/(n-1) — last fraction is covered by "Everyone" */}
                          {Array.from({ length: Math.max(0, (tab.people?.length || 2) - 2) }, (_, i) => i + 2).map(divisor => {
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

                    {/* Admin: Assign to specific people */}
                    {isAdmin && !isTabClosed && (
                      <div className="mt-3 pt-3 border-t border-tabie-border">
                        <p className="text-xs text-tabie-muted mb-2 flex items-center gap-1">
                          <Crown className="w-3 h-3 text-tabie-primary" />
                          Assign to people:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {tab.people?.map(person => {
                            const isAssigned = item.assignedTo?.includes(person.id)
                            const personQty = item.assignments?.[person.id] || 0
                            return (
                              <button
                                key={person.id}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  if (isAssigned) {
                                    // Remove assignment
                                    handleAdminAssignItem(item.id, person.id, 0)
                                  } else {
                                    // Add assignment (1 for single items, 1 unit for multi-qty)
                                    handleAdminAssignItem(item.id, person.id, item.quantity === 1 ? 1 : 1)
                                  }
                                }}
                                className={`text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-all ${
                                  isAssigned
                                    ? 'ring-2 ring-offset-1 ring-offset-tabie-bg'
                                    : 'opacity-50 hover:opacity-100'
                                }`}
                                style={{
                                  backgroundColor: person.color + '30',
                                  color: person.color,
                                  ringColor: isAssigned ? person.color : 'transparent'
                                }}
                              >
                                {isAssigned && <Check className="w-3 h-3" />}
                                {person.name}
                                {person.id === participantId && ' (you)'}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Who's splitting this (read-only for guests) */}
                    {!isAdmin && numClaimers > 0 && (
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
          {isAdmin ? (
            /* Admin view - show what others owe */
            (() => {
              const billTotal = (tab.subtotal || 0) + (tab.tax || 0) + (tab.tip || 0)
              const adminTotal = getPersonTotal(participantId)
              const amountOwedToAdmin = billTotal - adminTotal
              const amountCollected = tab.people
                ?.filter(p => p.id !== participantId && p.paymentStatus === 'confirmed')
                .reduce((sum, p) => sum + getPersonTotal(p.id), 0) || 0
              const amountPending = amountOwedToAdmin - amountCollected
              const guestsCount = (tab.people?.length || 1) - 1
              const paidGuestsCount = tab.people?.filter(p => p.id !== participantId && p.paymentStatus === 'confirmed').length || 0

              return (
                <>
                  <div className="space-y-1 mb-3 text-sm">
                    <div className="flex justify-between text-tabie-muted">
                      <span>Bill total</span>
                      <span className="font-mono">${billTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-tabie-muted">
                      <span>Your share</span>
                      <span className="font-mono">-${Math.abs(adminTotal).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-green-500">
                      <span>Collected ({paidGuestsCount}/{guestsCount})</span>
                      <span className="font-mono">${amountCollected.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between py-3 border-t border-tabie-border">
                    <div>
                      <p className="text-sm text-tabie-muted">Still Owed</p>
                      <p className={`text-2xl font-bold font-mono ${amountPending > 0 ? 'text-yellow-500' : 'text-green-500'}`}>
                        ${Math.max(0, amountPending).toFixed(2)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {isTabClosed ? (
                        <button
                          onClick={handleReopenTab}
                          className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-tabie-primary text-white text-sm font-medium hover:bg-tabie-primary/90 transition-colors"
                        >
                          <RotateCcw className="w-4 h-4" />
                          Reopen
                        </button>
                      ) : (
                        <button
                          onClick={() => setShowCloseModal(true)}
                          className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                            confirmedCount === totalPeople && totalPeople > 0
                              ? 'bg-green-500 text-white hover:bg-green-600'
                              : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                          }`}
                        >
                          <Archive className="w-4 h-4" />
                          Close
                        </button>
                      )}
                      {amountPending > 0 ? (
                        <button
                          onClick={() => setShowPaymentPanel(true)}
                          className="btn-secondary flex items-center gap-2"
                        >
                          <Users className="w-4 h-4" />
                          Payments
                        </button>
                      ) : (
                        <div className="flex items-center gap-1.5 text-green-500">
                          <CheckCircle2 className="w-5 h-5" />
                          <span className="font-medium text-sm">Settled!</span>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )
            })()
          ) : (
            /* Guest view - show their total and pay button */
            <>
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
            </>
          )}
        </div>
      </div>
    </div>
  )
}
