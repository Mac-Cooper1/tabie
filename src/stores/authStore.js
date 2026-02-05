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
                  }
                },
                loading: false,
                error: null
              })
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
                  }
                },
                loading: false,
                error: null
              })
            }
          } else {
            // User is signed out
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
      signUp: async (email, password, name, phone = '') => {
        set({ loading: true, error: null })
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, email, password)
          const firebaseUser = userCredential.user

          // Update Firebase profile with display name
          await updateProfile(firebaseUser, { displayName: name })

          // Save additional user data to Firestore
          await setDoc(doc(db, 'users', firebaseUser.uid), {
            name,
            email,
            phone,
            paymentAccounts: {
              venmo: null,
              cashapp: null,
              paypal: null
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
              paymentAccounts: {
                venmo: null,
                cashapp: null,
                paypal: null
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
      clearError: () => set({ error: null })
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
