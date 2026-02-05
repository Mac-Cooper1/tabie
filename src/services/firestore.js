/**
 * Firestore service for real-time tab management
 */
import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
  arrayUnion
} from 'firebase/firestore'
import { db } from '../lib/firebase'

const TABS_COLLECTION = 'tabs'

/**
 * Create a new tab in Firestore
 * @param {Object} tabData - The tab data from local state
 * @returns {Promise<string>} - The tab ID
 */
export async function createTab(tabData) {
  const tabRef = doc(collection(db, TABS_COLLECTION))

  // Filter out undefined values (Firestore doesn't accept them)
  const cleanData = Object.fromEntries(
    Object.entries(tabData).filter(([_, v]) => v !== undefined)
  )

  const firestoreTab = {
    ...cleanData,
    id: tabRef.id,
    status: 'setup', // setup -> open -> locked -> completed
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }

  await setDoc(tabRef, firestoreTab)
  return tabRef.id
}

/**
 * Get a tab by ID
 * @param {string} tabId
 * @returns {Promise<Object|null>}
 */
export async function getTab(tabId) {
  const tabRef = doc(db, TABS_COLLECTION, tabId)
  const tabSnap = await getDoc(tabRef)

  if (tabSnap.exists()) {
    return { id: tabSnap.id, ...tabSnap.data() }
  }
  return null
}

/**
 * Update a tab
 * @param {string} tabId
 * @param {Object} updates
 */
export async function updateTab(tabId, updates) {
  const tabRef = doc(db, TABS_COLLECTION, tabId)
  await updateDoc(tabRef, {
    ...updates,
    updatedAt: serverTimestamp()
  })
}

/**
 * Subscribe to real-time tab updates
 * @param {string} tabId
 * @param {Function} callback - Called with tab data on each update
 * @returns {Function} - Unsubscribe function
 */
export function subscribeToTab(tabId, callback) {
  const tabRef = doc(db, TABS_COLLECTION, tabId)

  return onSnapshot(tabRef, (snapshot) => {
    if (snapshot.exists()) {
      callback({ id: snapshot.id, ...snapshot.data() })
    } else {
      callback(null)
    }
  }, (error) => {
    console.error('Error subscribing to tab:', error)
    callback(null)
  })
}

/**
 * Subscribe to all tabs created by a user (real-time)
 * @param {string} userId - The user's Firebase UID
 * @param {Function} callback - Called with array of tabs on each update
 * @returns {Function} - Unsubscribe function
 */
export function subscribeToUserTabs(userId, callback) {
  const tabsQuery = query(
    collection(db, TABS_COLLECTION),
    where('createdBy', '==', userId),
    orderBy('createdAt', 'desc')
  )

  return onSnapshot(tabsQuery, (snapshot) => {
    const tabs = snapshot.docs.map(doc => ({
      id: doc.id,
      firestoreId: doc.id, // For consistency with existing code
      ...doc.data()
    }))
    callback(tabs)
  }, (error) => {
    console.error('Error subscribing to user tabs:', error)
    callback([])
  })
}

/**
 * Delete a tab from Firestore
 * @param {string} tabId
 */
export async function deleteTab(tabId) {
  const tabRef = doc(db, TABS_COLLECTION, tabId)
  await deleteDoc(tabRef)
}

/**
 * Add a participant to a tab
 * @param {string} tabId
 * @param {Object} participant - { id, name, phone?, color, isAdmin }
 */
export async function addParticipant(tabId, participant) {
  const tabRef = doc(db, TABS_COLLECTION, tabId)
  await updateDoc(tabRef, {
    people: arrayUnion(participant),
    updatedAt: serverTimestamp()
  })
}

/**
 * Update item assignments in a tab
 * @param {string} tabId
 * @param {Array} items - Updated items array
 */
export async function updateItems(tabId, items) {
  const tabRef = doc(db, TABS_COLLECTION, tabId)
  await updateDoc(tabRef, {
    items,
    updatedAt: serverTimestamp()
  })
}

/**
 * Open tab for participants to join and claim items
 * @param {string} tabId
 */
export async function openTab(tabId) {
  await updateTab(tabId, { status: 'open' })
}

/**
 * Lock tab - no more changes allowed
 * @param {string} tabId
 */
export async function lockTab(tabId) {
  await updateTab(tabId, { status: 'locked' })
}

/**
 * Mark tab as completed
 * @param {string} tabId
 */
export async function completeTab(tabId) {
  await updateTab(tabId, { status: 'completed' })
}

/**
 * Generate shareable link for a tab
 * @param {string} tabId
 * @returns {string}
 */
export function getTabShareLink(tabId) {
  // Use current origin for the link
  const origin = window.location.origin
  return `${origin}/join/${tabId}`
}

