import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { performGoogleSignIn, isNativePlatform, getGoogleWebClientId } from '../services/googleAuthService'
import * as CapacitorCore from '@capacitor/core'
import { GoogleSignIn } from '@capawesome/capacitor-google-sign-in'
import * as FirebaseAuth from 'firebase/auth'

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: vi.fn(),
  },
}))

vi.mock('@capawesome/capacitor-google-sign-in', () => ({
  GoogleSignIn: {
    initialize: vi.fn(),
    signIn: vi.fn(),
  },
}))

vi.mock('firebase/auth', () => ({
  signInWithPopup: vi.fn(),
  signInWithCredential: vi.fn(),
  GoogleAuthProvider: {
    credential: vi.fn((token) => ({ providerId: 'google.com', token })),
  },
}))

describe('googleAuthService', () => {
  const originalEnv = import.meta.env.VITE_GOOGLE_CLIENT_ID
  const mockAuth = {} as any
  const mockProvider = {} as any

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    import.meta.env.VITE_GOOGLE_CLIENT_ID = originalEnv
  })

  it('detects native platform using Capacitor.isNativePlatform', () => {
    vi.spyOn(CapacitorCore.Capacitor, 'isNativePlatform').mockReturnValue(true)
    expect(isNativePlatform()).toBe(true)

    vi.spyOn(CapacitorCore.Capacitor, 'isNativePlatform').mockReturnValue(false)
    expect(isNativePlatform()).toBe(false)
  })

  it('falls back to signInWithPopup when running on web platform', async () => {
    vi.spyOn(CapacitorCore.Capacitor, 'isNativePlatform').mockReturnValue(false)
    const mockUserCredential = { user: { uid: 'web-user', displayName: 'Web Explorer' } }
    vi.mocked(FirebaseAuth.signInWithPopup).mockResolvedValue(mockUserCredential as any)

    const result = await performGoogleSignIn(mockAuth, mockProvider)
    expect(FirebaseAuth.signInWithPopup).toHaveBeenCalledWith(mockAuth, mockProvider)
    expect(result).toBe(mockUserCredential)
  })

  it('throws helpful error on native platform when VITE_GOOGLE_CLIENT_ID is missing', async () => {
    vi.spyOn(CapacitorCore.Capacitor, 'isNativePlatform').mockReturnValue(true)
    import.meta.env.VITE_GOOGLE_CLIENT_ID = ''

    await expect(performGoogleSignIn(mockAuth, mockProvider)).rejects.toThrow(
      /VITE_GOOGLE_CLIENT_ID is missing/
    )
  })

  it('initializes and authenticates via native GoogleSignIn on Android native platform', async () => {
    vi.spyOn(CapacitorCore.Capacitor, 'isNativePlatform').mockReturnValue(true)
    import.meta.env.VITE_GOOGLE_CLIENT_ID = 'test-client-id.apps.googleusercontent.com'

    vi.mocked(GoogleSignIn.initialize).mockResolvedValue(undefined as any)
    vi.mocked(GoogleSignIn.signIn).mockResolvedValue({
      idToken: 'mock-google-id-token',
      user: { id: 'g123', email: 'native@foodai.app' },
    } as any)

    const mockFirebaseUser = { user: { uid: 'firebase-native-uid', email: 'native@foodai.app' } }
    vi.mocked(FirebaseAuth.signInWithCredential).mockResolvedValue(mockFirebaseUser as any)

    const result = await performGoogleSignIn(mockAuth, mockProvider)

    expect(GoogleSignIn.initialize).toHaveBeenCalledWith({
      clientId: 'test-client-id.apps.googleusercontent.com',
    })
    expect(GoogleSignIn.signIn).toHaveBeenCalled()
    expect(FirebaseAuth.GoogleAuthProvider.credential).toHaveBeenCalledWith('mock-google-id-token')
    expect(FirebaseAuth.signInWithCredential).toHaveBeenCalled()
    expect(result).toBe(mockFirebaseUser)
  })
})
