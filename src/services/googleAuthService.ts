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

/**
 * Retrieves the configured Google OAuth 2.0 Web Client ID from environment variables.
 */
export function getGoogleWebClientId(): string {
  return (import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim()
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
