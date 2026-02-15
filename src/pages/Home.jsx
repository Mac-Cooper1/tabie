import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { useBillStore } from '../stores/billStore'
import { updateTab as updateFirestoreTab } from '../services/firestore'
import {
  Camera,
  Plus,
  Receipt,
  Clock,
  CheckCircle,
  Settings,
  Archive,
  Trash2,
  Star
} from 'lucide-react'

export default function Home() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const { tabs, setCurrentTab, createTab, deleteTab } = useBillStore()

  const [activeFilter, setActiveFilter] = useState('active')
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [closeConfirm, setCloseConfirm] = useState(null)

  const activeTabs = tabs.filter(t => t.status === 'active' || t.status === 'pending' || t.status === 'open' || t.status === 'setup')
  const completedTabs = tabs.filter(t => t.status === 'completed' || t.status === 'closed')

  // Helper to get payment progress
  const getPaymentProgress = (tab) => {
    const people = tab.people || []
    const paidCount = people.filter(p => p.paymentStatus === 'confirmed').length
    const claimedCount = people.filter(p => p.paymentStatus === 'claimed').length
    return { paidCount, claimedCount, total: people.length }
  }

  // Compute meaningful status for a tab
  const getTabStatus = (tab) => {
    const isPublished = !!tab.firestoreId
    const people = tab.people || []
    const items = tab.items || []
    const totalPeople = people.length
    const paidCount = people.filter(p => p.paymentStatus === 'confirmed').length
    const allPaid = paidCount === totalPeople && totalPeople > 0

    // Settled
    if (tab.status === 'completed' || tab.status === 'closed' || allPaid) {
      return { label: 'Settled', color: 'text-green-400', bg: 'bg-green-500/20' }
    }

    // Draft
    if (!isPublished || tab.status === 'setup') {
      return { label: 'Draft', color: 'text-orange-400', bg: 'bg-orange-500/20' }
    }

    // Payment tracking
    if (paidCount > 0) {
      return { label: `${paidCount}/${totalPeople} paid`, color: 'text-tabie-primary', bg: 'bg-tabie-primary/20' }
    }

    // Item assignment tracking
    const assignedItems = items.filter(item => item.assignedTo?.length > 0)
    const totalItems = items.length

    if (totalItems > 0 && assignedItems.length === totalItems) {
      return { label: 'Fully assigned', color: 'text-tabie-primary', bg: 'bg-tabie-primary/20' }
    }

    if (assignedItems.length > 0) {
      return { label: `${assignedItems.length}/${totalItems} claimed`, color: 'text-yellow-400', bg: 'bg-yellow-500/20' }
    }

    // No items assigned yet
    return { label: 'Waiting for claims', color: 'text-yellow-400', bg: 'bg-yellow-500/20' }
  }

  const displayedTabs = activeFilter === 'active' ? activeTabs : completedTabs

  const handleNewTab = () => {
    navigate('/new-tab')
  }

  const handleOpenTab = (tab) => {
    setCurrentTab(tab.id)
    // If tab has been published to Firestore, go to the selection page
    if (tab.firestoreId) {
      navigate(`/tab/${tab.firestoreId}/select`)
    } else {
      // Tab wasn't published yet - continue setup
      navigate('/invite-people')
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return 'Today'
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday'
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }
  }

  const getTotal = (tab) => {
    return (tab.subtotal + tab.tax + tab.tip).toFixed(2)
  }

  return (
    <div className="min-h-screen bg-tabie-bg pb-24 overflow-x-hidden">
      {/* Header */}
      <div className="sticky top-0 bg-tabie-bg/95 backdrop-blur-lg z-20 px-6 pt-8 pb-4 border-b border-tabie-border">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-tabie-text">
              Hey, {user?.name?.split(' ')[0] || 'there'}
            </h1>
            <p className="text-tabie-muted text-sm">Ready to split some bills?</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Points badge */}
            <button
              onClick={() => navigate('/rewards')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30 transition-colors focus-ring"
            >
              <Star className="w-5 h-5 fill-current" />
              <span className="font-semibold text-sm">
                {(user?.points?.balance || 0).toLocaleString()}
              </span>
            </button>
            <button
              onClick={() => navigate('/settings')}
              className="w-10 h-10 rounded-full bg-tabie-surface flex items-center justify-center text-tabie-muted hover:text-tabie-text transition-colors focus-ring"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveFilter('active')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-medium transition-colors duration-200 flex items-center justify-center gap-2 focus-ring ${
              activeFilter === 'active'
                ? 'bg-tabie-primary text-white'
                : 'bg-tabie-surface text-tabie-muted hover:text-tabie-text'
            }`}
          >
            <Clock className="w-5 h-5" />
            Active ({activeTabs.length})
          </button>
          <button
            onClick={() => setActiveFilter('completed')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-medium transition-colors duration-200 flex items-center justify-center gap-2 focus-ring ${
              activeFilter === 'completed'
                ? 'bg-tabie-primary text-white'
                : 'bg-tabie-surface text-tabie-muted hover:text-tabie-text'
            }`}
          >
            <CheckCircle className="w-5 h-5" />
            History ({completedTabs.length})
          </button>
        </div>
      </div>

      {/* Tabs List */}
      <div className="px-6 py-6">
        {displayedTabs.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-tabie-surface flex items-center justify-center">
              <Receipt className="w-10 h-10 text-tabie-muted" />
            </div>
            <h3 className="text-xl font-semibold text-tabie-text mb-2">No {activeFilter} tabs</h3>
            <p className="text-tabie-muted mb-6">
              {activeFilter === 'active'
                ? "Start a new tab by scanning a receipt!"
                : "Completed tabs will appear here"}
            </p>
            {activeFilter === 'active' && (
              <button onClick={handleNewTab} className="btn-secondary">
                <Plus className="w-4 h-4 mr-2 inline" />
                Create New Tab
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {displayedTabs.map((tab) => {
              const { paidCount, claimedCount, total } = getPaymentProgress(tab)

              const status = getTabStatus(tab)
              const isHistory = tab.status === 'completed' || tab.status === 'closed'

              return (
                <div key={tab.id} className="card flex items-center gap-3 overflow-hidden">
                  <button
                    onClick={() => handleOpenTab(tab)}
                    className="flex-1 min-w-0 flex items-center gap-3 hover:opacity-80 transition-opacity duration-200 focus-ring rounded-xl"
                  >
                    <div className="flex-1 min-w-0 text-left">
                      <h3 className="font-semibold text-tabie-text truncate">
                        {tab.restaurantName || 'New Tab'}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-tabie-muted">
                        <span>{formatDate(tab.date)}</span>
                        <span>•</span>
                        <span>{total || 0} people</span>
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${status.bg} ${status.color}`}>
                          {status.label}
                        </span>
                        {claimedCount > 0 && status.label !== 'Settled' && (
                          <span className="text-xs text-yellow-500">
                            {claimedCount} pending
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <div className="font-bold text-tabie-text font-mono">
                        ${getTotal(tab)}
                      </div>
                    </div>
                  </button>

                  {isHistory ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setDeleteConfirm(tab.id)
                      }}
                      className="p-2 flex-shrink-0 text-tabie-muted hover:text-red-400 transition-colors focus-ring rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setCloseConfirm(tab.id)
                      }}
                      className="p-2 flex-shrink-0 text-tabie-muted hover:text-tabie-text transition-colors focus-ring rounded-lg"
                    >
                      <Archive className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Floating Camera Button */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30">
        <button
          onClick={handleNewTab}
          className="w-16 h-16 rounded-full bg-tabie-primary flex items-center justify-center shadow-lg shadow-tabie-primary/40 hover:bg-tabie-primary-light active:bg-tabie-primary-dark transition-colors duration-200 focus-ring"
        >
          <Camera className="w-6 h-6 text-white" />
        </button>
      </div>

      {/* Close Tab Confirmation Modal */}
      {closeConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center p-4">
          <div className="bg-tabie-surface rounded-2xl w-full max-w-[430px] p-6 mb-4">
            <h3 className="text-lg font-semibold text-tabie-text mb-2">Close Tab?</h3>
            <p className="text-tabie-muted text-sm mb-6">
              This will move the tab to History. You can still view it there.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setCloseConfirm(null)}
                className="flex-1 btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const tab = tabs.find(t => t.id === closeConfirm)
                  if (tab?.firestoreId) {
                    await updateFirestoreTab(tab.firestoreId, {
                      status: 'completed',
                      closedAt: new Date().toISOString()
                    })
                  }
                  setCloseConfirm(null)
                }}
                className="flex-1 py-3 px-4 rounded-xl bg-tabie-primary text-white font-medium hover:bg-tabie-primary/90 transition-colors"
              >
                Close Tab
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center p-4">
          <div className="bg-tabie-surface rounded-2xl w-full max-w-[430px] p-6 mb-4">
            <h3 className="text-lg font-semibold text-tabie-text mb-2">Delete Tab?</h3>
            <p className="text-tabie-muted text-sm mb-6">
              This will permanently delete this tab and all its data. This can't be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await deleteTab(deleteConfirm)
                  setDeleteConfirm(null)
                }}
                className="flex-1 py-3 px-4 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
