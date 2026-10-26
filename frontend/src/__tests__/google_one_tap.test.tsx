import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useGoogleOneTap } from '../hooks/useGoogleOneTap'
import * as AuthModule from '../contexts/AuthContext'

// Mock react-router-dom
const mockNavigate = vi.fn()
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}))

describe('useGoogleOneTap Hook', () => {
  const originalEnv = import.meta.env.VITE_GOOGLE_CLIENT_ID
  const mockSignInWithGoogleCredential = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    delete (window as any).google
    const existingScript = document.getElementById('google-gsi-client')
    if (existingScript) existingScript.remove()
  })

  afterEach(() => {
    import.meta.env.VITE_GOOGLE_CLIENT_ID = originalEnv
  })

  it('does nothing if user is already signed in', () => {
    import.meta.env.VITE_GOOGLE_CLIENT_ID = 'test-client-id.apps.googleusercontent.com'
    vi.spyOn(AuthModule, 'useAuth').mockReturnValue({
      user: { uid: 'existing-user' } as any,
      loading: false,
      isDemoMode: false,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signInWithGoogle: vi.fn(),
      signInWithGoogleCredential: mockSignInWithGoogleCredential,
      signInDemo: vi.fn(),
      sendPasswordReset: vi.fn(),
      signOut: vi.fn(),
    })

    renderHook(() => useGoogleOneTap())
    const script = document.getElementById('google-gsi-client')
    expect(script).toBeNull()
  })

  it('does nothing if VITE_GOOGLE_CLIENT_ID is unset', () => {
    import.meta.env.VITE_GOOGLE_CLIENT_ID = ''
    vi.spyOn(AuthModule, 'useAuth').mockReturnValue({
      user: null,
      loading: false,
      isDemoMode: false,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signInWithGoogle: vi.fn(),
      signInWithGoogleCredential: mockSignInWithGoogleCredential,
      signInDemo: vi.fn(),
      sendPasswordReset: vi.fn(),
      signOut: vi.fn(),
    })

    renderHook(() => useGoogleOneTap())
    const script = document.getElementById('google-gsi-client')
    expect(script).toBeNull()
  })

  it('injects script and initializes Google One Tap when client ID is provided', () => {
    import.meta.env.VITE_GOOGLE_CLIENT_ID = 'test-client-id.apps.googleusercontent.com'
    vi.spyOn(AuthModule, 'useAuth').mockReturnValue({
      user: null,
      loading: false,
      isDemoMode: false,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signInWithGoogle: vi.fn(),
      signInWithGoogleCredential: mockSignInWithGoogleCredential,
      signInDemo: vi.fn(),
      sendPasswordReset: vi.fn(),
      signOut: vi.fn(),
    })

    const mockPrompt = vi.fn()
    const mockInitialize = vi.fn()
    const mockCancel = vi.fn()

    ;(window as any).google = {
      accounts: {
        id: {
          initialize: mockInitialize,
          prompt: mockPrompt,
          cancel: mockCancel,
        },
      },
    }

    const { unmount } = renderHook(() => useGoogleOneTap())

    expect(mockInitialize).toHaveBeenCalledWith(
      expect.objectContaining({
        client_id: 'test-client-id.apps.googleusercontent.com',
        auto_select: true,
        cancel_on_tap_outside: true,
      })
    )
    expect(mockPrompt).toHaveBeenCalled()

    unmount()
    expect(mockCancel).toHaveBeenCalled()
  })
})