// ============================================
// PAYMENT STATUS FUNCTIONS
// ============================================

/**
 * Update a participant's payment status in a tab
 * @param {string} tabId
 * @param {string} participantId
 * @param {Object} paymentData - { paymentStatus, paidAt, paidVia }
 */
export async function updateParticipantPayment(tabId, participantId, paymentData) {
  const tabRef = doc(db, TABS_COLLECTION, tabId)
  const tabSnap = await getDoc(tabRef)

  if (!tabSnap.exists()) {
    throw new Error('Tab not found')
  }

  const tab = tabSnap.data()
  const updatedPeople = tab.people.map(p =>
    p.id === participantId
      ? { ...p, ...paymentData }
      : p
  )

  // Check if all participants are confirmed
  const allConfirmed = updatedPeople.every(p => p.paymentStatus === 'confirmed')

  await updateDoc(tabRef, {
    people: updatedPeople,
    status: allConfirmed ? 'completed' : tab.status,
    updatedAt: serverTimestamp()
  })
}

/**
 * Guest claims they have paid (awaiting admin confirmation)
 * @param {string} tabId
 * @param {string} participantId
 * @param {string} paidVia - venmo, cashapp, paypal, cash, other
 */
export async function claimPayment(tabId, participantId, paidVia) {
  await updateParticipantPayment(tabId, participantId, {
    paymentStatus: 'claimed',
    paidAt: new Date().toISOString(),
    paidVia,
    paid: false // Not confirmed yet
  })
}

/**
 * Admin confirms a guest's payment
 * @param {string} tabId
 * @param {string} participantId
 */
export async function confirmPayment(tabId, participantId) {
  await updateParticipantPayment(tabId, participantId, {
    paymentStatus: 'confirmed',
    paid: true
  })
}

/**
 * Admin rejects a claimed payment (guest didn't actually pay)
 * @param {string} tabId
 * @param {string} participantId
 */
export async function rejectPayment(tabId, participantId) {
  await updateParticipantPayment(tabId, participantId, {
    paymentStatus: 'pending',
    paidAt: null,
    paidVia: null,
    paid: false
  })
}

// ============================================
// REWARDS POINTS FUNCTIONS
// ============================================

/**
 * Calculate points for a tab subtotal
 * Points = subtotal * 6.7, rounded down
 * @param {number} subtotal
 * @returns {number}
 */
export function calculatePoints(subtotal) {
  return Math.floor(subtotal * 6.7)
}

/**
 * Award points to a user for a settled tab
 * @param {string} userId - The tab admin's user ID
 * @param {string} tabId - The tab ID
 * @param {Object} tabData - { tabName, subtotal }
 * @returns {Promise<number>} - Points awarded
 */
export async function awardPointsForTab(userId, tabId, tabData) {
  const userRef = doc(db, 'users', userId)
  const tabRef = doc(db, TABS_COLLECTION, tabId)

  // Get current user data
  const userSnap = await getDoc(userRef)
  if (!userSnap.exists()) {
    throw new Error('User not found')
  }

  // Check if points were already awarded for this tab
  const tabSnap = await getDoc(tabRef)
  if (tabSnap.exists() && tabSnap.data().pointsAwarded) {
    console.log('Points already awarded for this tab')
    return 0
  }

  const userData = userSnap.data()
  const currentPoints = userData.points || { balance: 0, lifetime: 0, history: [] }

  const pointsEarned = calculatePoints(tabData.subtotal)

  // Create history entry
  const historyEntry = {
    tabId,
    tabName: tabData.tabName || 'Tab',
    subtotal: tabData.subtotal,
    pointsEarned,
    earnedAt: new Date().toISOString()
  }

  // Update user points
  const updatedPoints = {
    balance: currentPoints.balance + pointsEarned,
    lifetime: currentPoints.lifetime + pointsEarned,
    history: [historyEntry, ...(currentPoints.history || [])]
  }

  await setDoc(userRef, { points: updatedPoints }, { merge: true })

  // Mark tab as having points awarded
  await updateDoc(tabRef, {
    pointsAwarded: true,
    pointsAmount: pointsEarned,
    updatedAt: serverTimestamp()
  })

  return pointsEarned
}

/**
 * Get user's points data
 * @param {string} userId
 * @returns {Promise<Object>}
 */
export async function getUserPoints(userId) {
  const userRef = doc(db, 'users', userId)
  const userSnap = await getDoc(userRef)

  if (!userSnap.exists()) {
    return { balance: 0, lifetime: 0, history: [] }
  }

  return userSnap.data().points || { balance: 0, lifetime: 0, history: [] }
}
