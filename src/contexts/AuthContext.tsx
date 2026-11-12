import React, { createContext, useContext, useEffect, useState } from 'react'
import {
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  signInWithPopup,
  signInWithCredential,
  GoogleAuthProvider,
  sendPasswordResetEmail,
} from 'firebase/auth'
import { auth, googleProvider } from '../config/firebase'
import { AUTH_BYPASS } from '../config/authMode'
import { syncUserProfile } from '../services/firestoreService'
import { performGoogleSignIn } from '../services/googleAuthService'
import { toast } from 'sonner'

interface AuthContextType {
  user: User | null
  loading: boolean
  isDemoMode: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signInWithGoogleCredential: (idToken: string) => Promise<void>
  signInDemo: () => void
  sendPasswordReset: (email: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

function makeMockUser(email?: string, displayName?: string): User {
  const chosenEmail = email || 'dev@foodai.local'
  const chosenName = displayName || (email ? email.split('@')[0] : 'Food Explorer')
  return {
    uid: 'local-dev-user',
    email: chosenEmail,
    displayName: chosenName,
    emailVerified: true,
    isAnonymous: false,
    metadata: {},
    providerData: [],
    refreshToken: '',
    tenantId: null,
    delete: async () => {},
    getIdToken: async () => 'local-dev-bypass-token',
    getIdTokenResult: async () => ({}) as any,
    reload: async () => {},
    toJSON: () => ({}),
  } as unknown as User
}

function isUnauthorizedDomainError(error: any): boolean {
  if (!error) return false
  const code = typeof error.code === 'string' ? error.code : ''
  const msg = typeof error.message === 'string' ? error.message : ''
  return (
    code === 'auth/unauthorized-domain' ||
    msg.includes('auth/unauthorized-domain') ||
    code === 'auth/operation-not-allowed' ||
    msg.includes('operation-not-allowed')
  )
}

function isUserCancellation(error: any): boolean {
  if (!error) return false
  const code = typeof error.code === 'string' ? error.code : ''
  const msg = typeof error.message === 'string' ? error.message : ''
  return (
    code === 'auth/popup-closed-by-user' ||
    msg.includes('popup-closed-by-user') ||
    code === 'SIGN_IN_CANCELED' ||
    code === '16' ||
    msg.toLowerCase().includes('canceled') ||
    msg.toLowerCase().includes('cancelled')
  )
}

function getFriendlyAuthErrorMessage(error: any): string {
  if (!error) return 'Authentication failed'
  const code = typeof error.code === 'string' ? error.code : ''
  const msg = typeof error.message === 'string' ? error.message : ''

  // 1. User Cancellation
  if (isUserCancellation(error)) {
    return 'Sign-in was cancelled'
  }

  // 2. Network connection errors
  if (
    code === 'auth/network-request-failed' ||
    msg.toLowerCase().includes('network') ||
    msg.toLowerCase().includes('offline') ||
    msg.toLowerCase().includes('failed to fetch')
  ) {
    return 'Network connection issue. Please check your internet connection and try again.'
  }

  // 3. Unauthorized domain
  if (code === 'auth/unauthorized-domain' || msg.includes('auth/unauthorized-domain')) {
    const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost'
    return `Domain (${hostname}) is not authorized in Firebase Console. Add it in Authentication > Settings > Authorized domains.`
  }

  // 4. Operation not allowed
  if (code === 'auth/operation-not-allowed' || msg.includes('operation-not-allowed')) {
    return 'Google sign-in is not enabled in Firebase Console. Enable it in Authentication > Sign-in method.'
  }

  // 5. Android Credential Manager / Google Play Services configuration issues (Code 10 / 12500 / DEVELOPER_ERROR)
  if (
    code === '10' ||
    code === '12500' ||
    code === 'DEVELOPER_ERROR' ||
    code === 'PROVIDER_CONFIGURATION_ERROR' ||
    msg.includes('DEVELOPER_ERROR') ||
    msg.includes('PROVIDER_CONFIGURATION_ERROR') ||
    msg.includes('GetCredentialProviderConfigurationException')
  ) {
    return 'Google Sign-In configuration required: Please verify that package "com.foodai.app" and SHA-1 certificate fingerprint are registered in Firebase Console (Project Settings > Your Apps).'
  }

  // 6. No Google account on Android device
  if (
    code === 'NO_CREDENTIAL_AVAILABLE' ||
    msg.includes('NoCredentialException') ||
    msg.includes('NO_CREDENTIAL_AVAILABLE')
  ) {
    return 'No Google account found on this device. Please add a Google account in Android Settings.'
  }

  // 7. Popup blocked by browser
  if (code === 'auth/popup-blocked' || msg.includes('popup-blocked')) {
    return 'Google sign-in popup was blocked by browser. Please allow popups.'
  }

  // 8. Missing VITE_GOOGLE_CLIENT_ID configuration
  if (msg.includes('VITE_GOOGLE_CLIENT_ID')) {
    return 'Google Sign-In configuration required: VITE_GOOGLE_CLIENT_ID is not configured. Please set your OAuth 2.0 Web Client ID from Firebase Console.'
  }

  // 9. Standard Firebase Auth codes
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
      return 'Incorrect email or password. Please verify and try again.'
    case 'auth/user-not-found':
      return 'No account found with this email. Please check spelling or register.'
    case 'auth/email-already-in-use':
      return 'An account already exists with this email address. Please sign in.'
    case 'auth/weak-password':
      return 'Password should be at least 6 characters.'
    case 'auth/invalid-email':
      return 'Please enter a valid email address.'
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a few moments and try again.'
    default: {
      // Strip any sensitive credentials or tokens from the displayed message
      const sanitized = msg
        .replace(/AIza[0-9A-Za-z-_]{35}/g, '[REDACTED_API_KEY]')
        .replace(/ya29\.[0-9A-Za-z-_]+/g, '[REDACTED_TOKEN]')
      return sanitized || 'Authentication error. Please try again.'
    }
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(AUTH_BYPASS ? makeMockUser() : null)
  const [loading, setLoading] = useState(AUTH_BYPASS ? false : true)
  const [isDemoMode, setIsDemoMode] = useState(AUTH_BYPASS)

  useEffect(() => {
    if (AUTH_BYPASS) return

    // Failsafe: never allow auth loading state to freeze the application for more than 750ms
    const safetyTimer = setTimeout(() => {
      setLoading(false)
    }, 750)

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      clearTimeout(safetyTimer)
      if (currentUser) {
        setUser(currentUser)
        setIsDemoMode(false)
        setLoading(false)
        // Non-blocking background sync so startup UI never waits on Firestore
        syncUserProfile({
          userId: currentUser.uid,
          email: currentUser.email || `${currentUser.uid}@foodai.app`,
          displayName: currentUser.displayName || 'Food Explorer',
          photoURL: currentUser.photoURL || undefined,
        }).catch((err) => {
          console.warn('Profile sync notice:', err)
        })
      } else {
        setUser((prev) => (prev?.uid === 'local-dev-user' ? prev : null))
        setLoading(false)
      }
    })

    return () => {
      clearTimeout(safetyTimer)
      unsubscribe()
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    if (AUTH_BYPASS) {
      setUser(makeMockUser(email))
      toast.success('Login bypassed (demo mode)')
      return
    }
    try {
      await signInWithEmailAndPassword(auth, email, password)
      toast.success('Successfully signed in')
    } catch (error: any) {
      if (isUnauthorizedDomainError(error)) {
        const hostname = typeof window !== 'undefined' ? window.location.hostname : 'preview'
        console.warn(`Firebase domain notice for ${hostname}. Logging in as preview user.`)
        setUser(makeMockUser(email))
        toast.success(`Signed in as preview user (${email})`)
        return
      }
      const friendlyMsg = getFriendlyAuthErrorMessage(error)
      toast.error(friendlyMsg)
      throw error
    }
  }

  const signUp = async (email: string, password: string) => {
    if (AUTH_BYPASS) {
      setUser(makeMockUser(email))
      toast.success('Signup bypassed (demo mode)')
      return
    }
    try {
      await createUserWithEmailAndPassword(auth, email, password)
      toast.success('Account created successfully')
    } catch (error: any) {
      if (isUnauthorizedDomainError(error)) {
        const hostname = typeof window !== 'undefined' ? window.location.hostname : 'preview'
        console.warn(`Firebase domain notice for ${hostname}. Logging in as preview user.`)
        setUser(makeMockUser(email))
        toast.success(`Signed in as preview user (${email})`)
        return
      }
      const friendlyMsg = getFriendlyAuthErrorMessage(error)
      toast.error(friendlyMsg)
      throw error
    }
  }

  const signInWithGoogle = async () => {
    if (AUTH_BYPASS) {
      setUser(makeMockUser())
      toast.success('Signed in as demo user')
      return
    }
    try {
      const result = await performGoogleSignIn(auth, googleProvider)
      if (result.user) {
        try {
          await syncUserProfile({
            userId: result.user.uid,
            email: result.user.email || `${result.user.uid}@foodai.app`,
            displayName: result.user.displayName || 'Food Explorer',
            photoURL: result.user.photoURL || undefined,
          })
        } catch (syncErr) {
          console.warn('Profile sync notice:', syncErr)
        }
      }
      toast.success(`Welcome back, ${result.user.displayName || 'Food Explorer'}!`)
    } catch (error: any) {
      if (isUserCancellation(error)) {
        toast.info('Google sign-in was cancelled')
        return
      }

      if (isUnauthorizedDomainError(error)) {
        const hostname = typeof window !== 'undefined' ? window.location.hostname : 'preview'
        console.warn(
          `Domain ${hostname} is not yet in Firebase authorized domains. Signing in as preview user.`
        )
        const mockUser = makeMockUser()
        setUser(mockUser)
        toast.success(
          `Signed in as preview user. (To enable production Google Auth, add ${hostname} in Firebase Console -> Authentication -> Settings -> Authorized domains)`
        )
        return
      }

      const friendlyMsg = getFriendlyAuthErrorMessage(error)
      console.warn('Google sign-in error:', friendlyMsg)
      toast.error(friendlyMsg)
      throw error
    }
  }

  const signInWithGoogleCredential = async (idToken: string) => {
    if (AUTH_BYPASS) {
      setUser(makeMockUser())
      toast.success('Signed in as demo user')
      return
    }
    try {
      const credential = GoogleAuthProvider.credential(idToken)
      const result = await signInWithCredential(auth, credential)
      if (result.user) {
        try {
          await syncUserProfile({
            userId: result.user.uid,
            email: result.user.email || `${result.user.uid}@foodai.app`,
            displayName: result.user.displayName || 'Food Explorer',
            photoURL: result.user.photoURL || undefined,
          })
        } catch (syncErr) {
          console.warn('Profile sync notice:', syncErr)
        }
      }
      toast.success(`Welcome back, ${result.user.displayName || 'Food Explorer'}!`)
    } catch (error: any) {
      if (isUnauthorizedDomainError(error)) {
        const hostname = typeof window !== 'undefined' ? window.location.hostname : 'preview'
        console.warn(`Firebase domain notice for ${hostname}. Signing in as preview user.`)
        setUser(makeMockUser())
        toast.success(`Signed in as preview user`)
        return
      }
      console.warn('Google One Tap sign in notice:', error?.message || error)
      const friendlyMsg = getFriendlyAuthErrorMessage(error)
      toast.error(friendlyMsg)
      throw error
    }
  }

  const sendPasswordReset = async (email: string) => {
    if (AUTH_BYPASS) {
      toast.success('Password reset link sent (demo mode)')
      return
    }
    try {
      await sendPasswordResetEmail(auth, email)
      toast.success('Password reset email sent! Check your inbox.')
    } catch (error: any) {
      const friendlyMsg = getFriendlyAuthErrorMessage(error)
      toast.error(friendlyMsg)
      throw error
    }
  }

  const signInDemo = () => {
    setUser(makeMockUser())
    setIsDemoMode(true)
    toast.success('Signed in as demo user')
  }

  const signOut = async () => {
    setIsDemoMode(false)
    if (AUTH_BYPASS) {
      setUser(null)
      toast.info('Signed out')
      return
    }
    try {
      setUser(null)
      await firebaseSignOut(auth)
      toast.success('Signed out successfully')
    } catch (error: any) {
      toast.error(error.message || 'Failed to sign out')
      throw error
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isDemoMode,
        signIn,
        signUp,
        signInWithGoogle,
        signInWithGoogleCredential,
        signInDemo,
        sendPasswordReset,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    const fallbackUser = makeMockUser('guest@foodai.local', 'Food Explorer')
    return {
      user: fallbackUser,
      loading: false,
      isDemoMode: true,
      signIn: async () => {},
      signUp: async () => {},
      signInWithGoogle: async () => {},
      signInWithGoogleCredential: async () => {},
      signInDemo: () => {},
      sendPasswordReset: async () => {},
      signOut: async () => {},
    }
  }
  return context
}
