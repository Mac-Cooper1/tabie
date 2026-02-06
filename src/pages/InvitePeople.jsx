import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBillStore } from '../stores/billStore'
import { useAuthStore } from '../stores/authStore'
import {
  ArrowLeft,
  Users,
  Plus,
  Trash2,
  Phone,
  Percent,
  DollarSign,
  Share2,
  Loader2,
  Check,
  Copy,
  Receipt,
  ChevronRight
} from 'lucide-react'

export default function InvitePeople() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const {
    currentTab,
    addPerson,
    removePerson,
    setTax,
    setTip,
    setTipPercentage,
    setSplitMethod,
    publishTab,
    getShareLink
  } = useBillStore()

  const [newPersonName, setNewPersonName] = useState('')
  const [newPersonPhone, setNewPersonPhone] = useState('')
  const [showAddPerson, setShowAddPerson] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [shareLink, setShareLink] = useState(null)
  const [copied, setCopied] = useState(false)
  const [showCustomTip, setShowCustomTip] = useState(false)
  const [customTipValue, setCustomTipValue] = useState('')

  // Track if we've already added the creator for this tab
  const creatorAddedForTab = useRef(null)

  // Auto-add the creator on mount if not already in list
  useEffect(() => {
    const addCreator = async () => {
      if (!currentTab || !user) return

      // Skip if we've already added creator for this tab
      const tabId = currentTab.firestoreId || currentTab.id
      if (creatorAddedForTab.current === tabId) return

      // Check if user is already in the people list
      const userName = user.name || user.email?.split('@')[0] || 'Me'
      const alreadyAdded = currentTab.people?.some(p => p.name === userName)

      if (!alreadyAdded && (!currentTab.people || currentTab.people.length === 0)) {
        await addPerson(userName, user.phone || null)
      }

      // Mark that we've handled this tab
      creatorAddedForTab.current = tabId
    }

    addCreator()
  }, [currentTab?.id, currentTab?.firestoreId, user?.id]) // Run when tab or user changes

  // Check if tab already has a share link
  useEffect(() => {
    if (currentTab?.firestoreId) {
      setShareLink(getShareLink())
    }
  }, [currentTab?.firestoreId])

  if (!currentTab) {
    navigate('/home')
    return null
  }

  const { people, items, subtotal, tax, tip, tipPercentage, splitTaxTipMethod } = currentTab
  const grandTotal = (subtotal || 0) + (tax || 0) + (tip || 0)

  const handleAddPerson = async (e) => {
    e.preventDefault()
    if (newPersonName.trim()) {
      await addPerson(newPersonName.trim(), newPersonPhone.trim() || null)
      setNewPersonName('')
      setNewPersonPhone('')
      setShowAddPerson(false)
    }
  }

  const handleTaxChange = async (value) => {
    const numValue = parseFloat(value) || 0
    await setTax(numValue)
  }

  const handleTipPercentageChange = async (percentage) => {
    setShowCustomTip(false)
    setCustomTipValue('')
    await setTipPercentage(percentage)
  }

  const handleCustomTipChange = async (value) => {
    const numValue = parseFloat(value) || 0
    setCustomTipValue(value)
    await setTip(numValue)
  }

  const handlePublishAndContinue = async () => {
    if (people.length === 0) {
      alert('Please add at least one person')
      return
    }

    // Check if user has payment accounts set up
    const hasPaymentAccounts = user?.paymentAccounts && (
      user.paymentAccounts.venmo ||
      user.paymentAccounts.cashapp ||
      user.paymentAccounts.paypal
    )

    if (!hasPaymentAccounts) {
      const proceed = confirm(
        "You haven't set up any payment accounts yet. Guests won't be able to pay you directly.\n\nWould you like to continue anyway? You can add payment accounts in Settings."
      )
      if (!proceed) return
    }

    setPublishing(true)
    try {
      // Snapshot admin's payment accounts at tab creation time
      const adminPaymentAccounts = {
        venmo: user?.paymentAccounts?.venmo || null,
        cashapp: user?.paymentAccounts?.cashapp || null,
        paypal: user?.paymentAccounts?.paypal || null,
        adminName: user?.name || 'Organizer'
      }

      const result = await publishTab(adminPaymentAccounts)
      setShareLink(result.shareLink)

      // Store the creator's participant ID locally
      const creatorPerson = people[0] // First person is the creator
      if (creatorPerson) {
        localStorage.setItem(`tabie_participant_${result.firestoreId}`, creatorPerson.id)
      }

      // Navigate to the item selection page
      navigate(`/tab/${result.firestoreId}/select`)
    } catch (error) {
      console.error('Error publishing tab:', error)
      alert(`Failed to create share link: ${error.message}`)
    } finally {
      setPublishing(false)
    }
  }

  const handleCopyLink = () => {
    if (shareLink) {
      navigator.clipboard.writeText(shareLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleShareLink = () => {
    if (navigator.share && shareLink) {
      navigator.share({
        title: `${currentTab.restaurantName || 'Bill'} Split`,
        text: `Join my bill split for ${currentTab.restaurantName || 'our meal'}!`,
        url: shareLink
      }).catch(console.error)
    } else {
      handleCopyLink()
    }
  }

  return (
    <div className="min-h-screen bg-tabie-bg pb-32">
      {/* Header */}
      <div className="sticky top-0 bg-tabie-bg/95 backdrop-blur-lg z-20 px-6 pt-8 pb-4 border-b border-tabie-border">
        <button
          onClick={() => navigate('/scan')}
          className="flex items-center gap-2 text-tabie-muted hover:text-tabie-text transition-colors mb-4 focus-ring rounded-lg"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>

        <h1 className="text-2xl font-bold text-tabie-text mb-1">Add People & Settings</h1>
        <p className="text-tabie-muted">Who's splitting the bill?</p>
      </div>

      <div className="px-6 py-6 space-y-6">
        {/* Bill Summary Card */}
        <div className="card">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-tabie-primary/20 flex items-center justify-center">
              <Receipt className="w-5 h-5 text-tabie-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-tabie-text">{currentTab.restaurantName || 'Bill'}</h3>
              <p className="text-sm text-tabie-muted">{items.length} items scanned</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-tabie-muted">Subtotal</p>
              <p className="font-mono font-bold text-lg text-tabie-text">${(subtotal || 0).toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* People Section */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-5 h-5 text-tabie-primary" />
            <h2 className="font-semibold text-lg text-tabie-text">People</h2>
            <span className="text-sm text-tabie-muted">({people.length})</span>
          </div>

          <div className="space-y-2">
            {people.map((person, index) => (
              <div key={person.id} className="card flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center font-bold"
                  style={{ backgroundColor: person.color + '30', color: person.color }}
                >
                  {person.name[0]}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-tabie-text">
                    {person.name}
                    {index === 0 && <span className="text-xs text-tabie-primary ml-2">(You)</span>}
                  </p>
                  {person.phone && (
                    <p className="text-sm text-tabie-muted">{person.phone}</p>
                  )}
                </div>
                {index > 0 && (
                  <button
                    onClick={async () => await removePerson(person.id)}
                    className="p-2 text-tabie-muted hover:text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}

            {/* Add person form */}
            {showAddPerson ? (
              <form onSubmit={handleAddPerson} className="card space-y-3">
                <input
                  type="text"
                  value={newPersonName}
                  onChange={(e) => setNewPersonName(e.target.value)}
                  placeholder="Name"
                  className="input-field w-full"
                  autoFocus
                />
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tabie-muted" />
                  <input
                    type="tel"
                    value={newPersonPhone}
                    onChange={(e) => setNewPersonPhone(e.target.value)}
                    placeholder="Phone number (optional)"
                    className="input-field w-full pl-10"
                  />
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="flex-1 btn-primary">Add</button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddPerson(false)
                      setNewPersonName('')
                      setNewPersonPhone('')
                    }}
                    className="btn-secondary px-4"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setShowAddPerson(true)}
                className="w-full py-3 border-2 border-dashed border-tabie-border rounded-xl text-tabie-muted hover:text-tabie-text hover:border-tabie-primary/50 transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Person
              </button>
            )}
          </div>
        </div>

        {/* Tax & Tip Section */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Percent className="w-5 h-5 text-tabie-primary" />
            <h2 className="font-semibold text-lg text-tabie-text">Tax & Tip</h2>
          </div>

          <div className="card space-y-4">
            {/* Tax */}
            <div>
              <label className="text-sm text-tabie-muted mb-1.5 block">Tax Amount</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tabie-muted" />
                <input
                  type="number"
                  value={tax || ''}
                  onChange={(e) => handleTaxChange(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  className="input-field w-full pl-10"
                />
              </div>
            </div>

            {/* Tip */}
            <div>
              <label className="text-sm text-tabie-muted mb-1.5 block">Tip</label>
              <div className="grid grid-cols-4 gap-2">
                {[15, 18, 20, 25].map((pct) => (
                  <button
                    key={pct}
                    onClick={() => handleTipPercentageChange(pct)}
                    className={`py-2 rounded-xl text-sm font-medium transition-all ${
                      tipPercentage === pct && !showCustomTip
                        ? 'bg-tabie-primary text-white'
                        : 'bg-tabie-surface text-tabie-muted hover:text-tabie-text'
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
                <button
                  onClick={() => {
                    setShowCustomTip(true)
                    setCustomTipValue(tip > 0 && tipPercentage === 0 ? tip.toString() : '')
                  }}
                  className={`py-2 rounded-xl text-sm font-medium transition-all ${
                    showCustomTip || (tipPercentage === 0 && tip > 0)
                      ? 'bg-tabie-primary text-white'
                      : 'bg-tabie-surface text-tabie-muted hover:text-tabie-text'
                  }`}
                >
                  Custom
                </button>
              </div>
              {showCustomTip && (
                <div className="relative mt-2">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tabie-muted" />
                  <input
                    type="number"
                    value={customTipValue}
                    onChange={(e) => handleCustomTipChange(e.target.value)}
                    placeholder="Enter tip amount"
                    step="0.01"
                    className="input-field w-full pl-10"
                    autoFocus
                  />
                </div>
              )}
              <p className="text-sm text-tabie-muted mt-2 text-center">
                Tip: <span className="font-mono">${(tip || 0).toFixed(2)}</span>
              </p>
            </div>

            {/* Split method */}
            <div>
              <label className="text-sm text-tabie-muted mb-1.5 block">How to split tax & tip?</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={async () => await setSplitMethod('equal')}
                  className={`py-3 rounded-xl text-sm font-medium transition-all ${
                    splitTaxTipMethod === 'equal'
                      ? 'bg-tabie-primary text-white'
                      : 'bg-tabie-surface text-tabie-muted hover:text-tabie-text'
                  }`}
                >
                  Split Equally
                </button>
                <button
                  onClick={async () => await setSplitMethod('proportional')}
                  className={`py-3 rounded-xl text-sm font-medium transition-all ${
                    splitTaxTipMethod === 'proportional'
                      ? 'bg-tabie-primary text-white'
                      : 'bg-tabie-surface text-tabie-muted hover:text-tabie-text'
                  }`}
                >
                  Proportional
                </button>
              </div>
              <p className="text-xs text-tabie-muted mt-2 text-center">
                {splitTaxTipMethod === 'equal'
                  ? 'Everyone pays the same tax & tip'
                  : 'Tax & tip based on what you ordered'}
              </p>
            </div>
          </div>
        </div>

        {/* Total Summary */}
        <div className="card bg-tabie-primary/10 border-tabie-primary/30">
          <div className="flex items-center justify-between">
            <span className="text-tabie-muted">Total Bill</span>
            <span className="font-mono font-bold text-2xl text-tabie-primary">
              ${grandTotal.toFixed(2)}
            </span>
          </div>
          {people.length > 0 && (
            <p className="text-sm text-tabie-muted mt-1">
              ~<span className="font-mono">${(grandTotal / people.length).toFixed(2)}</span> per person (if split equally)
            </p>
          )}
        </div>

        {/* Share link if already published */}
        {shareLink && (
          <div className="card">
            <p className="text-sm text-tabie-muted mb-2">Share this link with friends:</p>
            <div className="bg-tabie-bg rounded-lg p-3 flex items-center gap-2">
              <input
                type="text"
                value={shareLink}
                readOnly
                className="flex-1 bg-transparent text-sm text-tabie-text outline-none"
              />
              <button
                onClick={handleCopyLink}
                className={`p-2 rounded-lg transition-all ${
                  copied ? 'bg-green-500/20 text-green-400' : 'bg-tabie-border text-tabie-muted hover:text-tabie-text'
                }`}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <button
              onClick={handleShareLink}
              className="w-full btn-secondary mt-3 flex items-center justify-center gap-2"
            >
              <Share2 className="w-4 h-4" />
              Share Link
            </button>
          </div>
        )}

        {/* How it works */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
          <h4 className="font-medium text-blue-300 mb-2">What happens next?</h4>
          <ol className="text-sm text-blue-300/70 space-y-1 list-decimal list-inside">
            <li>Everyone selects what they ordered</li>
            <li>Changes sync in real-time</li>
            <li>Each person sees their total</li>
            <li>Pay the bill organizer directly</li>
          </ol>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-tabie-bg/90 backdrop-blur-lg border-t border-tabie-border p-4">
        <div className="max-w-[430px] mx-auto">
          <button
            onClick={handlePublishAndContinue}
            disabled={publishing || people.length === 0}
            className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {publishing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating Tab...
              </>
            ) : (
              <>
                Continue to Select Items
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
          {!shareLink && (
            <p className="text-xs text-tabie-muted text-center mt-2">
              This will create a shareable link for your friends
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
