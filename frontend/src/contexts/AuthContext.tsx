import React, { createContext, useContext, useEffect, useState } from 'react'
import { 
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
} from 'firebase/auth'
import { auth } from '../config/firebase'
import { AUTH_BYPASS } from '../config/authMode'
import { toast } from 'sonner'

interface AuthContextType {
  user: User | null
  loading: boolean
  isDemoMode: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Dev-only login bypass (see config/authMode.ts): browse the app as a signed-in
// user without Firebase. Only active in development builds.

function makeMockUser(): User {
  return {
    uid: 'local-dev-user',
    email: 'dev@foodai.local',
    displayName: 'Local Dev',
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(AUTH_BYPASS ? makeMockUser() : null)
  const [loading, setLoading] = useState(AUTH_BYPASS ? false : true)

  useEffect(() => {
    if (AUTH_BYPASS) return

    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          setUser(result.user)
          toast.success('Successfully signed in with Google')
        }
      })
      .catch((error) => {
        if (error.code !== 'auth/popup-closed-by-user') {
          console.error('Redirect sign-in error:', error)
        }
      })

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user)
      setLoading(false)
    })

    return unsubscribe
  }, [])

  const signIn = async (email: string, password: string) => {
    if (AUTH_BYPASS) {
      setUser(makeMockUser())
      toast.success('Login bypassed (dev mode)')
      return
    }
    try {
      await signInWithEmailAndPassword(auth, email, password)
      toast.success('Successfully signed in')
    } catch (error: any) {
      toast.error(error.message || 'Failed to sign in')
      throw error
    }
  }

  const signUp = async (email: string, password: string) => {
    if (AUTH_BYPASS) {
      setUser(makeMockUser())
      toast.success('Signup bypassed (dev mode)')
      return
    }
    try {
      await createUserWithEmailAndPassword(auth, email, password)
      toast.success('Account created successfully')
    } catch (error: any) {
      toast.error(error.message || 'Failed to create account')
      throw error
    }
  }

  const signInWithGoogle = async () => {
    if (AUTH_BYPASS) {
      setUser(makeMockUser())
      toast.success('Login bypassed (dev mode)')
      return
    }
    const provider = new GoogleAuthProvider()
    provider.setCustomParameters({ prompt: 'select_account' })
    try {
      await signInWithPopup(auth, provider)
      toast.success('Successfully signed in with Google')
    } catch (error: any) {
      if (error.code === 'auth/popup-blocked') {
        toast.info('Popup was blocked by browser. Redirecting to Google...')
        await signInWithRedirect(auth, provider)
        return
      }
      if (error.code === 'auth/popup-closed-by-user') {
        return
      }
      toast.error(error.message || 'Failed to sign in with Google')
      throw error
    }
  }

  const signOut = async () => {
    if (AUTH_BYPASS) {
      setUser(makeMockUser()) // stay "logged in" so bypass keeps working
      toast.info('Sign-out disabled in dev bypass mode')
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
    <AuthContext.Provider value={{ user, loading, isDemoMode: AUTH_BYPASS, signIn, signUp, signInWithGoogle, signOut }}>
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
