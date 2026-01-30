import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import { Loader2 } from 'lucide-react'
import Landing from './pages/Landing'
import Auth from './pages/Auth'
import Home from './pages/Home'
import NewTab from './pages/NewTab'
import ScanBill from './pages/ScanBill'
import InvitePeople from './pages/InvitePeople'
import Checkout from './pages/Checkout'
import JoinTab from './pages/JoinTab'
import GuestItemSelection from './pages/GuestItemSelection'

// Protected route wrapper
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuthStore()

  // Show loading while checking auth state
  if (loading) {
    return (
      <div className="min-h-screen bg-tabie-bg flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-tabie-primary animate-spin" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />
  }

  return children
}

export default function App() {
  const initAuth = useAuthStore((state) => state.initAuth)

  // Initialize Firebase auth listener on app mount
  useEffect(() => {
    initAuth()
  }, [initAuth])

  return (
    <div className="mobile-container bg-tabie-bg min-h-screen">
      <div className="noise-overlay" />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/auth" element={<Auth />} />

        {/* Public routes for guest access */}
        <Route path="/join/:tabId" element={<JoinTab />} />
        <Route path="/tab/:tabId/select" element={<GuestItemSelection />} />
        <Route path="/checkout/:tabId" element={<Checkout />} />

        {/* Protected routes for authenticated users */}
        <Route
          path="/home"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />
        <Route
          path="/new-tab"
          element={
            <ProtectedRoute>
              <NewTab />
            </ProtectedRoute>
          }
        />
        <Route
          path="/scan"
          element={
            <ProtectedRoute>
              <ScanBill />
            </ProtectedRoute>
          }
        />
        <Route
          path="/invite-people"
          element={
            <ProtectedRoute>
              <InvitePeople />
            </ProtectedRoute>
          }
        />
      </Routes>
    </div>
  )
}
