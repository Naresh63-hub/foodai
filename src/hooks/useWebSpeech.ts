import { useState, useEffect, useRef, useCallback } from 'react'

export interface UseWebSpeechOptions {
  lang?: string
  continuous?: boolean
  interimResults?: boolean
  onResult?: (transcript: string, isFinal: boolean) => void
  onError?: (error: string) => void
}

// Browser Web Speech API type augmentations
interface ISpeechRecognitionEvent {
  resultIndex: number
  results: {
    length: number
    [index: number]: {
      isFinal: boolean
      [index: number]: {
        transcript: string
        confidence: number
      }
    }
  }
}

interface ISpeechRecognitionErrorEvent {
  error: string
  message?: string
}

export function useWebSpeech(options: UseWebSpeechOptions = {}) {
  const {
    lang = 'en-US',
    continuous = false,
    interimResults = true,
    onResult,
    onError,
  } = options

  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [ttsEnabled, setTtsEnabled] = useState(true)

  // Detect Web Speech API support
  const isSpeechRecognitionSupported = typeof window !== 'undefined' &&
    !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)

  const isSpeechSynthesisSupported = typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    'SpeechSynthesisUtterance' in window

  const recognitionRef = useRef<any>(null)
  const onResultRef = useRef(onResult)
  const onErrorRef = useRef(onError)

  useEffect(() => {
    onResultRef.current = onResult
    onErrorRef.current = onError
  }, [onResult, onError])

  // Initialize SpeechRecognition instance
  useEffect(() => {
    if (!isSpeechRecognitionSupported) return

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

    try {
      const recognition = new SpeechRecognition()
      recognition.continuous = continuous
      recognition.interimResults = interimResults
      recognition.lang = lang

      recognition.onstart = () => {
        setIsListening(true)
        setError(null)
      }

      recognition.onend = () => {
        setIsListening(false)
      }

      recognition.onerror = (event: ISpeechRecognitionErrorEvent) => {
        setIsListening(false)
        let friendlyError = 'Speech recognition error'
        if (event.error === 'not-allowed' || event.error === 'permission-denied') {
          friendlyError = 'Microphone access was denied. Please allow microphone permissions.'
        } else if (event.error === 'no-speech') {
          friendlyError = 'No speech detected. Please speak clearly into your microphone.'
        } else if (event.error === 'network') {
          friendlyError = 'Network error during speech recognition.'
        } else if (event.error === 'aborted') {
          friendlyError = 'Speech input stopped.'
        } else {
          friendlyError = `Speech error: ${event.error}`
        }

        setError(friendlyError)
        onErrorRef.current?.(friendlyError)
      }

      recognition.onresult = (event: ISpeechRecognitionEvent) => {
        let currentInterim = ''
        let currentFinal = ''

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const result = event.results[i]
          const text = result[0].transcript
          if (result.isFinal) {
            currentFinal += text
          } else {
            currentInterim += text
          }
        }

        if (currentFinal) {
          setTranscript((prev) => {
            const updated = prev ? `${prev} ${currentFinal.trim()}` : currentFinal.trim()
            onResultRef.current?.(updated, true)
            return updated
          })
          setInterimTranscript('')
        } else if (currentInterim) {
          setInterimTranscript(currentInterim)
          onResultRef.current?.(currentInterim, false)
        }
      }

      recognitionRef.current = recognition
    } catch (e: any) {
      console.warn('Could not initialize SpeechRecognition:', e)
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort()
        } catch {}
      }
    }
  }, [isSpeechRecognitionSupported, lang, continuous, interimResults])

  const startListening = useCallback(() => {
    if (!isSpeechRecognitionSupported) {
      const msg = 'Web Speech Recognition is not supported in this browser. Please use Chrome, Safari, or Edge.'
      setError(msg)
      onErrorRef.current?.(msg)
      return false
    }

    setError(null)
    setTranscript('')
    setInterimTranscript('')

    try {
      if (recognitionRef.current) {
        recognitionRef.current.abort()
        recognitionRef.current.start()
        return true
      }
    } catch (err: any) {
      console.error('Error starting SpeechRecognition:', err)
      setError(err.message || 'Failed to start microphone')
      return false
    }
    return false
  }, [isSpeechRecognitionSupported])

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop()
      } catch {}
    }
    setIsListening(false)
  }, [isListening])

  const resetTranscript = useCallback(() => {
    setTranscript('')
    setInterimTranscript('')
    setError(null)
  }, [])

  // Web Speech API Text-to-Speech (speechSynthesis)
  const speak = useCallback((text: string, options?: { pitch?: number; rate?: number; volume?: number }) => {
    if (!isSpeechSynthesisSupported || !ttsEnabled || typeof window === 'undefined') return

    try {
      window.speechSynthesis?.cancel?.()
      const UtteranceClass = (window as any).SpeechSynthesisUtterance
      if (!UtteranceClass) return

      const utterance = new UtteranceClass(text)
      utterance.pitch = options?.pitch ?? 1.0
      utterance.rate = options?.rate ?? 1.05 // Slightly energetic pace
      utterance.volume = options?.volume ?? 1.0
      utterance.lang = lang

      // Prefer a natural voice if available
      const voices = window.speechSynthesis?.getVoices?.() || []
      const preferredVoice = voices.find(
        (v: any) => v.lang?.startsWith(lang.slice(0, 2)) && (v.name?.includes('Natural') || v.name?.includes('Google') || v.name?.includes('Siri'))
      ) || voices.find((v: any) => v.lang?.startsWith(lang.slice(0, 2)))

      if (preferredVoice) {
        utterance.voice = preferredVoice
      }

      window.speechSynthesis?.speak?.(utterance)
    } catch (e) {
      console.warn('Speech synthesis error:', e)
    }
  }, [isSpeechSynthesisSupported, ttsEnabled, lang])

  return {
    isSupported: isSpeechRecognitionSupported,
    isTtsSupported: isSpeechSynthesisSupported,
    isListening,
    transcript,
    interimTranscript,
    error,
    ttsEnabled,
    setTtsEnabled,
    startListening,
    stopListening,
    resetTranscript,
    setTranscript,
    speak,
  }
}
