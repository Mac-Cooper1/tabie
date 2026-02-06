import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  onAuthStateChanged
} from 'firebase/auth'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'
import { useBillStore } from './billStore'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      user: null,
      loading: true,
      error: null,

      // Initialize auth state listener
      initAuth: () => {
        onAuthStateChanged(auth, async (firebaseUser) => {
          if (firebaseUser) {
            // User is signed in, get their profile from Firestore
            try {
              const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid))
              const userData = userDoc.exists() ? userDoc.data() : {}

              set({
                isAuthenticated: true,
                user: {
                  id: firebaseUser.uid,
                  email: firebaseUser.email,
                  name: userData.name || firebaseUser.displayName || '',
                  phone: userData.phone || '',
                  createdAt: userData.createdAt || new Date().toISOString(),
                  // Payment accounts for receiving payments (Venmo, Cash App, PayPal)
                  paymentAccounts: userData.paymentAccounts || {
                    venmo: userData.venmo || null,  // Migrate old venmo field
                    cashapp: null,
                    paypal: null
                  },
                  // Rewards points
                  points: userData.points || {
                    balance: 0,
                    lifetime: 0,
                    history: []
                  }
                },
                loading: false,
                error: null
              })

              // Subscribe to user's tabs from Firestore
              useBillStore.getState().subscribeToTabs(firebaseUser.uid)
            } catch (error) {
              console.error('Error fetching user data:', error)
              set({
                isAuthenticated: true,
                user: {
                  id: firebaseUser.uid,
                  email: firebaseUser.email,
                  name: firebaseUser.displayName || '',
                  phone: '',
                  createdAt: new Date().toISOString(),
                  paymentAccounts: {
                    venmo: null,
                    cashapp: null,
                    paypal: null
                  },
                  points: {
                    balance: 0,
                    lifetime: 0,
                    history: []
                  }
                },
                loading: false,
                error: null
              })

              // Subscribe to user's tabs even if profile fetch failed
              useBillStore.getState().subscribeToTabs(firebaseUser.uid)
            }
          } else {
            // User is signed out - unsubscribe from tabs
            useBillStore.getState().unsubscribeFromTabs()

            set({
              isAuthenticated: false,
              user: null,
              loading: false,
              error: null
            })
          }
        })
      },

      // Sign up with email and password
      signUp: async (email, password, name, phone = '', paymentAccounts = null) => {
        set({ loading: true, error: null })
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, email, password)
          const firebaseUser = userCredential.user

          // Update Firebase profile with display name
          await updateProfile(firebaseUser, { displayName: name })

          // Use provided payment accounts or defaults
          const accounts = paymentAccounts || {
            venmo: null,
            cashapp: null,
            paypal: null
          }

          // Save additional user data to Firestore
          await setDoc(doc(db, 'users', firebaseUser.uid), {
            name,
            email,
            phone,
            paymentAccounts: accounts,
            points: {
              balance: 0,
              lifetime: 0,
              history: []
            },
            createdAt: new Date().toISOString()
          })

          set({
            isAuthenticated: true,
            user: {
              id: firebaseUser.uid,
              email,
              name,
              phone,
              createdAt: new Date().toISOString(),
              paymentAccounts: accounts,
              points: {
                balance: 0,
                lifetime: 0,
                history: []
              }
            },
            loading: false,
            error: null
          })

          return { success: true }
        } catch (error) {
          console.error('Sign up error:', error)
          set({ loading: false, error: error.message })
          return { success: false, error: error.message }
        }
      },

      // Sign in with email and password
      signIn: async (email, password) => {
        set({ loading: true, error: null })
        try {
          await signInWithEmailAndPassword(auth, email, password)
          // The onAuthStateChanged listener will handle setting the user
          set({ loading: false, error: null })
          return { success: true }
        } catch (error) {
          console.error('Sign in error:', error)
          set({ loading: false, error: error.message })
          return { success: false, error: error.message }
        }
      },

      // Legacy login for compatibility
      login: (userData) => set({
        isAuthenticated: true,
        user: userData,
        loading: false
      }),

      // Sign out
      logout: async () => {
        try {
          // Unsubscribe from tabs before signing out
          useBillStore.getState().unsubscribeFromTabs()

          await signOut(auth)
          set({
            isAuthenticated: false,
            user: null,
            error: null
          })
        } catch (error) {
          console.error('Sign out error:', error)
        }
      },

      // Update user profile
      updateUser: async (updates) => {
        const user = get().user
        if (!user?.id) return

        try {
          // Update Firestore
          await setDoc(doc(db, 'users', user.id), updates, { merge: true })

          // Update local state
          set((state) => ({
            user: { ...state.user, ...updates }
          }))
        } catch (error) {
          console.error('Error updating user:', error)
        }
      },

      // Clear error
      clearError: () => set({ error: null }),

      // Refresh user data from Firestore (useful after points are awarded)
      refreshUser: async () => {
        const user = get().user
        if (!user?.id) return

        try {
          const userDoc = await getDoc(doc(db, 'users', user.id))
          if (userDoc.exists()) {
            const userData = userDoc.data()
            set((state) => ({
              user: {
                ...state.user,
                points: userData.points || { balance: 0, lifetime: 0, history: [] }
              }
            }))
          }
        } catch (error) {
          console.error('Error refreshing user data:', error)
        }
      },

      // Add points to user (called after tab settles)
      addPoints: (pointsData) => {
        set((state) => ({
          user: {
            ...state.user,
            points: {
              balance: (state.user?.points?.balance || 0) + pointsData.pointsEarned,
              lifetime: (state.user?.points?.lifetime || 0) + pointsData.pointsEarned,
              history: [
                pointsData,
                ...(state.user?.points?.history || [])
              ]
            }
          }
        }))
      }
    }),
    {
      name: 'tabie-auth',
      partialize: (state) => ({
        // Only persist these fields, not loading/error
        isAuthenticated: state.isAuthenticated,
        user: state.user
      })
    }
  )
)
