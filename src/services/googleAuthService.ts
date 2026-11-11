import {
  Auth,
  GoogleAuthProvider,
  signInWithCredential,
  signInWithPopup,
  UserCredential,
} from 'firebase/auth'
import { Capacitor } from '@capacitor/core'
import { GoogleSignIn } from '@capawesome/capacitor-google-sign-in'

/**
 * Returns true if the application is running inside a native mobile container (Capacitor Android/iOS).
 */
export function isNativePlatform(): boolean {
  try {
    return Capacitor.isNativePlatform()
  } catch {
    return false
  }
}

export const DEFAULT_GOOGLE_WEB_CLIENT_ID =
  '59556325769-489r0888tuooujuq25ikpuf5i0ethlgj.apps.googleusercontent.com'

/**
 * Retrieves the configured Google OAuth 2.0 Web Client ID from environment variables,
 * falling back to the official FoodAI Web OAuth Client ID.
 */
export function getGoogleWebClientId(): string {
  const envId = import.meta.env.VITE_GOOGLE_CLIENT_ID
  if (typeof envId === 'string') {
    return envId.trim()
  }
  return DEFAULT_GOOGLE_WEB_CLIENT_ID
}

/**
 * Initiates Google Sign-In using the appropriate flow:
 * - Native Android/iOS: Uses native Android Credential Manager / Google Sign-In via @capawesome/capacitor-google-sign-in
 *   and signs in to Firebase using GoogleAuthProvider.credential(idToken).
 * - Web / Desktop Browser: Uses Firebase SDK signInWithPopup.
 */
export async function performGoogleSignIn(
  auth: Auth,
  googleProvider: GoogleAuthProvider
): Promise<UserCredential> {
  if (isNativePlatform()) {
    const clientId = getGoogleWebClientId()
    if (!clientId) {
      console.warn(
        '[GoogleAuth] Native sign-in attempted without VITE_GOOGLE_CLIENT_ID. Please set your Web Client ID from Firebase Console.'
      )
      throw new Error(
        'Google Sign-In configuration required: VITE_GOOGLE_CLIENT_ID is missing. Please add your OAuth 2.0 Web Client ID to .env.local.'
      )
    }

    try {
      await GoogleSignIn.initialize({
        clientId,
      })
    } catch (initErr: any) {
      console.warn('[GoogleAuth] Native initialize notice:', initErr?.message || initErr)
    }

    const signInResult = await GoogleSignIn.signIn()
    if (!signInResult || !signInResult.idToken) {
      throw new Error('Google Sign-In completed but no valid ID token was returned.')
    }

    const credential = GoogleAuthProvider.credential(signInResult.idToken)
    return await signInWithCredential(auth, credential)
  }

  // Web Browser Flow
  return await signInWithPopup(auth, googleProvider)
}
