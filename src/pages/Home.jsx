import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { useBillStore } from '../stores/billStore'
import {
  Camera,
  Plus,
  Receipt,
  Clock,
  CheckCircle,
  ChevronRight,
  LogOut,
  Trash2,
  Link
} from 'lucide-react'

export default function Home() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const { tabs, setCurrentTab, createTab, deleteTab } = useBillStore()

  const [activeFilter, setActiveFilter] = useState('active')

  const activeTabs = tabs.filter(t => t.status === 'active' || t.status === 'pending')
  const completedTabs = tabs.filter(t => t.status === 'completed')

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

  const handleLogout = () => {
    logout()
    navigate('/')
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
    <div className="min-h-screen bg-tabie-bg pb-24">
      {/* Header */}
      <div className="sticky top-0 bg-tabie-bg/90 backdrop-blur-lg z-20 px-6 pt-8 pb-4 border-b border-tabie-border">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-tabie-text">
              Hey, {user?.name?.split(' ')[0] || 'there'} 👋
            </h1>
            <p className="text-tabie-muted text-sm">Ready to split some bills?</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-10 h-10 rounded-full bg-tabie-surface flex items-center justify-center text-tabie-muted hover:text-tabie-text transition-colors"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveFilter('active')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${
              activeFilter === 'active'
                ? 'bg-tabie-primary text-white'
                : 'bg-tabie-surface text-tabie-muted'
            }`}
          >
            <Clock className="w-4 h-4" />
            Active ({activeTabs.length})
          </button>
          <button
            onClick={() => setActiveFilter('completed')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${
              activeFilter === 'completed'
                ? 'bg-tabie-primary text-white'
                : 'bg-tabie-surface text-tabie-muted'
            }`}
          >
            <CheckCircle className="w-4 h-4" />
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
              const isPublished = !!tab.firestoreId
              return (
                <div key={tab.id} className="card flex items-center gap-4">
                  <button
                    onClick={() => handleOpenTab(tab)}
                    className="flex-1 flex items-center gap-4 hover:opacity-80 transition-all active:scale-[0.98]"
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      tab.status === 'completed' || tab.status === 'open'
                        ? 'bg-green-500/20 text-green-400'
                        : isPublished
                        ? 'bg-tabie-primary/20 text-tabie-primary'
                        : 'bg-orange-500/20 text-orange-400'
                    }`}>
                      {isPublished ? <Link className="w-6 h-6" /> : <Receipt className="w-6 h-6" />}
                    </div>

                    <div className="flex-1 text-left">
                      <h3 className="font-semibold text-tabie-text">
                        {tab.restaurantName || 'New Tab'}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-tabie-muted">
                        <span>{formatDate(tab.date)}</span>
                        <span>•</span>
                        <span>{tab.people?.length || 0} people</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-bold text-tabie-text font-mono">
                        ${getTotal(tab)}
                      </div>
                      <div className={`text-xs ${
                        tab.status === 'completed'
                          ? 'text-green-400'
                          : isPublished
                          ? 'text-tabie-primary'
                          : 'text-orange-400'
                      }`}>
                        {tab.status === 'completed' ? 'Settled' : isPublished ? 'Live' : 'Draft'}
                      </div>
                    </div>

                    <ChevronRight className="w-5 h-5 text-tabie-muted" />
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      if (confirm('Delete this tab?')) {
                        deleteTab(tab.id)
                      }
                    }}
                    className="p-2 text-tabie-muted hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
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
          className="w-16 h-16 rounded-full bg-tabie-primary flex items-center justify-center shadow-lg shadow-tabie-primary/40 hover:scale-110 active:scale-95 transition-transform"
        >
          <Camera className="w-7 h-7 text-white" />
        </button>
      </div>
    </div>
  )
}
