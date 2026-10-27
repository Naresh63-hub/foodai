/**
 * Haptic micro-interaction feedback utility for mobile and touch devices.
 * Uses the Web Vibration API gracefully with null-checks and error suppression.
 */
export type HapticType = 'selection' | 'light' | 'medium' | 'success' | 'warning' | 'error'

export function triggerHaptic(type: HapticType = 'light'): void {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return
  }

  // Verify navigator.vibrate availability
  if (!('vibrate' in navigator) || typeof navigator.vibrate !== 'function') {
    return
  }

  try {
    switch (type) {
      case 'selection':
        // Ultra-subtle 8ms tick for tab changes, segment toggles, filters
        navigator.vibrate(8)
        break
      case 'light':
        // Gentle 12ms tap for interactive cards and buttons
        navigator.vibrate(12)
        break
      case 'medium':
        // Firm 22ms feedback for camera snap or primary actions
        navigator.vibrate(22)
        break
      case 'success':
        // Double pulse for successful scan or save
        navigator.vibrate([15, 35, 20])
        break
      case 'warning':
        // Warning alert pattern
        navigator.vibrate([25, 45, 25])
        break
      case 'error':
        // Strong error pattern
        navigator.vibrate([35, 50, 35])
        break
      default:
        navigator.vibrate(10)
    }
  } catch {
    // Non-blocking: Silently ignore browsers blocking vibrations
  }
}
