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
