import { initializeApp, getApps, FirebaseApp } from 'firebase/app'
import { getAuth, Auth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore, Firestore } from 'firebase/firestore'
import { getAnalytics, Analytics, isSupported } from 'firebase/analytics'

export const firebaseConfig = {
  apiKey: "AIzaSyA4s3CDR_DmZjYobBghtFHwqVR--oDCYfI",
  authDomain: "food-ai-433b7.firebaseapp.com",
  projectId: "food-ai-433b7",
  storageBucket: "food-ai-433b7.firebasestorage.app",
  messagingSenderId: "59556325769",
  appId: "1:59556325769:web:90a209b9bf7b0aa9b9d958",
}

// Initialize Firebase
const app: FirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
const auth: Auth = getAuth(app)
const db: Firestore = getFirestore(app)
let analytics: Analytics | null = null

// Initialize analytics only in browser environments where supported
if (typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app)
    }
  }).catch(() => {})
}

export const googleProvider = new GoogleAuthProvider()
googleProvider.setCustomParameters({ prompt: 'select_account' })

export { app, auth, db, analytics }
