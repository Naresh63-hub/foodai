import { initializeApp, getApps, FirebaseApp } from 'firebase/app'
import { getAuth, Auth } from 'firebase/auth'
import { getFirestore, Firestore } from 'firebase/firestore'
import { getAnalytics, Analytics, isSupported } from 'firebase/analytics'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyA4s3CDR_DmZjYobBghtFHwqVR--oDCYfI",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "food-ai-433b7.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "food-ai-433b7",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "food-ai-433b7.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "59556325769",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:59556325769:web:fd721532550b91c2b9d958",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-B7G4J09XC8",
}

// Initialize Firebase
let app: FirebaseApp
let auth: Auth
let db: Firestore
let analytics: Analytics | null = null

if (getApps().length === 0) {
  app = initializeApp(firebaseConfig)
} else {
  app = getApps()[0]
}

auth = getAuth(app)
db = getFirestore(app)

// Initialize analytics only in browser environments where supported
if (typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app)
    }
  }).catch(() => {})
}

export { app, auth, db, analytics, firebaseConfig }
