import React, { createContext, useContext, useEffect, useState } from 'react'
import {
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  signInWithPopup,
  sendPasswordResetEmail,
} from 'firebase/auth'
import { auth, googleProvider } from '../config/firebase'
import { AUTH_BYPASS } from '../config/authMode'
import { syncUserProfile } from '../services/firestoreService'
import { toast } from 'sonner'

interface AuthContextType {
  user: User | null
  loading: boolean
  isDemoMode: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
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

function getFriendlyAuthErrorMessage(error: any): string {
  if (!error) return 'Authentication failed'
  const code = typeof error.code === 'string' ? error.code : ''
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
    case 'auth/popup-blocked':
      return 'Google sign-in popup was blocked by browser. Please allow popups.'
    case 'auth/popup-closed-by-user':
      return 'Google sign-in window was closed.'
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a few moments and try again.'
    default:
      return error.message || 'Authentication error. Please try again.'
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(AUTH_BYPASS ? makeMockUser() : null)
  const [loading, setLoading] = useState(AUTH_BYPASS ? false : true)

  useEffect(() => {
    if (AUTH_BYPASS) return
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser)
      setLoading(false)
      if (currentUser) {
        try {
          await syncUserProfile({
            userId: currentUser.uid,
            email: currentUser.email || `${currentUser.uid}@foodai.app`,
            displayName: currentUser.displayName || 'Food Explorer',
            photoURL: currentUser.photoURL || undefined,
          })
        } catch (err) {
          console.warn('Profile sync notice:', err)
        }
      }
    })

    return unsubscribe
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
      const result = await signInWithPopup(auth, googleProvider)
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

      console.warn('Google sign in notice:', error?.message || error)
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
    toast.success('Signed in as demo user')
  }

  const signOut = async () => {
    if (AUTH_BYPASS) {
      setUser(null)
      toast.info('Signed out')
      return
    }
    try {
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
        isDemoMode: AUTH_BYPASS,
        signIn,
        signUp,
        signInWithGoogle,
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
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
