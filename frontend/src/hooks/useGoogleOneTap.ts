import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (config: {
            client_id: string
            callback: (response: { credential?: string; select_by?: string }) => void
            auto_select?: boolean
            cancel_on_tap_outside?: boolean
            itp_support?: boolean
            context?: 'signin' | 'signup' | 'use'
          }) => void
          prompt: (
            momentListener?: (notification: {
              isNotDisplayed: () => boolean
              getNotDisplayedReason: () => string
              isSkippedMoment: () => boolean
              getSkippedReason: () => string
              isDismissedMoment: () => boolean
              getDismissedReason: () => string
            }) => void
          ) => void
          renderButton?: (parent: HTMLElement, options: any) => void
          cancel: () => void
        }
      }
    }
  }
}

interface UseGoogleOneTapOptions {
  context?: 'signin' | 'signup' | 'use'
  disabled?: boolean
}

/**
 * Automatically prompts the user with Google One Tap for instant 1-tap sign-in/up.
 * Respects existing authentication state and cleans up on unmount.
 */
export function useGoogleOneTap(options: UseGoogleOneTapOptions = {}) {
  const { context = 'signin', disabled = false } = options
  const authContext = useAuth()
  const user = authContext?.user
  const signInWithGoogleCredential = authContext?.signInWithGoogleCredential
  const navigate = useNavigate()
  const initializedRef = useRef(false)

  useEffect(() => {
    // Skip if user is already logged in or hook is disabled
    if (user || disabled || typeof window === 'undefined') {
      return
    }

    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
    if (!clientId) {
      return
    }

    const initializeOneTap = () => {
      if (!window.google?.accounts?.id || initializedRef.current) return
      initializedRef.current = true

      try {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async (response) => {
            if (response?.credential && signInWithGoogleCredential) {
              try {
                await signInWithGoogleCredential(response.credential)
                navigate('/')
              } catch (err) {
                console.error('Google One Tap authentication error:', err)
              }
            }
          },
          auto_select: true, // Automatically select account when only 1 active session exists
          cancel_on_tap_outside: true,
          itp_support: true,
          context,
        })

        window.google.accounts.id.prompt((notification) => {
          if (notification?.isNotDisplayed?.()) {
            console.log('Google One Tap notice: not displayed -', notification.getNotDisplayedReason())
          } else if (notification?.isSkippedMoment?.()) {
            console.log('Google One Tap notice: skipped -', notification.getSkippedReason())
          } else if (notification?.isDismissedMoment?.()) {
            console.log('Google One Tap notice: dismissed -', notification.getDismissedReason())
          }
        })
      } catch (err) {
        console.warn('Failed to initialize Google One Tap:', err)
      }
    }

    // If Google Identity Services is already present on window, initialize immediately
    if (window.google?.accounts?.id) {
      initializeOneTap()
      return () => {
        try {
          window.google?.accounts?.id?.cancel()
        } catch {}
        initializedRef.current = false
      }
    }

    const scriptId = 'google-gsi-client'
    let script = document.getElementById(scriptId) as HTMLScriptElement | null

    if (!script) {
      script = document.createElement('script')
      script.id = scriptId
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.defer = true
      script.onload = initializeOneTap
      document.head.appendChild(script)
    } else {
      script.addEventListener('load', initializeOneTap)
    }

    return () => {
      try {
        window.google?.accounts?.id?.cancel()
      } catch {}
      initializedRef.current = false
    }
  }, [user, disabled, context, signInWithGoogleCredential, navigate])
}
