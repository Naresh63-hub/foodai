import { initializeApp, getApps, FirebaseApp } from 'firebase/app'
import { getAuth, Auth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore, initializeFirestore, Firestore } from 'firebase/firestore'
import { getAnalytics, isSupported, Analytics } from 'firebase/analytics'

// Your web app's Firebase configuration provided by the user
export const firebaseConfig = {
  apiKey: "AIzaSyA4s3CDR_DmZjYobBghtFHwqVR--oDCYfI",
  authDomain: "food-ai-433b7.firebaseapp.com",
  projectId: "food-ai-433b7",
  storageBucket: "food-ai-433b7.firebasestorage.app",
  messagingSenderId: "59556325769",
  appId: "1:59556325769:web:90a209b9bf7b0aa9b9d958",
  firestoreDatabaseId: "(default)",
}

// Initialize Firebase App
export const app: FirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
export const auth: Auth = getAuth(app)

// Initialize Firestore targeting default database with resilient long polling fallback
const targetDatabaseId =
  firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
    ? firebaseConfig.firestoreDatabaseId
    : undefined

let firestoreInstance: Firestore
try {
  firestoreInstance = initializeFirestore(
    app,
    {
      experimentalAutoDetectLongPolling: true,
    },
    targetDatabaseId
  )
} catch {
  // If Firestore was already initialized for this app, retrieve existing instance
  firestoreInstance = targetDatabaseId ? getFirestore(app, targetDatabaseId) : getFirestore(app)
}

export const db: Firestore = firestoreInstance

// Analytics initialization
let analyticsInstance: Analytics | null = null
if (typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported) {
      analyticsInstance = getAnalytics(app)
    }
  }).catch(() => {})
}

export const analytics = analyticsInstance

// Google Auth Provider (supports 1-tap and automatic account selection)
export const googleProvider = new GoogleAuthProvider()
