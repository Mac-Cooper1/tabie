import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTab } from '../hooks/useTab'
import { useAuthStore } from '../stores/authStore'
import { updateTab } from '../services/firestore'
import { Receipt, Users, Loader2, AlertCircle, Check } from 'lucide-react'

export default function JoinTab() {
  const { tabId } = useParams()
  const navigate = useNavigate()
  const { tab, loading, error } = useTab(tabId)
  const { user } = useAuthStore()
  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState(null)
  const [selectedId, setSelectedId] = useState(null)

  // Check if user already joined (stored in localStorage)
  const [participantId, setParticipantId] = useState(() => {
    return localStorage.getItem(`tabie_participant_${tabId}`)
  })

  // If authenticated user is the tab admin, redirect directly to select page
  useEffect(() => {
    if (!tab || loading) return

    if (user?.id && user.id === tab.createdBy && tab.people?.length > 0) {
      const adminPerson = tab.people.find(p => p.isAdmin) || tab.people[0]
      if (adminPerson) {
        localStorage.setItem(`tabie_participant_${tabId}`, adminPerson.id)
        navigate(`/tab/${tabId}/select`, { replace: true })
      }
    }
  }, [tab, loading, user, tabId, navigate])

  // If already joined, redirect to item selection
  useEffect(() => {
    if (participantId && tab) {
      const participant = tab.people?.find(p => p.id === participantId)
      if (participant) {
        navigate(`/tab/${tabId}/select`, { replace: true })
      }
    }
  }, [participantId, tab, tabId, navigate])

  const handleClaimIdentity = async (person) => {
    if (person.claimedAt) return // Already claimed by someone else

    setSelectedId(person.id)
    setJoining(true)
    setJoinError(null)

    try {
      // Update the person's claimedAt in Firestore
      const updatedPeople = tab.people.map(p =>
        p.id === person.id
          ? { ...p, claimedAt: new Date().toISOString() }
          : p
      )

      await updateTab(tabId, { people: updatedPeople })

      // Store participant ID locally
      localStorage.setItem(`tabie_participant_${tabId}`, person.id)
      setParticipantId(person.id)

      // Navigate to item selection
      navigate(`/tab/${tabId}/select`)
    } catch (err) {
      console.error('Error claiming identity:', err)
      setJoinError('Failed to join. Please try again.')
      setSelectedId(null)
    } finally {
      setJoining(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-tabie-bg px-6 py-8">
        {/* Skeleton Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 skeleton-circle mx-auto mb-4" />
          <div className="skeleton-text w-48 mx-auto mb-2" />
          <div className="skeleton-text w-56 mx-auto h-3" />
        </div>

        {/* Skeleton Tab Info Card */}
        <div className="card mb-6">
          <div className="skeleton-text w-40 mb-3 h-5" />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="skeleton-text w-16 mb-1 h-3" />
              <div className="skeleton-text w-20" />
            </div>
            <div>
              <div className="skeleton-text w-16 mb-1 h-3" />
              <div className="skeleton-text w-24" />
            </div>
          </div>
        </div>

        {/* Skeleton Name List */}
        <div className="card">
          <div className="skeleton-text w-48 mb-4 h-5" />
          <div className="space-y-3">
            <div className="skeleton h-14" />
            <div className="skeleton h-14" />
            <div className="skeleton h-14" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !tab) {
    return (
      <div className="min-h-screen bg-tabie-bg flex items-center justify-center px-6">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-xl font-bold text-tabie-text mb-2">Tab Not Found</h1>
          <p className="text-tabie-muted mb-6">This tab may have been deleted or the link is invalid.</p>
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

  if (tab.status === 'locked' || tab.status === 'completed') {
    return (
      <div className="min-h-screen bg-tabie-bg flex items-center justify-center px-6">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-yellow-400" />
          </div>
          <h1 className="text-xl font-bold text-tabie-text mb-2">Tab Closed</h1>
          <p className="text-tabie-muted mb-6">This tab is no longer accepting new participants.</p>
        </div>
      </div>
    )
  }

  const availablePeople = tab.people?.filter(p => !p.isAdmin) || []

  return (
    <div className="min-h-screen bg-tabie-bg px-6 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-20 h-20 rounded-2xl bg-tabie-primary/20 flex items-center justify-center mx-auto mb-4">
          <Receipt className="w-10 h-10 text-tabie-primary" />
        </div>
        <h1 className="text-2xl font-bold text-tabie-text mb-2">Join Bill Split</h1>
        <p className="text-tabie-muted">You've been invited to split a bill</p>
      </div>

      {/* Tab info card */}
      <div className="card mb-6">
        <h2 className="text-lg font-semibold text-tabie-text mb-3">
          {tab.restaurantName || 'Bill Split'}
        </h2>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-tabie-muted">Items</p>
            <p className="font-medium text-tabie-text">{tab.items?.length || 0} items</p>
          </div>
          <div>
            <p className="text-tabie-muted">Total</p>
            <p className="font-mono font-semibold text-tabie-primary">
              ${((tab.subtotal || 0) + (tab.tax || 0) + (tab.tip || 0)).toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      {/* Name selection */}
      <div className="card">
        <h3 className="font-semibold text-tabie-text mb-1">Who are you?</h3>
        <p className="text-sm text-tabie-muted mb-4">Select your name to join the tab</p>

        {availablePeople.length === 0 ? (
          <div className="text-center py-6">
            <Users className="w-8 h-8 text-tabie-muted mx-auto mb-2" />
            <p className="text-tabie-muted text-sm">No names have been added yet.</p>
            <p className="text-tabie-muted text-xs mt-1">Ask the tab admin to add you.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {availablePeople.map((person) => {
              const isClaimed = !!person.claimedAt
              const isSelecting = selectedId === person.id && joining

              return (
                <button
                  key={person.id}
                  onClick={() => handleClaimIdentity(person)}
                  disabled={isClaimed || joining}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
                    isClaimed
                      ? 'border-tabie-border bg-tabie-surface/50 opacity-50 cursor-not-allowed'
                      : selectedId === person.id
                        ? 'border-tabie-primary bg-tabie-primary/10'
                        : 'border-tabie-border bg-tabie-surface hover:border-tabie-primary/50 active:scale-[0.98]'
                  }`}
                >
                  {/* Avatar */}
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                    style={{ backgroundColor: person.color + '30', color: person.color }}
                  >
                    {person.name[0]}
                  </div>

                  {/* Name */}
                  <span className={`font-medium flex-1 text-left ${
                    isClaimed ? 'text-tabie-muted line-through' : 'text-tabie-text'
                  }`}>
                    {person.name}
                  </span>

                  {/* Status indicator */}
                  {isSelecting ? (
                    <Loader2 className="w-5 h-5 text-tabie-primary animate-spin shrink-0" />
                  ) : isClaimed ? (
                    <Check className="w-5 h-5 text-tabie-muted shrink-0" />
                  ) : null}
                </button>
              )
            })}
          </div>
        )}

        {joinError && (
          <p className="text-red-400 text-sm mt-3">{joinError}</p>
        )}

        <div className="mt-4 pt-4 border-t border-tabie-border text-center">
          <p className="text-xs text-tabie-muted">
            Don't see your name? Ask the tab admin to add you.
          </p>
        </div>
      </div>
    </div>
  )
}
