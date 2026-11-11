import React, { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { toast } from 'sonner'
import type { BrowserMultiFormatReader } from '@zxing/library'
import SafeAreaView from '../components/SafeAreaView'
import { scanBarcode, scanOCR, scanText } from '../api/food'
import { playScanSound } from '../utils/audio'
import { QUICK_SAMPLE_PRESETS } from '../constants'
import demoProductsData from '../constants/demoProducts.json'

const demoProducts = demoProductsData as Record<string, any>

export default function Scan() {
  const navigate = useNavigate()
  const location = useLocation()
  const initialTab = (location.state as any)?.tab
  const [tab, setTab] = useState<'barcode' | 'batch' | 'ocr' | 'text'>(
    initialTab === 'ocr' || initialTab === 'text' || initialTab === 'batch' ? initialTab : 'barcode'
  )
  const [barcode, setBarcode] = useState('')
  const [batchCode, setBatchCode] = useState('')
  const [batchCount, setBatchCount] = useState(0)
  const [ingredientsText, setIngredientsText] = useState('')
  const [productName, setProductName] = useState('')
  const [loading, setLoading] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const [cameraActive, setCameraActive] = useState(false)
  const [torchOn, setTorchOn] = useState(false)
  const [torchSupported, setTorchSupported] = useState(true)
  const [autoTorch, setAutoTorch] = useState(true)
  const [zoomLevel, setZoomLevel] = useState<number>(1)
  const [zoomSupported, setZoomSupported] = useState<boolean>(false)
  const [focusRing, setFocusRing] = useState<{ x: number; y: number; visible: boolean }>({
    x: 0,
    y: 0,
    visible: false,
  })
  const [detectedCode, setDetectedCode] = useState<string | null>(null)
  const [scannerStatus, setScannerStatus] = useState<string>('Align barcode in frame')
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment')
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([])
  const [permissionStatus, setPermissionStatus] = useState<'prompt' | 'granted' | 'denied'>('prompt')
  const [lightLevel, setLightLevel] = useState<'good' | 'low' | 'dark'>('good')
  const [multipleBarcodes, setMultipleBarcodes] = useState<string[]>([])

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const readerRef = useRef<BrowserMultiFormatReader | null>(null)
  const detectLoopRef = useRef<number | null>(null)
  const lastScannedCodeRef = useRef<string | null>(null)
  const lastScannedTimeRef = useRef<number>(0)
  const isProcessingRef = useRef<boolean>(false)
  const tabRef = useRef(tab)
  const lightIntervalRef = useRef<any>(null)

  useEffect(() => {
    tabRef.current = tab
  }, [tab])

  useEffect(() => {
    try {
      const existing = JSON.parse(localStorage.getItem('foodai_grocery_cart') || '[]')
      setBatchCount(existing.length)
    } catch {
      setBatchCount(0)
    }
  }, [])

  const getUserPreferences = () => {
    const savedAge = localStorage.getItem('prefs_age')
    const savedWeight = localStorage.getItem('prefs_weight')
    const savedConditionsStr = localStorage.getItem('prefs_health_conditions') ?? '[]'
    let conditions: string[] = []
    try {
      conditions = JSON.parse(savedConditionsStr)
    } catch {
      conditions = []
    }
    return {
      age: savedAge ? Number(savedAge) : null,
      weightKg: savedWeight ? Number(savedWeight) : null,
      healthConditions: conditions,
    }
  }

  // Check camera permission preference and enumerate cameras
  useEffect(() => {
    const checkCameraPermissions = async () => {
      try {
        const storedPermission = localStorage.getItem('camera_permission')
        if (storedPermission === 'granted') {
          setPermissionStatus('granted')
        } else if (storedPermission === 'denied') {
          setPermissionStatus('denied')
        }

        if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
          const devices = await navigator.mediaDevices.enumerateDevices()
          const videoDevices = devices.filter((device) => device.kind === 'videoinput')
          setAvailableCameras(videoDevices)
        }
      } catch (err) {
        console.warn('Error checking camera permissions:', err)
      }
    }

    checkCameraPermissions()
  }, [])

  // Auto-activate flashlight in low light when camera is on
  useEffect(() => {
    if (lightLevel === 'dark' && cameraActive && !torchOn && torchSupported && autoTorch) {
      toggleTorch()
      toast.info('🌙 Low light detected: flashlight activated')
    }
  }, [lightLevel, cameraActive, torchOn, torchSupported, autoTorch])

  const handleBatchScanSubmit = async (codeToScan?: string) => {
    const cleanBarcode = (codeToScan || batchCode).trim()
    if (!cleanBarcode) {
      toast.error('Please enter a barcode number')
      return
    }
    setLoading(true)
    const { age, weightKg, healthConditions } = getUserPreferences()
    try {
      const result = await scanBarcode(cleanBarcode, age, weightKg, healthConditions)
      playScanSound()

      const existing = JSON.parse(localStorage.getItem('foodai_grocery_cart') || '[]')
      const hasPalm = result.ingredients.some((i: any) => i.name.toLowerCase().includes('palm'))
      const newItem = {
        id: Date.now().toString(),
        barcode: result.product.barcode || cleanBarcode,
        product_name: result.product.product_name,
        brands: result.product.brands,
        processing_level: result.processing_level,
        sugars_100g: result.nutrition.per_100g.sugars_g || 0,
        salt_100g: result.nutrition.per_100g.salt_g || 0,
        fat_100g: result.nutrition.per_100g.fat_g || 0,
        additives_count: result.additives_count || 0,
        has_palm_oil: hasPalm,
        healthier_swap: result.healthier_swaps?.[0]?.name,
      }
      existing.push(newItem)
      localStorage.setItem('foodai_grocery_cart', JSON.stringify(existing))
      setBatchCount(existing.length)
      setBatchCode('')
      toast.success(`🛒 Added "${result.product.product_name}" to Cart!`)
    } catch (err: any) {
      const fallback = demoProducts[cleanBarcode]
      if (fallback) {
        playScanSound()
        const existing = JSON.parse(localStorage.getItem('foodai_grocery_cart') || '[]')
        const hasPalm = fallback.ingredients?.some((i: any) => i.name.toLowerCase().includes('palm'))
        const newItem = {
          id: Date.now().toString(),
          barcode: fallback.product.barcode || cleanBarcode,
          product_name: fallback.product.product_name,
          brands: fallback.product.brands,
          processing_level: fallback.processing_level,
          sugars_100g: fallback.nutrition?.per_100g?.sugars_g || 0,
          salt_100g: fallback.nutrition?.per_100g?.salt_g || 0,
          fat_100g: fallback.nutrition?.per_100g?.fat_g || 0,
          additives_count: fallback.additives_count || 0,
          has_palm_oil: hasPalm,
          healthier_swap: fallback.healthier_swaps?.[0]?.name,
        }
        existing.push(newItem)
        localStorage.setItem('foodai_grocery_cart', JSON.stringify(existing))
        setBatchCount(existing.length)
        setBatchCode('')
        toast.success(`🛒 Added "${fallback.product.product_name}" to Cart!`)
        return
      }
      toast.error(err.response?.data?.detail || 'Product not found in database.')
    } finally {
      setLoading(false)
    }
  }

  // Handle detected barcode from live camera stream
  const handleDetectedBarcode = (rawCode: string) => {
    const code = rawCode.trim()
    if (!code) return

    const now = Date.now()
    if (code === lastScannedCodeRef.current && now - lastScannedTimeRef.current < 2000) {
      return
    }
    if (isProcessingRef.current) {
      return
    }

    lastScannedCodeRef.current = code
    lastScannedTimeRef.current = now

    // Audio & Haptic feedback
    playScanSound()
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate([60, 30, 60])
      } catch {}
    }

    setDetectedCode(code)
    setScannerStatus(`Detected: ${code}`)

    const currentTab = tabRef.current
    if (currentTab === 'batch') {
      toast.success(`Scanned: ${code}`)
      handleBatchScanSubmit(code)
      setTimeout(() => {
        setDetectedCode(null)
        setScannerStatus('Ready for next item')
      }, 1500)
    } else {
      isProcessingRef.current = true
      setBarcode(code)
      toast.success(`Barcode detected: ${code}`)
      setTimeout(() => {
        stopCamera()
        handleBarcodeSubmit(code)
      }, 350)
    }
  }

  // Light level detection for low light warning / auto-torch
  const detectLightLevel = () => {
    if (!videoRef.current) return

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = 100
    canvas.height = 100
    ctx.drawImage(videoRef.current, 0, 0, 100, 100)

    const imageData = ctx.getImageData(0, 0, 100, 100)
    const data = imageData.data
    let totalBrightness = 0

    for (let i = 0; i < data.length; i += 4) {
      const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3
      totalBrightness += brightness
    }

    const avgBrightness = totalBrightness / (data.length / 4)

    if (avgBrightness < 50) {
      setLightLevel('dark')
    } else if (avgBrightness < 100) {
      setLightLevel('low')
    } else {
      setLightLevel('good')
    }
  }

  // Live high-speed auto barcode decoding loop
  const startBarcodeScanning = async () => {
    if (!videoRef.current) return

    if (detectLoopRef.current) {
      cancelAnimationFrame(detectLoopRef.current)
      detectLoopRef.current = null
    }
    if (readerRef.current) {
      try {
        readerRef.current.reset()
      } catch {}
    }

    if (lightIntervalRef.current) clearInterval(lightIntervalRef.current)
    lightIntervalRef.current = setInterval(() => {
      if (cameraActive) {
        detectLightLevel()
      }
    }, 1000)

    // 1. Hardware accelerated native BarcodeDetector API (Chrome, Edge, Android WebView)
    const hasNative = typeof window !== 'undefined' && 'BarcodeDetector' in window
    if (hasNative) {
      try {
        let formats = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code']
        if (typeof (window as any).BarcodeDetector.getSupportedFormats === 'function') {
          try {
            const supported = await (window as any).BarcodeDetector.getSupportedFormats()
            if (Array.isArray(supported) && supported.length > 0) {
              formats = formats.filter((f) => supported.includes(f))
            }
          } catch {}
        }

        const detector = new (window as any).BarcodeDetector({ formats })

        let lastCheck = 0
        const detectFrame = async (timestamp: number) => {
          if (!streamRef.current || !videoRef.current) return

          // High-frequency 60ms scan check
          if (timestamp - lastCheck >= 60) {
            lastCheck = timestamp
            if (videoRef.current.readyState >= 2 && !videoRef.current.paused) {
              try {
                const barcodes = await detector.detect(videoRef.current)
                if (barcodes && barcodes.length > 0) {
                  if (barcodes.length > 1) {
                    const codes = barcodes.map((b: any) => b.rawValue).filter(Boolean)
                    setMultipleBarcodes(codes)
                  } else {
                    const rawVal = barcodes[0].rawValue
                    if (rawVal) {
                      handleDetectedBarcode(rawVal)
                    }
                  }
                }
              } catch {}
            }
          }

          detectLoopRef.current = requestAnimationFrame(detectFrame)
        }

        detectLoopRef.current = requestAnimationFrame(detectFrame)
        setScannerStatus('Align barcode in frame')
        return
      } catch (err) {
        console.warn('Native BarcodeDetector fallback to ZXing:', err)
      }
    }

    // 2. High-speed cross-browser ZXing BrowserMultiFormatReader fallback
    try {
      const { BrowserMultiFormatReader } = await import('@zxing/library')
      if (!videoRef.current || !streamRef.current) return
      if (!readerRef.current) {
        readerRef.current = new BrowserMultiFormatReader()
      }
      readerRef.current.timeBetweenDecodingAttempts = 60
      readerRef.current.decodeFromVideoElementContinuously(videoRef.current, (result) => {
        if (result) {
          const text = result.getText()
          if (text) {
            handleDetectedBarcode(text)
          }
        }
      })
      setScannerStatus('Align barcode in frame')
    } catch (err) {
      console.warn('ZXing decoding failed to start:', err)
      setScannerStatus('Position barcode clearly under light')
      if (lightIntervalRef.current) {
        clearInterval(lightIntervalRef.current)
        lightIntervalRef.current = null
      }
    }
  }

  // Start Live Webcam Video Stream
  async function startCamera() {
    try {
      setCameraActive(true)
      setTorchOn(false)
      setDetectedCode(null)
      isProcessingRef.current = false
      lastScannedCodeRef.current = null
      lastScannedTimeRef.current = 0
      setScannerStatus('Starting camera...')

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 },
        },
      })
      streamRef.current = stream

      localStorage.setItem('camera_permission', 'granted')
      setPermissionStatus('granted')

      const track = stream.getVideoTracks()[0]
      if (track) {
        const capabilities = (track.getCapabilities && track.getCapabilities()) as any
        if (capabilities) {
          if ('torch' in capabilities) {
            setTorchSupported(Boolean(capabilities.torch))
          } else {
            setTorchSupported(true)
          }
          if ('zoom' in capabilities) {
            setZoomSupported(true)
          }
        }

        // Apply continuous autofocus constraint
        try {
          await (track as any).applyConstraints({
            advanced: [{ focusMode: 'continuous' }],
          })
        } catch {}
      }

      const initVideo = async () => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.setAttribute('playsinline', 'true')
          try {
            await videoRef.current.play()
          } catch (e) {
            console.warn('Auto-play error:', e)
          }
          startBarcodeScanning()
        }
      }

      if (videoRef.current) {
        await initVideo()
      } else {
        setTimeout(initVideo, 100)
      }

      toast.success('Camera active. Point at barcode!')
    } catch (err: any) {
      console.warn('getUserMedia error:', err)

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        toast.error('Camera access denied. Please enable camera permissions in your browser settings.')
        localStorage.setItem('camera_permission', 'denied')
        setPermissionStatus('denied')
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        toast.error('No camera available on this device. Use manual entry or photo upload.')
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        toast.error('Camera is in use by another application. Close other apps and try again.')
      } else if (err.name === 'SecurityError' || err.name === 'NotAllowedError') {
        toast.error('Camera requires HTTPS. Please use a secure connection.')
      } else {
        toast.info('Camera unavailable in current environment. Use photo upload or enter digits.')
      }

      setCameraActive(false)
    }
  }

  // Auto-activate camera if permission was previously granted
  useEffect(() => {
    if (permissionStatus === 'granted' && (tab === 'barcode' || tab === 'batch') && !cameraActive) {
      startCamera()
    }
  }, [permissionStatus, tab])

  const toggleTorch = async () => {
    if (!streamRef.current) {
      toast.info('Camera is not active')
      return
    }
    const track = streamRef.current.getVideoTracks()[0]
    if (!track) {
      toast.info('No video track available')
      return
    }

    try {
      const nextState = !torchOn
      await (track as any).applyConstraints({
        advanced: [{ torch: nextState }],
      })
      setTorchOn(nextState)
      toast.success(nextState ? 'Torch ON 🔦' : 'Torch OFF')
    } catch {
      toast.error('Torch not supported on this device/camera')
      setTorchSupported(false)
    }
  }

  const applyZoom = async (newZoom: number) => {
    if (!streamRef.current) return
    const track = streamRef.current.getVideoTracks()[0]
    if (!track) return
    try {
      await (track as any).applyConstraints({
        advanced: [{ zoom: newZoom }],
      })
      setZoomLevel(newZoom)
      toast.info(`Camera Zoom: ${newZoom}x`)
    } catch {
      setZoomLevel(newZoom)
    }
  }

  const handleTapToFocus = async (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    setFocusRing({ x, y, visible: true })
    setTimeout(() => {
      setFocusRing((prev) => ({ ...prev, visible: false }))
    }, 800)

    if (streamRef.current) {
      const track = streamRef.current.getVideoTracks()[0]
      if (track) {
        try {
          await (track as any).applyConstraints({
            advanced: [{ focusMode: 'continuous' }],
          })
        } catch {}
      }
    }
  }

  const switchCamera = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment'
    setFacingMode(nextMode)
    stopCamera()
    setTimeout(() => {
      startCamera()
    }, 100)
  }

  const stopCamera = () => {
    if (detectLoopRef.current) {
      cancelAnimationFrame(detectLoopRef.current)
      detectLoopRef.current = null
    }
    if (lightIntervalRef.current) {
      clearInterval(lightIntervalRef.current)
      lightIntervalRef.current = null
    }

    if (readerRef.current) {
      try {
        readerRef.current.reset()
      } catch {}
    }

    if (streamRef.current) {
      const track = streamRef.current.getVideoTracks()[0]
      if (track && torchOn) {
        try {
          track.applyConstraints({ advanced: [{ torch: false } as any] })
        } catch {}
      }
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    setTorchOn(false)
    setCameraActive(false)
    setDetectedCode(null)
    setMultipleBarcodes([])
    setLightLevel('good')
    isProcessingRef.current = false
  }

  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [])

  const handleSnapOCR = () => {
    if (!videoRef.current) return
    const video = videoRef.current
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    playScanSound()
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate([60, 30, 60])
      } catch {}
    }
    toast.info('Extracting nutrition label text...')
    setLoading(true)

    canvas.toBlob(
      async (blob) => {
        if (!blob) {
          setLoading(false)
          return
        }
        const file = new File([blob], 'label_scan.jpg', { type: 'image/jpeg' })
        const { age, weightKg, healthConditions } = getUserPreferences()
        try {
          const ocrRes = await scanOCR(file)
          const extractedText = ocrRes?.text || ''
          if (extractedText.trim()) {
            const analysis = await scanText({
              product_name: 'Scanned Label',
              ingredients_text: extractedText,
              age,
              weight_kg: weightKg,
              health_conditions: healthConditions,
            })
            stopCamera()
            navigate(`/results/ocr-${Date.now()}`, { state: { result: analysis } })
          } else {
            toast.error('No readable text found on label. Please hold camera closer.')
          }
        } catch (err: any) {
          toast.error(err.response?.data?.detail || 'Unable to read text from label. Try holding camera closer.')
        } finally {
          setLoading(false)
        }
      },
      'image/jpeg',
      0.88
    )
  }

  const handleBarcodeSubmit = async (codeToScan?: string) => {
    const cleanBarcode = (codeToScan || barcode).trim()
    if (!cleanBarcode) {
      toast.error('Please enter a barcode number')
      return
    }

    setLoading(true)
    const { age, weightKg, healthConditions } = getUserPreferences()

    try {
      const result = await scanBarcode(cleanBarcode, age, weightKg, healthConditions)
      playScanSound()
      navigate(`/results/${cleanBarcode}`, { state: { result } })
    } catch (err: any) {
      const fallback = demoProducts[cleanBarcode]
      if (fallback) {
        playScanSound()
        navigate(`/results/${cleanBarcode}`, { state: { result: fallback } })
        return
      }
      toast.error(err.response?.data?.detail || 'Product not found. Please try another product.')
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setFileName(file.name)
    setLoading(true)
    const { age, weightKg, healthConditions } = getUserPreferences()

    try {
      const ocrRes = await scanOCR(file)
      const extractedText = ocrRes?.text || ''
      if (extractedText.trim()) {
        const analysis = await scanText({
          product_name: file.name.replace(/\.[^/.]+$/, ''),
          ingredients_text: extractedText,
          age,
          weight_kg: weightKg,
          health_conditions: healthConditions,
        })
        playScanSound()
        navigate(`/results/ocr-${Date.now()}`, { state: { result: analysis } })
      } else {
        toast.error('No readable ingredients text found in this image.')
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'OCR extraction failed. Please try a clearer picture.')
    } finally {
      setLoading(false)
    }
  }

  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ingredientsText.trim()) {
      toast.error('Please paste or type ingredients')
      return
    }

    setLoading(true)
    const { age, weightKg, healthConditions } = getUserPreferences()

    try {
      const result = await scanText({
        product_name: productName.trim() || undefined,
        ingredients_text: ingredientsText.trim(),
        age,
        weight_kg: weightKg,
        health_conditions: healthConditions,
      })
      playScanSound()
      navigate(`/results/text-${Date.now()}`, { state: { result } })
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Text analysis failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleTabChange = (newTab: 'barcode' | 'batch' | 'ocr' | 'text') => {
    if (newTab !== tab) {
      if (cameraActive && (newTab === 'text')) {
        stopCamera()
      }
      setTab(newTab)
    }
  }

  const selectPreset = (code: string) => {
    setBarcode(code)
    const demoData = demoProducts[code]
    if (demoData) {
      playScanSound()
      toast.success(`Identified: ${demoData.product.product_name}`)
      navigate(`/results/${code}`, { state: { result: demoData } })
      return
    }
    handleBarcodeSubmit(code)
  }

  const renderCameraView = (mode: 'single' | 'batch') => {
    return (
      <div className="relative rounded-3xl bg-gray-950 overflow-hidden text-center text-white p-3 sm:p-4 shadow-card border border-gray-800 min-h-[260px] flex flex-col items-center justify-center">
        {cameraActive ? (
          <div
            onClick={handleTapToFocus}
            className="relative w-full h-72 sm:h-80 rounded-2xl overflow-hidden bg-black flex items-center justify-center cursor-crosshair select-none"
          >
            <video
              ref={videoRef}
              playsInline
              autoPlay
              muted
              className="w-full h-full object-cover"
            />

            {/* Tap-To-Focus Indicator Ring */}
            {focusRing.visible && (
              <div
                style={{ left: focusRing.x - 24, top: focusRing.y - 24 }}
                className="absolute w-12 h-12 border-2 border-amber-300 rounded-lg pointer-events-none animate-ping duration-300 z-30"
              />
            )}

            {/* Viewfinder Target Reticle */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-4">
              {tab === 'ocr' ? (
                /* OCR Document / Nutrition Label Frame */
                <div className="relative w-72 h-48 border-2 border-dashed border-emerald-400/90 rounded-2xl flex flex-col items-center justify-between p-3 bg-black/20 backdrop-blur-[1px] shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                  <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-400/60 text-[10px] font-black tracking-wide text-emerald-300">
                    <span>📋</span>
                    <span>ALIGN NUTRITION FACTS OR INGREDIENTS</span>
                  </div>
                  <div className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-emerald-400 rounded-tl-sm" />
                  <div className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-emerald-400 rounded-tr-sm" />
                  <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-emerald-400 rounded-bl-sm" />
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-emerald-400 rounded-br-sm" />
                  <div className="laser-line pointer-events-none" />
                </div>
              ) : (
                /* Barcode / Batch Scan Frame */
                <div
                  className={`relative w-64 h-36 border-2 rounded-2xl transition-all duration-300 flex items-center justify-center ${
                    detectedCode
                      ? 'border-emerald-400 bg-emerald-500/25 shadow-[0_0_35px_rgba(52,211,153,0.7)] scale-105'
                      : 'border-emerald-400/80 shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                  }`}
                >
                  <div className="absolute -top-1 -left-1 w-4 h-4 border-t-4 border-l-4 border-emerald-400 rounded-tl-sm" />
                  <div className="absolute -top-1 -right-1 w-4 h-4 border-t-4 border-r-4 border-emerald-400 rounded-tr-sm" />
                  <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-4 border-l-4 border-emerald-400 rounded-bl-sm" />
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-4 border-r-4 border-emerald-400 rounded-br-sm" />

                  {/* High-tech Sweeping Animated Laser Scan Line */}
                  {!detectedCode && (
                    <div className="laser-line pointer-events-none" />
                  )}

                  {/* Detected Barcode Success Overlay */}
                  {detectedCode && (
                    <div className="flex flex-col items-center justify-center bg-gray-950/90 backdrop-blur-sm px-4 py-2.5 rounded-xl border border-emerald-400/60 shadow-lg animate-in fade-in zoom-in duration-200">
                      <span className="text-2xl text-emerald-400 font-bold">✓</span>
                      <span className="text-xs font-mono font-black text-emerald-300 tracking-wider mt-0.5">
                        {detectedCode}
                      </span>
                      <span className="text-[10px] text-gray-300 font-medium mt-0.5">
                        {mode === 'batch' ? 'Added to Cart!' : 'Opening details...'}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Top Status Pill */}
            <div className="absolute top-3 left-3 z-10 px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1.5 backdrop-blur-md shadow-md bg-black/60 text-white border border-white/20">
              <span
                className={`inline-block w-2 h-2 rounded-full ${
                  detectedCode ? 'bg-emerald-400 animate-ping' : 'bg-emerald-400 animate-pulse'
                }`}
              />
              <span className="truncate max-w-[150px]">{scannerStatus}</span>
            </div>

            {/* Top Right Controls: Zoom & Torch */}
            <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
              {/* Zoom Toggle Pill (1x / 2x) */}
              {zoomSupported && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    applyZoom(zoomLevel === 1 ? 2 : 1)
                  }}
                  className="px-2 py-1 rounded-full text-[10px] font-extrabold bg-black/60 hover:bg-black/80 text-white border border-white/20 backdrop-blur-md transition-all active:scale-95 cursor-pointer"
                  title="Toggle 1x/2x Zoom"
                >
                  {zoomLevel === 1 ? '1x' : '2x 🔍'}
                </button>
              )}

              {/* Torch Button */}
              {torchSupported && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleTorch()
                  }}
                  className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 backdrop-blur-md shadow-md transition-all active:scale-95 cursor-pointer ${
                    torchOn
                      ? 'bg-amber-400 text-gray-950 font-black ring-2 ring-amber-300'
                      : 'bg-black/60 hover:bg-black/80 text-white border border-white/20'
                  }`}
                  title={torchOn ? 'Turn torch off' : 'Turn torch on'}
                >
                  <span>{torchOn ? '⚡' : '🔦'}</span>
                  <span className="text-[10px]">{torchOn ? 'ON' : 'Torch'}</span>
                </button>
              )}
            </div>

            {/* Bottom In-Viewfinder Camera Shutter for OCR */}
            {tab === 'ocr' && (
              <div className="absolute bottom-3 inset-x-0 z-20 flex justify-center pointer-events-auto">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleSnapOCR()
                  }}
                  disabled={loading}
                  className="px-5 py-2.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 active:scale-95 text-white font-extrabold text-xs shadow-lg flex items-center gap-2 border border-white/30 backdrop-blur-sm cursor-pointer"
                >
                  <span className="text-base">📸</span>
                  <span>{loading ? 'Reading Label...' : 'Snap & Extract Label'}</span>
                </button>
              </div>
            )}

            {/* Multiple Barcodes Selection Overlay */}
            {multipleBarcodes.length > 0 && (
              <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-30 p-4">
                <div className="bg-white rounded-2xl p-4 w-full max-w-sm shadow-2xl">
                  <h3 className="text-sm font-black text-gray-900 mb-3">Multiple Barcodes Detected</h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {multipleBarcodes.map((code, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setMultipleBarcodes([])
                          handleDetectedBarcode(code)
                        }}
                        className="w-full p-3 rounded-xl bg-gray-50 hover:bg-emerald-50 border border-gray-200 hover:border-emerald-300 transition-all text-left cursor-pointer"
                      >
                        <p className="text-xs font-mono font-bold text-gray-900">{code}</p>
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setMultipleBarcodes([])}
                    className="w-full mt-3 px-4 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold text-xs transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="w-64 h-36 border-2 border-dashed border-emerald-400/80 rounded-2xl flex flex-col items-center justify-center relative p-3 overflow-hidden bg-gray-900/40">
            <span className="text-3xl">📷</span>
            <p className="text-xs font-bold text-emerald-300 mt-1">
              {mode === 'batch' ? 'Continuous Barcode Scanner' : 'Live Auto-Detect Barcode'}
            </p>
            <p className="text-[10px] text-gray-400">
              {mode === 'batch' ? 'Scan items rapidly into cart' : 'Instant detection • laser auto-aim'}
            </p>
            <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-emerald-400" />
            <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-emerald-400" />
            <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-emerald-400" />
            <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-emerald-400" />
            <div className="laser-line pointer-events-none" />
          </div>
        )}

        <div className="mt-3 flex items-center gap-2">
          {!cameraActive ? (
            <button
              type="button"
              onClick={startCamera}
              className="px-5 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black text-xs shadow-soft transition-all flex items-center gap-2 cursor-pointer"
            >
              <span>📷</span>
              <span>Open Live Camera</span>
            </button>
          ) : (
            <>
              {availableCameras.length > 1 && (
                <button
                  type="button"
                  onClick={switchCamera}
                  className="px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 bg-gray-800 hover:bg-gray-700 text-white border border-gray-700 cursor-pointer"
                  title={facingMode === 'environment' ? 'Switch to front camera' : 'Switch to rear camera'}
                >
                  <span>{facingMode === 'environment' ? '🔄' : '📷'}</span>
                  <span>{facingMode === 'environment' ? 'Front' : 'Rear'}</span>
                </button>
              )}
              {torchSupported && (
                <button
                  type="button"
                  onClick={toggleTorch}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer ${
                    torchOn
                      ? 'bg-amber-400 text-gray-950 font-black shadow-md'
                      : 'bg-gray-800 hover:bg-gray-700 text-white border border-gray-700'
                  }`}
                  title={torchOn ? 'Turn torch off' : 'Turn torch on'}
                >
                  <span>{torchOn ? '⚡' : '🔦'}</span>
                  <span>{torchOn ? 'Torch ON' : 'Torch'}</span>
                </button>
              )}
              <button
                type="button"
                onClick={stopCamera}
                className="px-4 py-1.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-all active:scale-95 cursor-pointer"
              >
                Close Camera
              </button>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <SafeAreaView>
      <div className="px-5 py-6 pb-28 max-w-md mx-auto">
        <div className="mb-4">
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Scan Food</h1>
          <p className="text-xs text-gray-500 mt-1">
            Barcode scanner, label camera OCR, or manual ingredient breakdown.
          </p>
        </div>

        {/* Multi-Item Plate Recognition Shortcut Banner */}
        <div className="mb-4">
          <button
            type="button"
            onClick={() => navigate('/plate')}
            className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-soft hover:shadow-md transition-all active:scale-[0.99] text-left cursor-pointer"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-2xl shrink-0">🍽️</span>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-200">
                    All-in-One Vision AI
                  </span>
                  <span className="bg-white/20 text-[9px] font-extrabold px-1.5 py-0.2 rounded-full uppercase">
                    New
                  </span>
                </div>
                <p className="text-sm font-bold truncate">Plate & Cooked Meal Scanner</p>
                <p className="text-[11px] text-emerald-100 truncate">
                  AI recognizes items on your plate & counts calories
                </p>
              </div>
            </div>
            <span className="text-lg font-black shrink-0 text-white/80">→</span>
          </button>
        </div>

        {/* Tab Selector */}
        <div className="rounded-2xl bg-gray-100 p-1 grid grid-cols-4 gap-1 mb-5">
          <button
            onClick={() => handleTabChange('barcode')}
            className={`py-2 rounded-xl text-[11px] font-bold transition-all text-center cursor-pointer ${
              tab === 'barcode' ? 'bg-white shadow-card text-gray-900' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            📊 Barcode
          </button>
          <button
            onClick={() => handleTabChange('batch')}
            className={`py-2 rounded-xl text-[11px] font-bold transition-all text-center cursor-pointer ${
              tab === 'batch' ? 'bg-white shadow-card text-emerald-800 font-extrabold' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            🛒 Cart ({batchCount})
          </button>
          <button
            onClick={() => handleTabChange('ocr')}
            className={`py-2 rounded-xl text-[11px] font-bold transition-all text-center cursor-pointer ${
              tab === 'ocr' ? 'bg-white shadow-card text-gray-900' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            📷 OCR
          </button>
          <button
            onClick={() => handleTabChange('text')}
            className={`py-2 rounded-xl text-[11px] font-bold transition-all text-center cursor-pointer ${
              tab === 'text' ? 'bg-white shadow-card text-gray-900' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            📝 Paste
          </button>
        </div>

        {/* TAB 2: CONTINUOUS BATCH SUPERMARKET SCANNER */}
        {tab === 'batch' && (
          <div className="space-y-4">
            <div className="rounded-3xl bg-gradient-to-br from-emerald-700 via-teal-800 to-gray-950 text-white p-5 shadow-soft">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">⚡</span>
                  <div>
                    <h2 className="text-sm font-black tracking-tight">Supermarket Basket Mode</h2>
                    <p className="text-[10px] text-emerald-200 font-medium">Scan consecutive items into Grocery Cart</p>
                  </div>
                </div>
                <button
                  onClick={() => navigate('/cart')}
                  className="rounded-xl bg-white/20 hover:bg-white/30 px-3 py-1 text-xs font-bold text-white transition-all cursor-pointer"
                >
                  View Cart ({batchCount}) →
                </button>
              </div>
            </div>

            {/* Live Camera Viewfinder in Batch Mode */}
            {renderCameraView('batch')}

            {/* Quick Batch Barcode Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleBatchScanSubmit()
              }}
              className="rounded-2xl bg-white shadow-card p-4 border border-gray-100"
            >
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                Scan Barcode to Add to Cart
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={batchCode}
                  onChange={(e) => setBatchCode(e.target.value)}
                  placeholder="e.g. 8901063371040"
                  className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold px-4 py-2.5 text-xs transition-all disabled:opacity-50 cursor-pointer"
                >
                  {loading ? 'Adding...' : '➕ Add'}
                </button>
              </div>
            </form>

            {/* Tap to Quick Add Preset Foods */}
            <div className="rounded-2xl bg-white p-4 border border-gray-100 shadow-card">
              <p className="text-xs font-bold text-gray-700 mb-2">⚡ Tap to Quick Add into Cart:</p>
              <div className="grid grid-cols-2 gap-2">
                {QUICK_SAMPLE_PRESETS.slice(0, 4).map((p) => (
                  <button
                    key={p.barcode}
                    type="button"
                    onClick={() => handleBatchScanSubmit(p.barcode)}
                    disabled={loading}
                    className="p-2.5 text-left rounded-xl bg-gray-50 hover:bg-emerald-50 border border-gray-100 hover:border-emerald-200 transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-lg">{p.icon}</span>
                      <span className="text-xs font-bold text-gray-900 truncate">{p.name}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 1: BARCODE SCANNER */}
        {tab === 'barcode' && (
          <div className="space-y-4">
            {/* Viewfinder simulation & Live Camera */}
            {renderCameraView('single')}

            {/* Barcode Number Search Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleBarcodeSubmit()
              }}
              className="rounded-2xl bg-white shadow-card p-4 border border-gray-100"
            >
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                Enter Barcode Number
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  placeholder="e.g. 8901063371040"
                  className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 text-sm transition-all disabled:opacity-50 cursor-pointer"
                >
                  {loading ? '...' : 'Search'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 2: LABEL PHOTO OCR */}
        {tab === 'ocr' && (
          <div className="space-y-4">
            {/* Live Camera Viewfinder in OCR Mode */}
            {renderCameraView('single')}

            <div className="rounded-2xl bg-white shadow-card p-5 border border-gray-100">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                Or Upload Nutrition / Ingredient Label File
              </label>
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50/70 hover:bg-emerald-50 hover:border-emerald-300 p-8 transition-all">
                <span className="text-4xl mb-2">🖼️</span>
                <span className="text-sm font-bold text-gray-800">
                  {fileName ?? 'Tap to select label photo'}
                </span>
                <span className="text-[11px] text-gray-400 mt-1">
                  JPG, PNG, WEBP up to 10MB
                </span>
                <span className="mt-3 px-4 py-1.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                  Upload & Analyze
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={loading}
                />
              </label>
            </div>
          </div>
        )}

        {/* TAB 3: PASTE TEXT */}
        {tab === 'text' && (
          <form onSubmit={handleTextSubmit} className="rounded-2xl bg-white shadow-card p-4 border border-gray-100 space-y-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Product Name (Optional)
              </label>
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="e.g. Britannia Tiger Biscuits"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Ingredients List
              </label>
              <textarea
                rows={4}
                value={ingredientsText}
                onChange={(e) => setIngredientsText(e.target.value)}
                placeholder="e.g. Refined wheat flour, sugar, palm oil, invert sugar syrup, milk solids, salt, dough conditioner E223, raising agents E500ii, E503ii, emulsifier E322, colour E150d..."
                className="w-full rounded-xl border border-gray-200 bg-gray-50 p-3 text-xs leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gray-900 hover:bg-gray-800 text-white font-bold py-3 text-sm transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Analyzing...' : 'Analyze Ingredients'}
            </button>
          </form>
        )}

        {/* 1-Tap Quick Demo Preset Barcodes */}
        <div className="mt-8">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2.5">
            ⚡ Popular Indian & Global Foods:
          </p>
          <div className="grid grid-cols-2 gap-2">
            {QUICK_SAMPLE_PRESETS.map((p) => (
              <button
                key={p.barcode}
                onClick={() => selectPreset(p.barcode)}
                className="flex items-center gap-2.5 p-2.5 rounded-xl bg-gray-50 hover:bg-white hover:shadow-soft border border-gray-200/80 transition-all text-left cursor-pointer"
              >
                <span className="text-2xl">{p.icon}</span>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-gray-900 truncate">{p.name}</p>
                  <p className="text-[9px] text-gray-400 font-mono truncate">{p.barcode}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </SafeAreaView>
  )
}
