import React, { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { toast } from 'sonner'
import { BrowserMultiFormatReader } from '@zxing/library'
import SafeAreaView from '../components/SafeAreaView'
import { scanBarcode, scanOCR, scanText, searchProducts } from '../api/food'
import { playScanSound } from '../utils/audio'
import { QUICK_SAMPLE_PRESETS } from '../constants'

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

  // Live real-time matched product display state
  const [matchedProduct, setMatchedProduct] = useState<{
    product_name: string
    brands?: string
    barcode: string
    serving_size?: string
    sugarPct?: string
    icon?: string
    category?: string
  } | null>(null)

  const [matchedBatchProduct, setMatchedBatchProduct] = useState<{
    product_name: string
    brands?: string
    barcode: string
    icon?: string
  } | null>(null)

  useEffect(() => {
    tabRef.current = tab
  }, [tab])

  // Live barcode matching when user enters barcode
  useEffect(() => {
    const clean = barcode.trim()
    if (!clean) {
      setMatchedProduct(null)
      return
    }

    // 1. Check instant presets first
    const preset = QUICK_SAMPLE_PRESETS.find(
      (p) => p.barcode === clean || (clean.length >= 6 && p.barcode.includes(clean))
    )
    if (preset) {
      setMatchedProduct({
        product_name: preset.name,
        brands: preset.tag,
        barcode: preset.barcode,
        sugarPct: preset.sugarPct,
        icon: preset.icon,
        category: preset.category,
      })
      return
    }

    // 2. Query catalog if 4 or more digits
    if (clean.length >= 4) {
      const timer = setTimeout(() => {
        searchProducts({ q: clean })
          .then((res) => {
            if (res && res.length > 0) {
              const item = res[0]
              setMatchedProduct({
                product_name: item.product_name,
                brands: item.brands,
                barcode: item.barcode,
                serving_size: item.serving_size,
                icon: '📦',
              })
            } else {
              setMatchedProduct(null)
            }
          })
          .catch(() => setMatchedProduct(null))
      }, 150)
      return () => clearTimeout(timer)
    } else {
      setMatchedProduct(null)
    }
  }, [barcode])

  // Live batch barcode matching
  useEffect(() => {
    const clean = batchCode.trim()
    if (!clean) {
      setMatchedBatchProduct(null)
      return
    }

    const preset = QUICK_SAMPLE_PRESETS.find(
      (p) => p.barcode === clean || (clean.length >= 6 && p.barcode.includes(clean))
    )
    if (preset) {
      setMatchedBatchProduct({
        product_name: preset.name,
        brands: preset.tag,
        barcode: preset.barcode,
        icon: preset.icon,
      })
      return
    }

    if (clean.length >= 4) {
      const timer = setTimeout(() => {
        searchProducts({ q: clean })
          .then((res) => {
            if (res && res.length > 0) {
              const item = res[0]
              setMatchedBatchProduct({
                product_name: item.product_name,
                brands: item.brands,
                barcode: item.barcode,
                icon: '🛒',
              })
            } else {
              setMatchedBatchProduct(null)
            }
          })
          .catch(() => setMatchedBatchProduct(null))
      }, 150)
      return () => clearTimeout(timer)
    } else {
      setMatchedBatchProduct(null)
    }
  }, [batchCode])

  useEffect(() => {
    try {
      const existing = JSON.parse(localStorage.getItem('foodai_grocery_cart') || '[]')
      setBatchCount(existing.length)
    } catch {
      setBatchCount(0)
    }
  }, [])

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

  // Auto-activate camera if permission was previously granted
  useEffect(() => {
    if (permissionStatus === 'granted' && (tab === 'barcode' || tab === 'batch') && !cameraActive) {
      startCamera()
    }
  }, [permissionStatus, tab])

  // Suggest flashlight when light level is low
  useEffect(() => {
    if (lightLevel === 'dark' && cameraActive && !torchOn && torchSupported) {
      toast.info('Low light detected. Consider using the flashlight for better scanning.')
    }
  }, [lightLevel, cameraActive, torchOn, torchSupported])

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

      // Add directly to Grocery Cart
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
      if (err.response?.status === 404) {
        toast.error('Product not found in database. Try manual entry or ingredient scanning.')
      } else if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        toast.error('Connection timeout. Please check your internet connection and try again.')
      } else if (err.response?.status >= 500) {
        toast.error('Server error. Please try again later.')
      } else {
        toast.error(err.response?.data?.detail || 'Product not found in database.')
      }
    } finally {
      setLoading(false)
    }
  }

  // Handle detected barcode from live camera stream
  const handleDetectedBarcode = (rawCode: string) => {
    const code = rawCode.trim()
    if (!code) return

    const now = Date.now()
    // Debounce duplicate reads of the same barcode within 2 seconds
    if (code === lastScannedCodeRef.current && now - lastScannedTimeRef.current < 2000) {
      return
    }
    // Prevent duplicate triggers if already executing a navigation or submit
    if (isProcessingRef.current) {
      return
    }

    lastScannedCodeRef.current = code
    lastScannedTimeRef.current = now

    // Audio & Haptic feedback
    playScanSound()
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate([80, 40, 80])
      } catch {}
    }

    setDetectedCode(code)
    setScannerStatus(`Detected: ${code}`)

    const currentTab = tabRef.current
    if (currentTab === 'batch') {
      // Supermarket Basket Mode: add directly to cart and keep camera live
      toast.success(`Scanned: ${code}`)
      handleBatchScanSubmit(code)
      setTimeout(() => {
        setDetectedCode(null)
        setScannerStatus('Ready for next item')
      }, 1500)
    } else {
      // Single Item Barcode Mode: show visual check, stop camera and navigate
      isProcessingRef.current = true
      setBarcode(code)
      toast.success(`Barcode detected: ${code}`)
      setTimeout(() => {
        stopCamera()
        handleBarcodeSubmit(code)
      }, 400)
    }
  }

  // Light level detection for low light warning
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

  // Live real-time barcode decoding loop
  const startBarcodeScanning = () => {
    if (!videoRef.current) return

    // Clean up any existing detection loop or reader
    if (detectLoopRef.current) {
      cancelAnimationFrame(detectLoopRef.current)
      detectLoopRef.current = null
    }
    if (readerRef.current) {
      try {
        readerRef.current.reset()
      } catch {}
    }

    // Start light level detection interval
    const lightCheckInterval = setInterval(() => {
      if (cameraActive) {
        detectLightLevel()
      }
    }, 1000)

    // 1. Try Native BarcodeDetector API (fastest, hardware accelerated on Chrome/Android/Edge)
    const hasNative = typeof window !== 'undefined' && 'BarcodeDetector' in window
    if (hasNative) {
      try {
        const detector = new (window as any).BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code'],
        })

        let lastCheck = 0
        const detectFrame = async (timestamp: number) => {
          if (!streamRef.current || !videoRef.current) return

          // Throttle checks to ~120ms to keep CPU low and frame rate smooth
          if (timestamp - lastCheck >= 120) {
            lastCheck = timestamp
            if (videoRef.current.readyState >= 2 && !videoRef.current.paused) {
              try {
                const barcodes = await detector.detect(videoRef.current)
                if (barcodes && barcodes.length > 0) {
                  // Handle multiple barcodes
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
              } catch {
                // Ignore transient frame errors
              }
            }
          }

          detectLoopRef.current = requestAnimationFrame(detectFrame)
        }

        detectLoopRef.current = requestAnimationFrame(detectFrame)
        setScannerStatus('Align barcode in frame')
        return () => clearInterval(lightCheckInterval)
      } catch (err) {
        console.warn('Native BarcodeDetector init failed, falling back to ZXing:', err)
        clearInterval(lightCheckInterval)
      }
    }

    // 2. Cross-browser fallback using ZXing BrowserMultiFormatReader (iOS Safari, Firefox, Desktop)
    try {
      if (!readerRef.current) {
        readerRef.current = new BrowserMultiFormatReader()
      }
      readerRef.current.timeBetweenDecodingAttempts = 150
      readerRef.current.decodeFromVideoElementContinuously(videoRef.current, (result) => {
        if (result) {
          const text = result.getText()
          if (text) {
            handleDetectedBarcode(text)
          }
        }
      })
      setScannerStatus('Align barcode in frame')
      return () => clearInterval(lightCheckInterval)
    } catch (err) {
      console.warn('ZXing decoding failed to start:', err)
      setScannerStatus('Position barcode clearly under light')
      clearInterval(lightCheckInterval)
    }
  }

  // Start Live Webcam Video Stream for Barcode Scanner
  const startCamera = async () => {
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
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      })
      streamRef.current = stream

      // Store permission preference
      localStorage.setItem('camera_permission', 'granted')
      setPermissionStatus('granted')

      const track = stream.getVideoTracks()[0]
      if (track) {
        const capabilities = (track.getCapabilities && track.getCapabilities()) as any
        if (capabilities && 'torch' in capabilities) {
          setTorchSupported(Boolean(capabilities.torch))
        } else {
          setTorchSupported(true)
        }
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

      toast.success('Camera activated. Point at barcode!')
    } catch (err: any) {
      console.warn('getUserMedia error:', err)

      // Handle specific error types with user-friendly messages
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
      await track.applyConstraints({
        advanced: [{ torch: nextState } as any],
      })
      setTorchOn(nextState)
      toast.success(nextState ? 'Torch ON 🔦' : 'Torch OFF')
    } catch (err) {
      console.warn('Torch constraint error:', err)
      toast.error('Torch / Flashlight is not supported on this device/camera')
      setTorchSupported(false)
    }
  }

  const switchCamera = async () => {
    if (!cameraActive) return

    const newFacingMode = facingMode === 'environment' ? 'user' : 'environment'
    setFacingMode(newFacingMode)

    // Stop current camera and restart with new facing mode
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

  const handleBarcodeSubmit = async (codeToScan?: string) => {
    const cleanBarcode = (codeToScan || barcode).trim()
    if (!cleanBarcode) {
      toast.error('Please enter a barcode number')
      return
    }

    // Validate barcode format
    if (!/^\d+$/.test(cleanBarcode)) {
      toast.error('Invalid barcode format. Please enter only numbers.')
      return
    }

    if (cleanBarcode.length < 8 || cleanBarcode.length > 14) {
      toast.error('Invalid barcode length. Standard barcodes are 8-14 digits.')
      return
    }

    setLoading(true)
    const { age, weightKg, healthConditions } = getUserPreferences()
    try {
      const result = await scanBarcode(cleanBarcode, age, weightKg, healthConditions)
      playScanSound()
      toast.success(`Identified: ${result.product.product_name}`)
      navigate(`/results/${cleanBarcode}`, { state: { result } })
    } catch (err: any) {
      if (err.response?.status === 404) {
        toast.error('Product not found in database. Try manual entry or ingredient scanning.')
      } else if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        toast.error('Connection timeout. Please check your internet connection and try again.')
      } else if (err.response?.status >= 500) {
        toast.error('Server error. Please try again later.')
      } else {
        toast.error(err.response?.data?.detail || 'Barcode lookup failed. Try photo OCR or paste text below.')
      }
    } finally {
      setLoading(false)
      isProcessingRef.current = false
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setFileName(file.name)
    setLoading(true)
    toast.info('Extracting ingredients with OCR...')
    const { age, weightKg, healthConditions } = getUserPreferences()

    try {
      const ocrResult = await scanOCR(file)
      const extractedText = ocrResult.text || ''

      if (extractedText.trim()) {
        toast.success('Text extracted! Analyzing ingredients...')
        const analysis = await scanText({
          product_name: file.name.replace(/\.[^/.]+$/, ''),
          ingredients_text: extractedText,
          age,
          weight_kg: weightKg,
          health_conditions: healthConditions,
        })
        playScanSound()
        navigate(`/results/ocr-custom`, { state: { result: analysis } })
      } else {
        toast.error('No readable ingredient text found in image.')
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to process image OCR.')
    } finally {
      setLoading(false)
    }
  }

  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ingredientsText.trim()) {
      toast.error('Please paste ingredient text')
      return
    }
    setLoading(true)
    const { age, weightKg, healthConditions } = getUserPreferences()
    try {
      const analysis = await scanText({
        product_name: productName.trim() || 'Custom Food Item',
        ingredients_text: ingredientsText.trim(),
        age,
        weight_kg: weightKg,
        health_conditions: healthConditions,
      })
      playScanSound()
      toast.success('Ingredients analyzed!')
      navigate(`/results/text-custom`, { state: { result: analysis } })
    } catch (err: any) {
      toast.error('Failed to analyze ingredients.')
    } finally {
      setLoading(false)
    }
  }

  const selectPreset = (code: string) => {
    setBarcode(code)
    handleBarcodeSubmit(code)
  }

  const handleTabChange = (newTab: 'barcode' | 'batch' | 'ocr' | 'text') => {
    if (newTab !== tab) {
      if (cameraActive) {
        stopCamera()
      }
      setTab(newTab)
    }
  }

  const renderCameraView = (mode: 'single' | 'batch') => {
    return (
      <div className="relative rounded-3xl bg-gray-950 overflow-hidden text-center text-white p-4 shadow-card border border-gray-800 min-h-[220px] flex flex-col items-center justify-center">
        {cameraActive ? (
          <div className="relative w-full h-56 rounded-2xl overflow-hidden bg-black flex items-center justify-center">
            <video
              ref={videoRef}
              playsInline
              autoPlay
              muted
              className="w-full h-full object-cover"
            />

            {/* Target Reticle / Barcode Scanner Frame */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-4">
              <div
                className={`relative w-64 h-36 border-2 rounded-2xl transition-all duration-300 flex items-center justify-center ${
                  detectedCode
                    ? 'border-emerald-400 bg-emerald-500/20 shadow-[0_0_30px_rgba(52,211,153,0.6)] scale-105'
                    : 'border-emerald-400/70 shadow-[0_0_15px_rgba(16,185,129,0.25)]'
                }`}
              >
                {/* 4 Corner Markers */}
                <div className="absolute -top-1 -left-1 w-4 h-4 border-t-4 border-l-4 border-emerald-400 rounded-tl-sm" />
                <div className="absolute -top-1 -right-1 w-4 h-4 border-t-4 border-r-4 border-emerald-400 rounded-tr-sm" />
                <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-4 border-l-4 border-emerald-400 rounded-bl-sm" />
                <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-4 border-r-4 border-emerald-400 rounded-br-sm" />

                {/* Animated Laser Scan Line */}
                {!detectedCode && (
                  <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#34d399] animate-pulse pointer-events-none top-1/2 -translate-y-1/2" />
                )}

                {/* Detected Barcode Success Overlay */}
                {detectedCode && (
                  <div className="flex flex-col items-center justify-center bg-gray-950/85 backdrop-blur-sm px-4 py-2.5 rounded-xl border border-emerald-400/50 shadow-lg animate-in fade-in zoom-in duration-200">
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
            </div>

            {/* Top Status Pill */}
            <div className="absolute top-2.5 left-2.5 z-10 px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1.5 backdrop-blur-md shadow-md bg-black/60 text-white border border-white/20">
              <span
                className={`inline-block w-2 h-2 rounded-full ${
                  detectedCode ? 'bg-emerald-400 animate-ping' : 'bg-emerald-400 animate-pulse'
                }`}
              />
              <span className="truncate max-w-[170px]">{scannerStatus}</span>
            </div>

            {/* Floating Torch / Flashlight Button on Viewport */}
            {torchSupported && (
              <button
                type="button"
                onClick={toggleTorch}
                className={`absolute top-2.5 right-2.5 z-10 px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 backdrop-blur-md shadow-md transition-all active:scale-95 ${
                  torchOn
                    ? 'bg-amber-400 text-gray-950 font-black ring-2 ring-amber-300'
                    : 'bg-black/60 hover:bg-black/80 text-white border border-white/20'
                }`}
                title={torchOn ? 'Turn torch off' : 'Turn torch on'}
              >
                <span>{torchOn ? '⚡' : '🔦'}</span>
                <span className="text-[11px]">{torchOn ? 'Torch ON' : 'Torch'}</span>
              </button>
            )}

            {/* Camera Switch Button (when multiple cameras available) */}
            {availableCameras.length > 1 && (
              <button
                type="button"
                onClick={switchCamera}
                className="absolute top-2.5 left-2.5 z-10 px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 backdrop-blur-md shadow-md transition-all active:scale-95 bg-black/60 hover:bg-black/80 text-white border border-white/20"
                title={facingMode === 'environment' ? 'Switch to front camera' : 'Switch to rear camera'}
              >
                <span>{facingMode === 'environment' ? '🔄' : '📷'}</span>
                <span className="text-[11px]">{facingMode === 'environment' ? 'Front' : 'Rear'}</span>
              </button>
            )}

            {/* Multiple Barcodes Selection Overlay */}
            {multipleBarcodes.length > 0 && (
              <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-20 p-4">
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
                        className="w-full p-3 rounded-xl bg-gray-50 hover:bg-emerald-50 border border-gray-200 hover:border-emerald-300 transition-all text-left"
                      >
                        <p className="text-xs font-mono font-bold text-gray-900">{code}</p>
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setMultipleBarcodes([])}
                    className="w-full mt-3 px-4 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold text-xs transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="w-56 h-32 border-2 border-dashed border-emerald-400/80 rounded-2xl flex flex-col items-center justify-center relative p-3 overflow-hidden bg-gray-900/40">
            <span className="text-3xl">📷</span>
            <p className="text-[11px] font-semibold text-emerald-300 mt-1">
              {mode === 'batch' ? 'Continuous Barcode Scanner' : 'Live Auto-Detect Barcode'}
            </p>
            <p className="text-[9px] text-gray-400">
              {mode === 'batch' ? 'Scan items rapidly into cart' : 'Point camera to detect automatically'}
            </p>
            <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-emerald-400" />
            <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-emerald-400" />
            <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-emerald-400" />
            <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-emerald-400" />
            <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_8px_#34d399] animate-pulse pointer-events-none top-1/2" />
          </div>
        )}

        <div className="mt-3 flex items-center gap-2">
          {!cameraActive ? (
            <button
              type="button"
              onClick={startCamera}
              className="px-5 py-2 rounded-full bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs shadow-soft transition-all flex items-center gap-1.5"
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
                  className="px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 bg-gray-800 hover:bg-gray-700 text-white border border-gray-700"
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
                  className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 ${
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
                className="px-4 py-1.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-all active:scale-95"
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
      <div className="px-4 sm:px-5 py-6 pb-36 max-w-md mx-auto w-full box-border">
        <div className="mb-5">
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Scan Food</h1>
          <p className="text-xs text-gray-500 mt-1">
            Barcode scanner, label camera OCR, or manual ingredient breakdown.
          </p>
        </div>

        {/* AI Food Intelligence Shortcuts */}
        <div className="mb-4 grid grid-cols-2 gap-2">
          <Link
            to="/camera-snap"
            className="flex items-center gap-2 p-3 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 text-emerald-950 shadow-sm hover:border-emerald-400 transition-all text-left overflow-hidden min-w-0"
          >
            <span className="text-2xl shrink-0">📸</span>
            <div className="min-w-0">
              <p className="text-xs font-black leading-tight truncate">Snap Food Photo</p>
              <p className="text-[10px] text-emerald-700 truncate">Gemini Camera AI</p>
            </div>
          </Link>
          <Link
            to="/ai-nutrition"
            className="flex items-center gap-2 p-3 rounded-2xl bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 text-purple-950 shadow-sm hover:border-purple-400 transition-all text-left overflow-hidden min-w-0"
          >
            <span className="text-2xl shrink-0">✨</span>
            <div className="min-w-0">
              <p className="text-xs font-black leading-tight truncate">AI Nutrition</p>
              <p className="text-[10px] text-purple-700 truncate">Type any meal</p>
            </div>
          </Link>
        </div>

        {/* Tab Selector */}
        <div className="rounded-2xl bg-gray-100 p-1 grid grid-cols-4 gap-1 mb-5 overflow-hidden">
          <button
            onClick={() => handleTabChange('barcode')}
            className={`py-2 px-1 rounded-xl text-[11px] font-bold transition-all text-center truncate ${
              tab === 'barcode' ? 'bg-white shadow-card text-gray-900' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            📊 Barcode
          </button>
          <button
            onClick={() => handleTabChange('batch')}
            className={`py-2 px-1 rounded-xl text-[11px] font-bold transition-all text-center truncate ${
              tab === 'batch' ? 'bg-white shadow-card text-emerald-800 font-extrabold' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            🛒 Cart ({batchCount})
          </button>
          <button
            onClick={() => handleTabChange('ocr')}
            className={`py-2 px-1 rounded-xl text-[11px] font-bold transition-all text-center truncate ${
              tab === 'ocr' ? 'bg-white shadow-card text-gray-900' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            📷 OCR
          </button>
          <button
            onClick={() => handleTabChange('text')}
            className={`py-2 px-1 rounded-xl text-[11px] font-bold transition-all text-center truncate ${
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
                  className="rounded-xl bg-white/20 hover:bg-white/30 px-3 py-1 text-xs font-bold text-white transition-all"
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
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold px-4 py-2.5 text-xs transition-all disabled:opacity-50"
                >
                  {loading ? 'Adding...' : '➕ Add'}
                </button>
              </div>

              {/* Real-Time Identified Batch Product Card */}
              {matchedBatchProduct && (
                <div className="mt-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between animate-fadeIn">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">{matchedBatchProduct.icon || '🛒'}</span>
                    <div>
                      <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                        Product Identified
                      </span>
                      <p className="text-xs font-black text-gray-900 leading-tight">
                        {matchedBatchProduct.product_name}
                      </p>
                      {matchedBatchProduct.brands && (
                        <p className="text-[11px] text-gray-500 font-medium">
                          {matchedBatchProduct.brands}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleBatchScanSubmit(matchedBatchProduct.barcode)}
                    disabled={loading}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shrink-0"
                  >
                    Add Now
                  </button>
                </div>
              )}
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
                    className="p-2.5 text-left rounded-xl bg-gray-50 hover:bg-emerald-50 border border-gray-100 hover:border-emerald-200 transition-all"
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
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 text-sm transition-all disabled:opacity-50"
                >
                  {loading ? '...' : 'Search'}
                </button>
              </div>

              {/* Real-Time Identified Product Name Card */}
              {matchedProduct ? (
                <div className="mt-3.5 p-3.5 rounded-2xl bg-gradient-to-br from-emerald-50 via-teal-50 to-white p-4 border-2 border-emerald-300 shadow-sm animate-fadeIn">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-600 text-white tracking-wider">
                      ✓ Product Identified
                    </span>
                    <span className="font-mono text-[10px] font-bold text-gray-500 bg-white px-2 py-0.5 rounded-md border border-gray-200">
                      #{matchedProduct.barcode}
                    </span>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="text-3xl p-2 rounded-2xl bg-white border border-emerald-100 shadow-xs shrink-0">
                      {matchedProduct.icon || '📦'}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">
                        Scanned Product Name:
                      </p>
                      <h3 className="text-base font-black text-gray-900 leading-tight">
                        {matchedProduct.product_name}
                      </h3>
                      <p className="text-xs text-gray-600 font-semibold mt-0.5">
                        {matchedProduct.brands ? `Brand: ${matchedProduct.brands}` : 'Verified Food'}{' '}
                        {matchedProduct.serving_size ? `· ${matchedProduct.serving_size}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3.5 pt-2.5 border-t border-emerald-100 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-emerald-800 font-bold">
                      Ready to analyze ingredients & health score
                    </span>
                    <button
                      type="button"
                      onClick={() => handleBarcodeSubmit(matchedProduct.barcode)}
                      disabled={loading}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-soft transition-all active:scale-95 flex items-center gap-1 shrink-0"
                    >
                      <span>Analyze</span>
                      <span>→</span>
                    </button>
                  </div>
                </div>
              ) : barcode.trim().length >= 4 ? (
                <div className="mt-2.5 flex items-center justify-between text-xs text-gray-500 px-1">
                  <span>Searching for barcode {barcode.trim()}...</span>
                  <button
                    type="button"
                    onClick={() => handleBarcodeSubmit()}
                    className="font-bold text-emerald-700 hover:underline"
                  >
                    Run Search ➔
                  </button>
                </div>
              ) : null}
            </form>
          </div>
        )}

        {/* TAB 2: LABEL PHOTO OCR */}
        {tab === 'ocr' && (
          <div className="rounded-2xl bg-white shadow-card p-5 border border-gray-100">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
              Upload Nutrition or Ingredient Label Photo
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
                Run OCR Text Extraction
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
              className="w-full rounded-xl bg-gray-900 hover:bg-gray-800 text-white font-bold py-3 text-sm transition-all disabled:opacity-50"
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
                className="flex items-center gap-2.5 p-2.5 rounded-xl bg-gray-50 hover:bg-white hover:shadow-soft border border-gray-200/80 transition-all text-left"
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
