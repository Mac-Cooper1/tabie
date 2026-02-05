import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createTab as createFirestoreTab, updateTab as updateFirestoreTab, getTabShareLink } from '../services/firestore'

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

export const useBillStore = create(
  persist(
    (set, get) => ({
      // All tabs (past and active)
      tabs: [],
      
      // Current working tab
      currentTab: null,
      
      // Create a new tab
      createTab: (restaurantName = null) => {
        const newTab = {
          id: generateId(),
          restaurantName,
          date: new Date().toISOString(),
          status: 'active', // active, pending, completed
          items: [],
          people: [],
          subtotal: 0,
          tax: 0,
          tip: 0,
          tipPercentage: 20,
          splitTaxTipMethod: 'equal', // equal, proportional
          createdBy: get().currentUserId,
          receiptImage: null, // Base64 encoded receipt image
        }
        
        set((state) => ({
          tabs: [newTab, ...state.tabs],
          currentTab: newTab
        }))
        
        return newTab.id
      },
      
      // Set current tab by ID
      setCurrentTab: (tabId) => {
        const tab = get().tabs.find(t => t.id === tabId)
        set({ currentTab: tab || null })
      },
      
      // Update current tab
      updateCurrentTab: (updates) => {
        set((state) => {
          if (!state.currentTab) return state
          
          const updatedTab = { ...state.currentTab, ...updates }
          const updatedTabs = state.tabs.map(t => 
            t.id === updatedTab.id ? updatedTab : t
          )
          
          return {
            currentTab: updatedTab,
            tabs: updatedTabs
          }
        })
      },
      
      // Add items from OCR
      setItems: (items) => {
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
        
        get().updateCurrentTab({
          items: formattedItems,
          subtotal
        })
      },
      
      // Add a single item manually
      addItem: (description, price) => {
        const newItem = {
          id: generateId(),
          description,
          quantity: 1,
          unitPrice: price,
          totalPrice: price,
          assignedTo: [],
          assignments: {}
        }
        
        set((state) => {
          if (!state.currentTab) return state
          
          const updatedItems = [...state.currentTab.items, newItem]
          const subtotal = updatedItems.reduce((sum, item) => sum + item.totalPrice, 0)
          
          const updatedTab = {
            ...state.currentTab,
            items: updatedItems,
            subtotal
          }
          
          return {
            currentTab: updatedTab,
            tabs: state.tabs.map(t => t.id === updatedTab.id ? updatedTab : t)
          }
        })
      },
      
      // Remove item
      removeItem: (itemId) => {
        set((state) => {
          if (!state.currentTab) return state
          
          const updatedItems = state.currentTab.items.filter(i => i.id !== itemId)
          const subtotal = updatedItems.reduce((sum, item) => sum + item.totalPrice, 0)
          
          const updatedTab = {
            ...state.currentTab,
            items: updatedItems,
            subtotal
          }
          
          return {
            currentTab: updatedTab,
            tabs: state.tabs.map(t => t.id === updatedTab.id ? updatedTab : t)
          }
        })
      },
      
      // Add person to tab
      addPerson: (name, phone = null) => {
        const colorIndex = get().currentTab?.people.length || 0
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
        
        set((state) => {
          if (!state.currentTab) return state
          
          const updatedTab = {
            ...state.currentTab,
            people: [...state.currentTab.people, newPerson]
          }
          
          return {
            currentTab: updatedTab,
            tabs: state.tabs.map(t => t.id === updatedTab.id ? updatedTab : t)
          }
        })
        
        return newPerson
      },
      
      // Remove person
      removePerson: (personId) => {
        set((state) => {
          if (!state.currentTab) return state
          
          // Remove person and unassign from items
          const updatedItems = state.currentTab.items.map(item => ({
            ...item,
            assignedTo: item.assignedTo.filter(id => id !== personId)
          }))
          
          const updatedTab = {
            ...state.currentTab,
            people: state.currentTab.people.filter(p => p.id !== personId),
            items: updatedItems
          }
          
          return {
            currentTab: updatedTab,
            tabs: state.tabs.map(t => t.id === updatedTab.id ? updatedTab : t)
          }
        })
      },
      
      // Toggle item assignment (for simple on/off, assigns full quantity)
      toggleItemAssignment: (itemId, personId) => {
        set((state) => {
          if (!state.currentTab) return state

          const updatedItems = state.currentTab.items.map(item => {
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

          const updatedTab = {
            ...state.currentTab,
            items: updatedItems
          }

          return {
            currentTab: updatedTab,
            tabs: state.tabs.map(t => t.id === updatedTab.id ? updatedTab : t)
          }
        })
      },

      // Update item assignment with specific quantity
      updateItemAssignment: (itemId, personId, quantity) => {
        set((state) => {
          if (!state.currentTab) return state

          const updatedItems = state.currentTab.items.map(item => {
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

          const updatedTab = {
            ...state.currentTab,
            items: updatedItems
          }

          return {
            currentTab: updatedTab,
            tabs: state.tabs.map(t => t.id === updatedTab.id ? updatedTab : t)
          }
        })
      },
      
      // Set tax and tip
      setTax: (tax) => get().updateCurrentTab({ tax }),
      setTip: (tip) => get().updateCurrentTab({ tip, tipPercentage: 0 }),
      setTipPercentage: (percentage) => {
        const subtotal = get().currentTab?.subtotal || 0
        const tip = Math.round(subtotal * (percentage / 100) * 100) / 100
        get().updateCurrentTab({ tip, tipPercentage: percentage })
      },
      setSplitMethod: (method) => get().updateCurrentTab({ splitTaxTipMethod: method }),
      
      // Calculate person's total
      getPersonTotal: (personId) => {
        const tab = get().currentTab
        if (!tab) return 0

        let itemsTotal = 0
        tab.items.forEach(item => {
          if (item.assignedTo.includes(personId)) {
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
        if (tab.splitTaxTipMethod === 'equal' && tab.people.length > 0) {
          taxTipShare = (tab.tax + tab.tip) / tab.people.length
        } else if (tab.subtotal > 0) {
          const proportion = itemsTotal / tab.subtotal
          taxTipShare = (tab.tax + tab.tip) * proportion
        }

        return Math.round((itemsTotal + taxTipShare) * 100) / 100
      },
      
      // Mark person's payment status
      // paymentStatus: 'pending' | 'claimed' | 'confirmed'
      // paidVia: 'venmo' | 'cashapp' | 'paypal' | 'cash' | 'other' | null
      markPaid: (personId, paymentStatus = 'confirmed', paidVia = null) => {
        set((state) => {
          if (!state.currentTab) return state

          const updatedPeople = state.currentTab.people.map(p =>
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

          const updatedTab = {
            ...state.currentTab,
            people: updatedPeople,
            status: allConfirmed ? 'completed' : state.currentTab.status
          }

          return {
            currentTab: updatedTab,
            tabs: state.tabs.map(t => t.id === updatedTab.id ? updatedTab : t)
          }
        })
      },
      
      // Get tab by ID
      getTab: (tabId) => get().tabs.find(t => t.id === tabId),
      
      // Get active tabs
      getActiveTabs: () => get().tabs.filter(t => t.status === 'active' || t.status === 'pending'),
      
      // Get completed tabs
      getCompletedTabs: () => get().tabs.filter(t => t.status === 'completed'),
      
      // Clear current tab
      clearCurrentTab: () => set({ currentTab: null }),
      
      // Delete tab
      deleteTab: (tabId) => {
        set((state) => ({
          tabs: state.tabs.filter(t => t.id !== tabId),
          currentTab: state.currentTab?.id === tabId ? null : state.currentTab
        }))
      },

      // Publish tab to Firestore and make it joinable
      // adminPaymentAccounts: { venmo, cashapp, paypal, adminName } - snapshot of admin's payment info
      publishTab: async (adminPaymentAccounts = null) => {
        const tab = get().currentTab
        if (!tab) throw new Error('No current tab')

        try {
          // Create in Firestore with admin payment accounts snapshot
          const firestoreId = await createFirestoreTab({
            ...tab,
            status: 'open', // Make it joinable
            adminPaymentAccounts, // Snapshot at creation time
          })

          // Update local state with Firestore ID
          const updatedTab = {
            ...tab,
            firestoreId,
            status: 'open',
            shareLink: getTabShareLink(firestoreId)
          }

          set((state) => ({
            currentTab: updatedTab,
            tabs: state.tabs.map(t => t.id === tab.id ? updatedTab : t)
          }))

          return { firestoreId, shareLink: getTabShareLink(firestoreId) }
        } catch (error) {
          console.error('Error publishing tab:', error)
          throw error
        }
      },

      // Sync current tab to Firestore
      syncToFirestore: async () => {
        const tab = get().currentTab
        if (!tab?.firestoreId) return

        try {
          await updateFirestoreTab(tab.firestoreId, {
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
        if (!tab?.firestoreId) return null
        return getTabShareLink(tab.firestoreId)
      }
    }),
    {
      name: 'tabie-bills'
    }
  )
)
