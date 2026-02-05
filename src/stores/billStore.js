import { create } from 'zustand'
import {
  createTab as createFirestoreTab,
  updateTab as updateFirestoreTab,
  deleteTab as deleteFirestoreTab,
  getTab as getFirestoreTab,
  subscribeToUserTabs,
  subscribeToTab,
  getTabShareLink,
  awardPointsForTab as awardPointsFirestore
} from '../services/firestore'
import { useAuthStore } from './authStore'
import { auth } from '../lib/firebase'

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

// Store the unsubscribe function outside the store
let tabsUnsubscribe = null
let currentTabUnsubscribe = null

// Key for storing current tab ID in localStorage (for page refresh persistence)
const CURRENT_TAB_KEY = 'tabie_current_tab_id'

export const useBillStore = create((set, get) => ({
  // All tabs (from Firestore)
  tabs: [],

  // Current working tab
  currentTab: null,

  // Loading state
  loading: false,

  // Current user ID (set by auth)
  currentUserId: null,

  // Subscribe to user's tabs from Firestore (called on auth state change)
  subscribeToTabs: (userId) => {
    // Clean up any existing subscription
    if (tabsUnsubscribe) {
      tabsUnsubscribe()
      tabsUnsubscribe = null
    }

    set({ currentUserId: userId, loading: true })

    // Set up real-time listener for user's tabs
    tabsUnsubscribe = subscribeToUserTabs(userId, (tabs) => {
      set({ tabs, loading: false })

      // If we have a currentTab, update it with fresh data from the subscription
      const currentTabId = get().currentTab?.firestoreId || get().currentTab?.id

      if (currentTabId) {
        const updatedCurrentTab = tabs.find(t => t.firestoreId === currentTabId || t.id === currentTabId)
        if (updatedCurrentTab) {
          set({ currentTab: updatedCurrentTab })
        }
      } else {
        // Try to restore currentTab from localStorage (for page refresh)
        const savedTabId = localStorage.getItem(CURRENT_TAB_KEY)
        if (savedTabId) {
          const restoredTab = tabs.find(t => t.firestoreId === savedTabId || t.id === savedTabId)
          if (restoredTab) {
            set({ currentTab: restoredTab })
          }
        }
      }
    })
  },

  // Unsubscribe from tabs (called on logout)
  unsubscribeFromTabs: () => {
    if (tabsUnsubscribe) {
      tabsUnsubscribe()
      tabsUnsubscribe = null
    }
    if (currentTabUnsubscribe) {
      currentTabUnsubscribe()
      currentTabUnsubscribe = null
    }
    set({ tabs: [], currentTab: null, currentUserId: null, loading: false })
    localStorage.removeItem(CURRENT_TAB_KEY)
  },

  // Create a new tab - writes to Firestore immediately
  createTab: async (restaurantName = null) => {
    // Use Firebase Auth directly to ensure we have the correct user
    const currentUser = auth.currentUser
    if (!currentUser) {
      throw new Error('Not authenticated. Please sign in again.')
    }

    const userId = currentUser.uid
    set({ loading: true })

    const newTab = {
      restaurantName,
      date: new Date().toISOString(),
      status: 'setup', // setup -> open -> locked -> completed
      items: [],
      people: [],
      subtotal: 0,
      tax: 0,
      tip: 0,
      tipPercentage: 20,
      splitTaxTipMethod: 'equal', // equal, proportional
      createdBy: userId,
      receiptImage: null,
    }

    try {
      // Create in Firestore first
      const firestoreId = await createFirestoreTab(newTab)

      // The subscription will update local state automatically,
      // but we also set currentTab immediately for navigation
      const createdTab = {
        ...newTab,
        id: firestoreId,
        firestoreId,
        shareLink: getTabShareLink(firestoreId)
      }

      set({ currentTab: createdTab, loading: false })

      // Save to localStorage for page refresh persistence
      localStorage.setItem(CURRENT_TAB_KEY, firestoreId)

      return firestoreId
    } catch (error) {
      console.error('Error creating tab:', error)
      set({ loading: false })
      throw error
    }
  },

  // Set current tab by ID (can be local ID or Firestore ID)
  setCurrentTab: (tabId) => {
    const tab = get().tabs.find(t => t.id === tabId || t.firestoreId === tabId)

    // Clean up existing currentTab subscription
    if (currentTabUnsubscribe) {
      currentTabUnsubscribe()
      currentTabUnsubscribe = null
    }

    if (tab) {
      set({ currentTab: tab })

      // Save to localStorage for page refresh persistence
      const firestoreId = tab.firestoreId || tab.id
      localStorage.setItem(CURRENT_TAB_KEY, firestoreId)

      // Set up a dedicated subscription for real-time updates on currentTab
      currentTabUnsubscribe = subscribeToTab(firestoreId, (updatedTab) => {
        if (updatedTab) {
          set({ currentTab: { ...updatedTab, firestoreId: updatedTab.id } })
        }
      })
    } else {
      set({ currentTab: null })
      localStorage.removeItem(CURRENT_TAB_KEY)
    }
  },

  // Update current tab - writes to Firestore
  updateCurrentTab: async (updates) => {
    const tab = get().currentTab
    if (!tab) return

    const firestoreId = tab.firestoreId || tab.id

    // Optimistic local update
    const updatedTab = { ...tab, ...updates }
    set((state) => ({
      currentTab: updatedTab,
      tabs: state.tabs.map(t =>
        (t.id === firestoreId || t.firestoreId === firestoreId) ? updatedTab : t
      )
    }))

    // Sync to Firestore
    try {
      await updateFirestoreTab(firestoreId, updates)
    } catch (error) {
      console.error('Error updating tab:', error)
      // Revert on error - subscription will restore correct state
    }
  },

  // Add items from OCR - writes to Firestore
  setItems: async (items) => {
    const formattedItems = items.map((item, index) => ({
      id: generateId(),
      description: item.description || `Item ${index + 1}`,
      quantity: item.quantity || 1,
      unitPrice: item.unitPrice || item.totalPrice || 0,
      totalPrice: item.totalPrice || 0,
      assignedTo: [],
      assignments: {} // { personId: quantity }
    }))

    const subtotal = formattedItems.reduce((sum, item) => sum + item.totalPrice, 0)

    await get().updateCurrentTab({
      items: formattedItems,
      subtotal
    })
  },

  // Add a single item manually - writes to Firestore
  addItem: async (description, price) => {
    const tab = get().currentTab
    if (!tab) return

    const newItem = {
      id: generateId(),
      description,
      quantity: 1,
      unitPrice: price,
      totalPrice: price,
      assignedTo: [],
      assignments: {}
    }

    const updatedItems = [...tab.items, newItem]
    const subtotal = updatedItems.reduce((sum, item) => sum + item.totalPrice, 0)

    await get().updateCurrentTab({
      items: updatedItems,
      subtotal
    })
  },

  // Remove item - writes to Firestore
  removeItem: async (itemId) => {
    const tab = get().currentTab
    if (!tab) return

    const updatedItems = tab.items.filter(i => i.id !== itemId)
    const subtotal = updatedItems.reduce((sum, item) => sum + item.totalPrice, 0)

    await get().updateCurrentTab({
      items: updatedItems,
      subtotal
    })
  },

  // Add person to tab - writes to Firestore
  addPerson: async (name, phone = null) => {
    const tab = get().currentTab
    if (!tab) return null

    const colorIndex = tab.people?.length || 0
    const colorData = COLORS[colorIndex % COLORS.length]

    const newPerson = {
      id: generateId(),
      name,
      phone,
      ...colorData,
      paid: false,
      paymentStatus: 'pending', // pending, claimed, confirmed
      paidAt: null,
      paidVia: null, // venmo, cashapp, paypal, cash, other
      amountOwed: 0
    }

    const updatedPeople = [...(tab.people || []), newPerson]

    await get().updateCurrentTab({ people: updatedPeople })

    return newPerson
  },

  // Remove person - writes to Firestore
  removePerson: async (personId) => {
    const tab = get().currentTab
    if (!tab) return

    // Remove person and unassign from items
    const updatedItems = tab.items.map(item => {
      const newAssignments = { ...(item.assignments || {}) }
      delete newAssignments[personId]

      return {
        ...item,
        assignedTo: item.assignedTo.filter(id => id !== personId),
        assignments: newAssignments
      }
    })

    const updatedPeople = tab.people.filter(p => p.id !== personId)

    await get().updateCurrentTab({
      people: updatedPeople,
      items: updatedItems
    })
  },

  // Toggle item assignment - writes to Firestore
  toggleItemAssignment: async (itemId, personId) => {
    const tab = get().currentTab
    if (!tab) return

    const updatedItems = tab.items.map(item => {
      if (item.id !== itemId) return item

      const isAssigned = item.assignedTo.includes(personId)
      const newAssignments = { ...(item.assignments || {}) }

      if (isAssigned) {
        delete newAssignments[personId]
      } else {
        // Check remaining quantity before assigning
        const totalAssigned = Object.values(newAssignments).reduce((a, b) => a + b, 0)
        const remaining = item.quantity - totalAssigned
        if (remaining <= 0) {
          // No quantity left to assign
          return item
        }
        // For items with quantity > 1, default to 1; otherwise full item
        newAssignments[personId] = item.quantity > 1 ? Math.min(1, remaining) : item.quantity
      }

      return {
        ...item,
        assignedTo: isAssigned
          ? item.assignedTo.filter(id => id !== personId)
          : [...item.assignedTo, personId],
        assignments: newAssignments
      }
    })

    await get().updateCurrentTab({ items: updatedItems })
  },

  // Update item assignment with specific quantity - writes to Firestore
  updateItemAssignment: async (itemId, personId, quantity) => {
    const tab = get().currentTab
    if (!tab) return

    const updatedItems = tab.items.map(item => {
      if (item.id !== itemId) return item

      const newAssignments = { ...(item.assignments || {}) }
      let newAssignedTo = [...item.assignedTo]

      if (quantity <= 0) {
        // Remove assignment
        delete newAssignments[personId]
        newAssignedTo = newAssignedTo.filter(id => id !== personId)
      } else {
        // Add or update assignment
        newAssignments[personId] = quantity
        if (!newAssignedTo.includes(personId)) {
          newAssignedTo.push(personId)
        }
      }

      return {
        ...item,
        assignedTo: newAssignedTo,
        assignments: newAssignments
      }
    })

    await get().updateCurrentTab({ items: updatedItems })
  },

  // Set tax - writes to Firestore
  setTax: (tax) => get().updateCurrentTab({ tax }),

  // Set tip - writes to Firestore
  setTip: (tip) => get().updateCurrentTab({ tip, tipPercentage: 0 }),

  // Set tip percentage - writes to Firestore
  setTipPercentage: (percentage) => {
    const subtotal = get().currentTab?.subtotal || 0
    const tip = Math.round(subtotal * (percentage / 100) * 100) / 100
    get().updateCurrentTab({ tip, tipPercentage: percentage })
  },

  // Set split method - writes to Firestore
  setSplitMethod: (method) => get().updateCurrentTab({ splitTaxTipMethod: method }),

  // Calculate person's total (pure calculation, no Firestore)
  getPersonTotal: (personId) => {
    const tab = get().currentTab
    if (!tab) return 0

    let itemsTotal = 0
    tab.items?.forEach(item => {
      if (item.assignedTo?.includes(personId)) {
        // Use quantity-based assignments if available
        if (item.assignments && item.assignments[personId] !== undefined) {
          const personQty = item.assignments[personId]
          const pricePerUnit = item.totalPrice / item.quantity
          itemsTotal += pricePerUnit * personQty
        } else {
          // Fall back to equal split for backward compatibility
          itemsTotal += item.totalPrice / item.assignedTo.length
        }
      }
    })

    let taxTipShare = 0
    if (tab.splitTaxTipMethod === 'equal' && tab.people?.length > 0) {
      taxTipShare = ((tab.tax || 0) + (tab.tip || 0)) / tab.people.length
    } else if (tab.subtotal > 0) {
      const proportion = itemsTotal / tab.subtotal
      taxTipShare = ((tab.tax || 0) + (tab.tip || 0)) * proportion
    }

    return Math.round((itemsTotal + taxTipShare) * 100) / 100
  },

  // Mark person's payment status - writes to Firestore
  // When all guests are confirmed, automatically awards points to admin
  markPaid: async (personId, paymentStatus = 'confirmed', paidVia = null) => {
    const tab = get().currentTab
    if (!tab) return

    const updatedPeople = tab.people.map(p =>
      p.id === personId
        ? {
            ...p,
            paymentStatus,
            paid: paymentStatus === 'confirmed', // Backward compat
            paidAt: ['claimed', 'confirmed'].includes(paymentStatus)
              ? new Date().toISOString()
              : null,
            paidVia
          }
        : p
    )

    const allConfirmed = updatedPeople.every(p => p.paymentStatus === 'confirmed')
    const wasNotCompleted = tab.status !== 'completed'

    await get().updateCurrentTab({
      people: updatedPeople,
      status: allConfirmed ? 'completed' : tab.status
    })

    // If tab just became completed, award points to admin
    if (allConfirmed && wasNotCompleted && !tab.pointsAwarded) {
      await get().awardPoints()
    }
  },

  // Award points to the tab admin for a settled tab
  awardPoints: async () => {
    const tab = get().currentTab
    if (!tab || tab.pointsAwarded) return null

    const firestoreId = tab.firestoreId || tab.id
    const adminId = tab.createdBy

    if (!adminId) {
      console.error('No admin ID found for tab')
      return null
    }

    try {
      const pointsEarned = await awardPointsFirestore(adminId, firestoreId, {
        tabName: tab.restaurantName || 'Tab',
        subtotal: tab.subtotal || 0
      })

      // Update local auth store with new points
      if (pointsEarned > 0) {
        const authStore = useAuthStore.getState()
        if (authStore.user?.id === adminId) {
          authStore.addPoints({
            tabId: firestoreId,
            tabName: tab.restaurantName || 'Tab',
            subtotal: tab.subtotal || 0,
            pointsEarned,
            earnedAt: new Date().toISOString()
          })
        }
      }

      return pointsEarned
    } catch (error) {
      console.error('Error awarding points:', error)
      return null
    }
  },

  // Get tab by ID (from local cache)
  getTab: (tabId) => get().tabs.find(t => t.id === tabId || t.firestoreId === tabId),

  // Get active tabs
  getActiveTabs: () => get().tabs.filter(t =>
    t.status === 'active' || t.status === 'pending' || t.status === 'setup' || t.status === 'open'
  ),

  // Get completed tabs
  getCompletedTabs: () => get().tabs.filter(t => t.status === 'completed'),

  // Clear current tab
  clearCurrentTab: () => {
    if (currentTabUnsubscribe) {
      currentTabUnsubscribe()
      currentTabUnsubscribe = null
    }
    set({ currentTab: null })
    localStorage.removeItem(CURRENT_TAB_KEY)
  },

  // Delete tab - deletes from Firestore
  deleteTab: async (tabId) => {
    const tab = get().tabs.find(t => t.id === tabId || t.firestoreId === tabId)
    if (!tab) return

    const firestoreId = tab.firestoreId || tab.id

    // Optimistic local removal
    set((state) => ({
      tabs: state.tabs.filter(t => t.id !== tabId && t.firestoreId !== tabId),
      currentTab: state.currentTab?.id === tabId || state.currentTab?.firestoreId === tabId
        ? null
        : state.currentTab
    }))

    try {
      await deleteFirestoreTab(firestoreId)
    } catch (error) {
      console.error('Error deleting tab:', error)
      // Subscription will restore state if delete failed
    }
  },

  // Publish tab - makes it joinable (status: 'open')
  // adminPaymentAccounts: { venmo, cashapp, paypal, adminName } - snapshot of admin's payment info
  publishTab: async (adminPaymentAccounts = null) => {
    const tab = get().currentTab
    if (!tab) throw new Error('No current tab')

    const firestoreId = tab.firestoreId || tab.id

    // Verify Firebase Auth state before attempting update
    const currentUser = auth.currentUser
    if (!currentUser) {
      console.error('publishTab: No Firebase Auth user. Tab createdBy:', tab.createdBy)
      throw new Error('Not authenticated. Please sign in again.')
    }

    // Verify the current user owns this tab
    if (tab.createdBy && tab.createdBy !== currentUser.uid) {
      console.error('publishTab: User mismatch. Tab createdBy:', tab.createdBy, 'Current user:', currentUser.uid)
      throw new Error('You do not have permission to modify this tab.')
    }

    try {
      await updateFirestoreTab(firestoreId, {
        status: 'open',
        adminPaymentAccounts,
      })

      // Local state will be updated via subscription
      // Return info for navigation
      return {
        firestoreId,
        shareLink: getTabShareLink(firestoreId)
      }
    } catch (error) {
      console.error('Error publishing tab:', error)
      // Provide more helpful error message
      if (error.code === 'permission-denied') {
        throw new Error('Permission denied. Please sign out and sign back in.')
      }
      throw error
    }
  },

  // Sync current tab to Firestore (manual sync if needed)
  syncToFirestore: async () => {
    const tab = get().currentTab
    if (!tab) return

    const firestoreId = tab.firestoreId || tab.id

    try {
      await updateFirestoreTab(firestoreId, {
        items: tab.items,
        people: tab.people,
        tax: tab.tax,
        tip: tab.tip,
        tipPercentage: tab.tipPercentage,
        splitTaxTipMethod: tab.splitTaxTipMethod,
        subtotal: tab.subtotal,
        status: tab.status,
        receiptImage: tab.receiptImage || null
      })
    } catch (error) {
      console.error('Error syncing to Firestore:', error)
    }
  },

  // Get share link for current tab
  getShareLink: () => {
    const tab = get().currentTab
    if (!tab) return null
    const firestoreId = tab.firestoreId || tab.id
    return getTabShareLink(firestoreId)
  },

  // Fetch a tab directly from Firestore (for guest pages)
  fetchTab: async (tabId) => {
    try {
      const tab = await getFirestoreTab(tabId)
      return tab
    } catch (error) {
      console.error('Error fetching tab:', error)
      return null
    }
  }
}))
