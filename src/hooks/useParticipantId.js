import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'

/**
 * Hook that resolves the current user's participant ID for a tab.
 * - Checks localStorage first (existing guest flow)
 * - If not found and user is the tab admin, auto-resolves from tab.people
 * - If neither works, redirects to /join/{tabId}
 *
 * @param {string} tabId
 * @param {Object|null} tab - The loaded tab data
 * @param {boolean} loading - Whether the tab is still loading
 * @returns {string|null} participantId
 */
export function useParticipantId(tabId, tab, loading) {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [participantId, setParticipantId] = useState(() =>
    localStorage.getItem(`tabie_participant_${tabId}`)
  )

  useEffect(() => {
    if (loading || !tab) return

    // If we already have a valid participantId, verify it still exists in the tab
    if (participantId) {
      const exists = tab.people?.find(p => p.id === participantId)
      if (exists) return
      // participantId references a removed person — clear and fall through
    }

    // Check: is the current authenticated user the tab admin?
    if (user?.id && user.id === tab.createdBy && tab.people?.length > 0) {
      const adminPerson = tab.people.find(p => p.isAdmin) || tab.people[0]
      if (adminPerson) {
        localStorage.setItem(`tabie_participant_${tabId}`, adminPerson.id)
        setParticipantId(adminPerson.id)
        return
      }
    }

    // No valid identity — redirect to join
    navigate(`/join/${tabId}`, { replace: true })
  }, [loading, tab, participantId, user, tabId, navigate])

  return participantId
}
