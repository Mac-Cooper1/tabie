import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: "AIzaSyDCk2lKrZO7_giF9G8q8trqkY_PZ_1sUT4",
  authDomain: "tabie-96830.firebaseapp.com",
  projectId: "tabie-96830",
  storageBucket: "tabie-96830.firebasestorage.app",
  messagingSenderId: "868370212135",
  appId: "1:868370212135:web:8dfeaacccc411b1ce2f502",
  measurementId: "G-J43PM1NFHM"
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Initialize services
export const db = getFirestore(app)
export const auth = getAuth(app)

export default app
