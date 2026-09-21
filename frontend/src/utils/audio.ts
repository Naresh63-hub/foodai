/**
 * Synthesizes a crisp scanner confirmation beep using Web Audio API
 * and triggers haptic vibration on mobile devices without any external sound files.
 */
export function playScanSound() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioContextClass) return

    const ctx = new AudioContextClass()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(1200, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(1800, ctx.currentTime + 0.08)

    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start()
    osc.stop(ctx.currentTime + 0.12)

    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(60)
    }
  } catch {
    // AudioContext blocked or not supported
  }
}