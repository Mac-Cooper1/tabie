import { useState, useEffect, useCallback } from 'react'
import { subscribeToTab, updateTab, updateItems } from '../services/firestore'

/**
 * Hook for real-time tab subscription and updates
 * @param {string} tabId - The tab ID to subscribe to
 * @returns {Object} - { tab, loading, error, updateTab, toggleItemAssignment, updateItemAssignment }
 */
export function useTab(tabId) {
  const [tab, setTab] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Subscribe to real-time updates
  useEffect(() => {
    if (!tabId) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const unsubscribe = subscribeToTab(tabId, (tabData) => {
      if (tabData) {
        setTab(tabData)
        setError(null)
      } else {
        setError('Tab not found')
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [tabId])

  // Update tab data
  const handleUpdateTab = useCallback(async (updates) => {
    if (!tabId) return
    try {
      await updateTab(tabId, updates)
    } catch (err) {
      console.error('Error updating tab:', err)
      setError(err.message)
    }
  }, [tabId])

  // Toggle item assignment for a person
  const toggleItemAssignment = useCallback(async (itemId, personId) => {
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
          return item
        }
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

    try {
      await updateItems(tabId, updatedItems)
    } catch (err) {
      console.error('Error toggling item assignment:', err)
      setError(err.message)
    }
  }, [tab, tabId])

  // Update item assignment with specific quantity
  const updateItemAssignment = useCallback(async (itemId, personId, quantity) => {
    if (!tab) return

    const updatedItems = tab.items.map(item => {
      if (item.id !== itemId) return item

      const newAssignments = { ...(item.assignments || {}) }
      let newAssignedTo = [...item.assignedTo]

      if (quantity <= 0) {
        delete newAssignments[personId]
        newAssignedTo = newAssignedTo.filter(id => id !== personId)
      } else {
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

    try {
      await updateItems(tabId, updatedItems)
    } catch (err) {
      console.error('Error updating item assignment:', err)
      setError(err.message)
    }
  }, [tab, tabId])

  // Split item with everyone (family split)
  const familySplitItem = useCallback(async (itemId) => {
    if (!tab) return

    const updatedItems = tab.items.map(item => {
      if (item.id !== itemId) return item

      // Add all people to this item, each gets an equal fraction
      const allPeopleIds = tab.people.map(p => p.id)
      const share = 1 / allPeopleIds.length
      const newAssignments = {}
      allPeopleIds.forEach(id => {
        newAssignments[id] = share
      })

      return {
        ...item,
        assignedTo: allPeopleIds,
        assignments: newAssignments
      }
    })

    try {
      await updateItems(tabId, updatedItems)
    } catch (err) {
      console.error('Error setting family split:', err)
      setError(err.message)
    }
  }, [tab, tabId])

  // Clear all assignments from an item
  const clearItemAssignments = useCallback(async (itemId) => {
    if (!tab) return

    const updatedItems = tab.items.map(item => {
      if (item.id !== itemId) return item

      return {
        ...item,
        assignedTo: [],
        assignments: {}
      }
    })

    try {
      await updateItems(tabId, updatedItems)
    } catch (err) {
      console.error('Error clearing item assignments:', err)
      setError(err.message)
    }
  }, [tab, tabId])

  // Set a specific split share for a person on a single item (e.g., 0.5 for half, 0.333 for third)
  const setSplitShare = useCallback(async (itemId, personId, share) => {
    if (!tab) return

    const updatedItems = tab.items.map(item => {
      if (item.id !== itemId) return item

      const newAssignments = { ...(item.assignments || {}) }
      let newAssignedTo = [...item.assignedTo]

      if (share <= 0) {
        // Remove this person
        delete newAssignments[personId]
        newAssignedTo = newAssignedTo.filter(id => id !== personId)
      } else {
        // Set their share
        newAssignments[personId] = share
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

    try {
      await updateItems(tabId, updatedItems)
    } catch (err) {
      console.error('Error setting split share:', err)
      setError(err.message)
    }
  }, [tab, tabId])

  // Calculate person's total
  const getPersonTotal = useCallback((personId) => {
    if (!tab) return 0

    let itemsTotal = 0
    tab.items.forEach(item => {
      if (item.assignedTo.includes(personId)) {
        if (item.assignments && item.assignments[personId] !== undefined) {
          const personQty = item.assignments[personId]
          const pricePerUnit = item.totalPrice / item.quantity
          itemsTotal += pricePerUnit * personQty
        } else {
          itemsTotal += item.totalPrice / item.assignedTo.length
        }
      }
    })

    let taxTipShare = 0
    if (tab.splitTaxTipMethod === 'equal' && tab.people.length > 0) {
      taxTipShare = (tab.tax + tab.tip) / tab.people.length
    } else if (tab.subtotal > 0) {
      const proportion = Math.min(itemsTotal / tab.subtotal, 1.0)
      taxTipShare = (tab.tax + tab.tip) * proportion
    }

    return Math.round((itemsTotal + taxTipShare) * 100) / 100
  }, [tab])

  return {
    tab,
    loading,
    error,
    updateTab: handleUpdateTab,
    toggleItemAssignment,
    updateItemAssignment,
    familySplitItem,
    clearItemAssignments,
    setSplitShare,
    getPersonTotal
  }
}
