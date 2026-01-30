/**
 * Firestore service for real-time tab management
 */
import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  onSnapshot,
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
