import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTab } from '../hooks/useTab'
import { addParticipant } from '../services/firestore'
import { Receipt, Users, Loader2, AlertCircle, LogIn } from 'lucide-react'

const COLORS = [
  { bg: 'chip-red', color: '#ef4444' },
  { bg: 'chip-blue', color: '#3b82f6' },
  { bg: 'chip-green', color: '#22c55e' },
  { bg: 'chip-purple', color: '#a855f7' },
  { bg: 'chip-orange', color: '#f97316' },
  { bg: 'chip-pink', color: '#ec4899' },
  { bg: 'chip-cyan', color: '#06b6d4' },
  { bg: 'chip-yellow', color: '#eab308' },
]

const generateId = () => Math.random().toString(36).substring(2, 15)

export default function JoinTab() {
  const { tabId } = useParams()
  const navigate = useNavigate()
  const { tab, loading, error } = useTab(tabId)
  const [name, setName] = useState('')
  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState(null)

  // Check if user already joined (stored in localStorage)
  const [participantId, setParticipantId] = useState(() => {
    return localStorage.getItem(`tabie_participant_${tabId}`)
  })

  // If already joined, redirect to item selection
  useEffect(() => {
    if (participantId && tab) {
      const participant = tab.people?.find(p => p.id === participantId)
      if (participant) {
        navigate(`/tab/${tabId}/select`, { replace: true })
      }
    }
  }, [participantId, tab, tabId, navigate])

  const handleJoin = async (e) => {
    e.preventDefault()

    if (!name.trim()) {
      setJoinError('Please enter your name')
      return
    }

    setJoining(true)
    setJoinError(null)

    try {
      const colorIndex = tab.people?.length || 0
      const colorData = COLORS[colorIndex % COLORS.length]

      const newParticipant = {
        id: generateId(),
        name: name.trim(),
        ...colorData,
        isAdmin: false,
        paid: false,
        joinedAt: new Date().toISOString()
      }

      await addParticipant(tabId, newParticipant)

      // Store participant ID locally
      localStorage.setItem(`tabie_participant_${tabId}`, newParticipant.id)
      setParticipantId(newParticipant.id)

      // Navigate to item selection
      navigate(`/tab/${tabId}/select`)
    } catch (err) {
      console.error('Error joining tab:', err)
      setJoinError('Failed to join. Please try again.')
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

        {/* Skeleton Join Form */}
        <div className="card">
          <div className="skeleton-text w-48 mb-4 h-5" />
          <div className="skeleton h-12 mb-4" />
          <div className="skeleton h-12" />
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

        {tab.people?.length > 0 && (
          <div className="mt-4 pt-4 border-t border-tabie-border">
            <div className="flex items-center gap-2 text-sm text-tabie-muted mb-2">
              <Users className="w-4 h-4" />
              <span>{tab.people.length} already joined</span>
            </div>
            <div className="flex -space-x-2">
              {tab.people.slice(0, 6).map((person) => (
                <div
                  key={person.id}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 border-tabie-bg"
                  style={{ backgroundColor: person.color + '30', color: person.color }}
                  title={person.name}
                >
                  {person.name[0]}
                </div>
              ))}
              {tab.people.length > 6 && (
                <div className="w-8 h-8 rounded-full bg-tabie-surface flex items-center justify-center text-xs font-medium border-2 border-tabie-bg text-tabie-muted">
                  +{tab.people.length - 6}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Join form */}
      <div className="card">
        <h3 className="font-semibold text-tabie-text mb-4">Enter your name to join</h3>

        <form onSubmit={handleJoin} className="space-y-4">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="input-field w-full"
            autoFocus
            disabled={joining}
          />

          {joinError && (
            <p className="text-red-400 text-sm">{joinError}</p>
          )}

          <button
            type="submit"
            disabled={joining}
            className="w-full btn-primary flex items-center justify-center gap-2"
          >
            {joining ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Joining...
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                Continue as Guest
              </>
            )}
          </button>
        </form>

        <div className="mt-4 pt-4 border-t border-tabie-border text-center">
          <p className="text-xs text-tabie-muted">
            Have an account?{' '}
            <button
              onClick={() => navigate('/auth', { state: { returnTo: `/join/${tabId}` } })}
              className="text-tabie-primary hover:underline focus-ring rounded"
            >
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
