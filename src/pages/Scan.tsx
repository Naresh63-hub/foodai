import React, { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { toast } from 'sonner'
import type { BrowserMultiFormatReader } from '@zxing/library'
import SafeAreaView from '../components/SafeAreaView'
import { scanBarcode, scanOCR, scanText, analyzeCareProduct, analyzeMedicine } from '../api/food'
import { CareAnalysisResult, MedicineAnalysisResult } from '../types/food'
import CareResultsCard from '../components/CareResultsCard'
import MedicineInteractionCard from '../components/MedicineInteractionCard'
import SymptomTriageModal from '../components/SymptomTriageModal'
import { playScanSound } from '../utils/audio'
import { QUICK_SAMPLE_PRESETS } from '../constants'
import demoProductsData from '../constants/demoProducts.json'

const demoProducts = demoProductsData as Record<string, any>

const CARE_PRESETS = [
  {
    name: 'Dove Beauty Moisture Bar',
    category: 'soap' as const,
    ingredients: 'Sodium Lauroyl Isethionate, Stearic Acid, Lauric Acid, Sodium Palmitate, Aqua, Sodium Isethionate, Sodium Stearate, Cocamidopropyl Betaine, Sodium Palm Kernelate, Glycerin, Parfum, Sodium Chloride, Zinc Oxide, Tetrasodium EDTA, CI 77891',
    icon: '🧼',
    desc: 'Mild syndet cleanser bar with glycerin',
  },
  {
    name: 'Nivea Soft Light Moisturiser',
    category: 'cream' as const,
    ingredients: 'Aqua, Glycerin, Paraffinum Liquidum, Myristyl Alcohol, Butylene Glycol, Alcohol Denat, Stearic Acid, Myristyl Myristate, Cera Microcristallina, Glyceryl Stearate, Simmondsia Chinensis Seed Oil, Tocopheryl Acetate, Dimethicone, Phenoxyethanol, Parfum',
    icon: '🧴',
    desc: 'Light daily face & body cream with Jojoba oil',
  },
  {
    name: 'Clarifying Sulfate Shampoo',
    category: 'shampoo' as const,
    ingredients: 'Water, Sodium Laureth Sulfate (SLES), Sodium Lauryl Sulfate (SLS), Cocamidopropyl Betaine, Sodium Chloride, Fragrance, DMDM Hydantoin, Methylparaben, Propylparaben, Citric Acid, Tetrasodium EDTA',
    icon: '🫧',
    desc: 'High-cleansing shampoo with SLS & parabens',
  },
  {
    name: 'Gentle Hydrating Cleanser',
    category: 'facewash' as const,
    ingredients: 'Aqua, Glycerin, Cetearyl Alcohol, Ceramide NP, Ceramide AP, Ceramide EOP, Phytosphingosine, Cholesterol, Hyaluronic Acid, Niacinamide, Xanthan Gum, Phenoxyethanol',
    icon: '✨',
    desc: 'Barrier-repairing ceramide cleanser (non-comedogenic)',
  },
]

const MEDICINE_PRESETS = [
  {
    name: 'Dolo 650',
    food: 'Tea, Coffee, Alcohol',
    icon: '💊',
    desc: 'Paracetamol 650mg • Fever & Pain',
  },
  {
    name: 'Pan 40 (Pantoprazole)',
    food: 'Heavy breakfast, coffee',
    icon: '🛡️',
    desc: 'Pantoprazole 40mg • Acidity & GERD',
  },
  {
    name: 'Cetirizine 10mg',
    food: 'Alcohol, sedative beverages',
    icon: '🌿',
    desc: 'Cetirizine HCl • Allergy & Cold',
  },
  {
    name: 'Amoxicillin 500mg',
    food: 'Milk, Curd, Dairy products',
    icon: '🦠',
    desc: 'Antibiotic • Bacterial Infection',
  },
  {
    name: 'Atorvastatin 20mg',
    food: 'Grapefruit juice, high-fat feast',
    icon: '❤️',
    desc: 'Atorvastatin • Cholesterol Control',
  },
]

const CARE_BARCODE_PRESETS = [
  {
    name: 'Dove Beauty Moisture Bar',
    code: '8901030382348',
    icon: '🧼',
    desc: 'Mild syndet bar with glycerin & zinc oxide',
  },
  {
    name: 'Nivea Soft Light Moisturiser',
    code: '4005900108990',
    icon: '🧴',
    desc: 'Light daily cream with Jojoba oil & Vit E',
  },
  {
    name: 'Pears Pure & Gentle Soap',
    code: '8901030612148',
    icon: '✨',
    desc: 'Pure glycerin soap with natural oils',
  },
  {
    name: 'Dettol Original Germ Protection',
    code: '8901207010415',
    icon: '🛡️',
    desc: 'Chloroxylenol antibacterial cleansing bar',
  },
  {
    name: 'Dove Intense Repair Shampoo',
    code: '8901030383727',
    icon: '🫧',
    desc: 'Fiber active keratin repair shampoo',
  },
]

const MEDICINE_BARCODE_PRESETS = [
  {
    name: 'Dolo 650 Tablets',
    code: '8901117002014',
    icon: '💊',
    desc: 'Paracetamol 650mg • Antipyretic & Analgesic',
  },
  {
    name: 'Pan 40 Gastro-Resistant',
    code: '8901043003001',
    icon: '🛡️',
    desc: 'Pantoprazole 40mg • Acid Reflux & GERD',
  },
  {
    name: 'Augmentin 625 Duo',
    code: '8901148211028',
    icon: '🦠',
    desc: 'Amoxicillin + Clavulanic Acid • Antibiotic',
  },
  {
    name: 'Cetcip 10mg (Cetirizine)',
    code: '8901120014028',
    icon: '🌿',
    desc: 'Cetirizine HCl • Anti-allergy & Rhinitis',
  },
  {
    name: 'Atorva 20mg (Atorvastatin)',
    code: '8901117180019',
    icon: '❤️',
    desc: 'Atorvastatin • Lipid & Cholesterol Control',
  },
]

export default function Scan() {
  const navigate = useNavigate()
  const location = useLocation()
  const initialCategory = (location.state as any)?.categoryMode || 'food'
  const initialTab = (location.state as any)?.tab
  const [categoryMode, setCategoryMode] = useState<'food' | 'care' | 'medicine'>(initialCategory)
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

  // Care & Cosmetics State
  const [careTab, setCareTab] = useState<'barcode' | 'ocr' | 'text'>('barcode')
  const [careBarcode, setCareBarcode] = useState('')
  const [careProductName, setCareProductName] = useState('')
  const [careIngredients, setCareIngredients] = useState('')
  const [careCategory, setCareCategory] = useState<'soap' | 'cream' | 'shampoo' | 'lotion' | 'facewash' | 'other'>('cream')
  const [skinType, setSkinType] = useState<string>('normal')
  const [careResult, setCareResult] = useState<CareAnalysisResult | null>(null)

  // Medicine & Doctor Prep State
  const [medicineTab, setMedicineTab] = useState<'ocr' | 'barcode' | 'text'>('ocr')
  const [medicineBarcode, setMedicineBarcode] = useState('')
  const [medicineName, setMedicineName] = useState('')
  const [recentFoodQuery, setRecentFoodQuery] = useState('')
  const [medicineResult, setMedicineResult] = useState<MedicineAnalysisResult | null>(null)
  const [showSymptomModal, setShowSymptomModal] = useState(false)
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
  const categoryModeRef = useRef(categoryMode)
  const careTabRef = useRef(careTab)
  const medicineTabRef = useRef(medicineTab)
  const lightIntervalRef = useRef<any>(null)

  useEffect(() => {
    tabRef.current = tab
  }, [tab])

  useEffect(() => {
    categoryModeRef.current = categoryMode
  }, [categoryMode])

  useEffect(() => {
    careTabRef.current = careTab
  }, [careTab])

  useEffect(() => {
    medicineTabRef.current = medicineTab
  }, [medicineTab])

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

    const currentMode = categoryModeRef.current
    if (currentMode === 'care') {
      isProcessingRef.current = true
      setCareBarcode(code)
      toast.success(`Care barcode detected: ${code}`)
      setTimeout(() => {
        stopCamera()
        handleCareBarcodeSubmit(code)
      }, 350)
      return
    }

    if (currentMode === 'medicine') {
      isProcessingRef.current = true
      setMedicineBarcode(code)
      toast.success(`Medicine barcode detected: ${code}`)
      setTimeout(() => {
        stopCamera()
        handleMedicineBarcodeSubmit(code)
      }, 350)
      return
    }

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
    const shouldAutoStart =
      permissionStatus === 'granted' &&
      !cameraActive &&
      ((categoryMode === 'food' && (tab === 'barcode' || tab === 'batch')) ||
        (categoryMode === 'care' && (careTab === 'barcode' || careTab === 'ocr')) ||
        (categoryMode === 'medicine' && (medicineTab === 'barcode' || medicineTab === 'ocr')))
    if (shouldAutoStart) {
      startCamera()
    }
  }, [permissionStatus, tab, categoryMode, careTab, medicineTab, cameraActive])

  // Stop camera if user switches to a manual text tab
  useEffect(() => {
    if (
      (categoryMode === 'food' && tab === 'text') ||
      (categoryMode === 'care' && careTab === 'text') ||
      (categoryMode === 'medicine' && medicineTab === 'text')
    ) {
      if (cameraActive) {
        stopCamera()
      }
    }
  }, [categoryMode, tab, careTab, medicineTab, cameraActive])

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

    const currentMode = categoryModeRef.current
    if (currentMode === 'care') {
      toast.info('Extracting cosmetic ingredients from label...')
    } else if (currentMode === 'medicine') {
      toast.info('Extracting medication strip details...')
    } else {
      toast.info('Extracting nutrition label text...')
    }
    setLoading(true)

    canvas.toBlob(
      async (blob) => {
        if (!blob) {
          setLoading(false)
          return
        }
        const file = new File([blob], 'label_scan.jpg', { type: 'image/jpeg' })

        if (currentMode === 'care') {
          try {
            const ocrRes = await scanOCR(file)
            const extractedText = ocrRes?.text || ''
            if (extractedText.trim()) {
              setCareIngredients(extractedText)
              const res = await analyzeCareProduct({
                product_name: careProductName.trim() || 'Scanned Care Product',
                ingredients_text: extractedText,
                category: careCategory,
                skin_type: skinType,
              })
              stopCamera()
              setCareResult(res)
              playScanSound()
              toast.success(`Analysis ready for ${res.product_name}`)
            } else {
              toast.error('No readable text found on packaging. Please hold camera closer.')
            }
          } catch (err: any) {
            toast.error(err.response?.data?.detail || 'Unable to read ingredients from label.')
          } finally {
            setLoading(false)
          }
          return
        }

        if (currentMode === 'medicine') {
          try {
            const ocrRes = await scanOCR(file)
            const extractedText = ocrRes?.text || ''
            if (extractedText.trim()) {
              setMedicineName(extractedText)
              const res = await analyzeMedicine({
                medicine_name: extractedText,
                recent_food: recentFoodQuery,
              })
              stopCamera()
              setMedicineResult(res)
              playScanSound()
              toast.success(`Identified: ${res.medicine_name}`)
            } else {
              toast.error('No readable text found on medication strip. Hold camera closer.')
            }
          } catch (err: any) {
            toast.error(err.response?.data?.detail || 'Unable to identify medication from photo.')
          } finally {
            setLoading(false)
          }
          return
        }

        // Food mode
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

    const currentMode = categoryModeRef.current

    if (currentMode === 'care') {
      try {
        const ocrRes = await scanOCR(file)
        const extractedText = ocrRes?.text || ''
        if (extractedText.trim()) {
          setCareIngredients(extractedText)
          const res = await analyzeCareProduct({
            product_name: careProductName.trim() || file.name.replace(/\.[^/.]+$/, ''),
            ingredients_text: extractedText,
            category: careCategory,
            skin_type: skinType,
          })
          playScanSound()
          setCareResult(res)
          toast.success(`Analyzed ingredients from ${file.name}`)
        } else {
          toast.error('No readable ingredients found in this image.')
        }
      } catch (err: any) {
        toast.error(err.response?.data?.detail || 'Care OCR failed. Please try a clearer picture.')
      } finally {
        setLoading(false)
      }
      return
    }

    if (currentMode === 'medicine') {
      try {
        const ocrRes = await scanOCR(file)
        const extractedText = ocrRes?.text || ''
        if (extractedText.trim()) {
          setMedicineName(extractedText)
          const res = await analyzeMedicine({
            medicine_name: extractedText,
            recent_food: recentFoodQuery,
          })
          playScanSound()
          setMedicineResult(res)
          toast.success(`Identified medicine from ${file.name}`)
        } else {
          toast.error('No readable medication text found in this image.')
        }
      } catch (err: any) {
        toast.error(err.response?.data?.detail || 'Medicine OCR failed. Please try a clearer picture.')
      } finally {
        setLoading(false)
      }
      return
    }

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

  const handleCareSubmit = async (
    e?: React.FormEvent,
    presetData?: { name: string; ingredients: string; category?: any }
  ) => {
    if (e) e.preventDefault()
    const nameToUse = presetData?.name || careProductName.trim()
    const ingToUse = presetData?.ingredients || careIngredients.trim()
    const catToUse = presetData?.category || careCategory

    if (!ingToUse) {
      toast.error('Please enter ingredient list')
      return
    }

    setLoading(true)
    try {
      const res = await analyzeCareProduct({
        product_name: nameToUse || 'Cosmetic / Care Product',
        ingredients_text: ingToUse,
        category: catToUse,
        skin_type: skinType,
      })
      setCareResult(res)
      playScanSound()
      toast.success('Cosmetic & Care analysis complete!')
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Care analysis failed. Try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleMedicineSubmit = async (
    e?: React.FormEvent,
    presetData?: { name: string; food?: string }
  ) => {
    if (e) e.preventDefault()
    const nameToUse = presetData?.name || medicineName.trim()
    const foodToUse = presetData?.food !== undefined ? presetData.food : recentFoodQuery.trim()

    if (!nameToUse) {
      toast.error('Please enter tablet or syrup name')
      return
    }

    setLoading(true)
    try {
      const res = await analyzeMedicine({
        medicine_name: nameToUse,
        recent_food_eaten: foodToUse,
      })
      setMedicineResult(res)
      playScanSound()
      toast.success('Medicine guidance & food interactions retrieved!')
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Medicine lookup failed. Try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleCareBarcodeSubmit = async (codeToScan?: string) => {
    const cleanCode = (codeToScan || careBarcode).trim()
    if (!cleanCode) {
      toast.error('Please enter a barcode number')
      return
    }
    setLoading(true)
    try {
      const res = await analyzeCareProduct({ barcode: cleanCode, skin_type: skinType })
      setCareResult(res)
      playScanSound()
      toast.success(`Identified: ${res.product_name}`)
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Product barcode lookup failed. Try manual entry.')
    } finally {
      setLoading(false)
    }
  }

  const handleMedicineBarcodeSubmit = async (codeToScan?: string) => {
    const cleanCode = (codeToScan || medicineBarcode).trim()
    if (!cleanCode) {
      toast.error('Please enter a medicine barcode')
      return
    }
    setLoading(true)
    try {
      const res = await analyzeMedicine({ barcode: cleanCode, recent_food: recentFoodQuery })
      setMedicineResult(res)
      playScanSound()
      toast.success(`Identified: ${res.medicine_name}`)
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Medicine barcode lookup failed. Try search by name.')
    } finally {
      setLoading(false)
    }
  }

  const renderCameraView = (mode: 'single' | 'batch') => {
    const isOcrActive =
      (categoryMode === 'food' && tab === 'ocr') ||
      (categoryMode === 'care' && careTab === 'ocr') ||
      (categoryMode === 'medicine' && medicineTab === 'ocr')

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
              {isOcrActive ? (
                /* OCR Document / Nutrition Label Frame */
                <div className="relative w-72 h-48 border-2 border-dashed border-emerald-400/90 rounded-2xl flex flex-col items-center justify-between p-3 bg-black/20 backdrop-blur-[1px] shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                  <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-400/60 text-[10px] font-black tracking-wide text-emerald-300">
                    <span>{categoryMode === 'medicine' ? '💊' : categoryMode === 'care' ? '🧴' : '📋'}</span>
                    <span>
                      {categoryMode === 'medicine'
                        ? 'ALIGN TABLET STRIP / PACKAGING'
                        : categoryMode === 'care'
                        ? 'ALIGN COSMETIC INGREDIENT LIST'
                        : 'ALIGN NUTRITION FACTS OR INGREDIENTS'}
                    </span>
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
                  className="px-2 py-1 rounded-full text-[10px] font-extrabold bg-black/60 hover:bg-black/80 text-white border border-white/20 backdrop-blur-md transition-all active:scale-95"
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
                  className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 backdrop-blur-md shadow-md transition-all active:scale-95 ${
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
            {isOcrActive && (
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
                  <span>
                    {loading
                      ? 'Reading Label...'
                      : categoryMode === 'care'
                      ? 'Snap & Analyze Packaging'
                      : categoryMode === 'medicine'
                      ? 'Snap & Identify Medication'
                      : 'Snap & Extract Label'}
                  </span>
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
                        className="w-full p-3 rounded-xl bg-gray-50 hover:bg-emerald-50 border border-gray-200 hover:border-emerald-300 transition-all text-left"
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
              {categoryMode === 'care'
                ? 'Care Product Scanner'
                : categoryMode === 'medicine'
                ? 'Medicine Scanner'
                : mode === 'batch'
                ? 'Continuous Barcode Scanner'
                : 'Live Auto-Detect Barcode'}
            </p>
            <p className="text-[10px] text-gray-400">
              {categoryMode === 'care'
                ? 'Instant INCI hazard & clean score check'
                : categoryMode === 'medicine'
                ? 'Instant food conflict & pharmacology check'
                : mode === 'batch'
                ? 'Scan items rapidly into cart'
                : 'Instant detection • laser auto-aim'}
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
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">
            {categoryMode === 'food' && 'Scan Food'}
            {categoryMode === 'care' && 'Care & Cosmetics'}
            {categoryMode === 'medicine' && 'Medicine & Interactions'}
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            {categoryMode === 'food' && 'Barcode scanner, label camera OCR, or manual ingredient breakdown.'}
            {categoryMode === 'care' && 'Clean score, endocrine disruptors, comedogenic pore ratings & clean swaps.'}
            {categoryMode === 'medicine' && 'Active chemical salts, meal timing rules, food conflicts & Jan Aushadhi generic alternatives.'}
          </p>
        </div>

        {/* Universal Mode Selector: Food | Care & Soaps | Medicine */}
        <div className="flex rounded-2xl bg-gray-100 p-1 mb-5 shadow-xs">
          <button
            type="button"
            onClick={() => setCategoryMode('food')}
            className={`flex-1 py-2 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              categoryMode === 'food'
                ? 'bg-white text-emerald-800 shadow-sm'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <span>🥗</span>
            <span>Food</span>
          </button>
          <button
            type="button"
            onClick={() => setCategoryMode('care')}
            className={`flex-1 py-2 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              categoryMode === 'care'
                ? 'bg-white text-teal-800 shadow-sm'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <span>🧴</span>
            <span>Care & Soaps</span>
          </button>
          <button
            type="button"
            onClick={() => setCategoryMode('medicine')}
            className={`flex-1 py-2 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              categoryMode === 'medicine'
                ? 'bg-white text-indigo-800 shadow-sm'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <span>💊</span>
            <span>Medicine</span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* MODE 1: FOOD SCANNER */}
        {/* ========================================================================= */}
        {categoryMode === 'food' && (
          <>
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
                {renderCameraView('single')}

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
          </>
        )}

        {/* ========================================================================= */}
        {/* MODE 2: PERSONAL CARE & COSMETICS */}
        {/* ========================================================================= */}
        {categoryMode === 'care' && (
          <div className="space-y-4">
            {careResult ? (
              <CareResultsCard data={careResult} onReset={() => setCareResult(null)} />
            ) : (
              <>
                {/* Sub-tabs for Care: Barcode | Label Photo (OCR) | Manual */}
                <div className="flex rounded-2xl bg-gray-100 p-1 shadow-xs">
                  <button
                    type="button"
                    onClick={() => setCareTab('barcode')}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      careTab === 'barcode'
                        ? 'bg-white text-teal-800 shadow-sm font-black'
                        : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    <span>📊 Barcode</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCareTab('ocr')}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      careTab === 'ocr'
                        ? 'bg-white text-teal-800 shadow-sm font-black'
                        : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    <span>📷 Label Photo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCareTab('text')}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      careTab === 'text'
                        ? 'bg-white text-teal-800 shadow-sm font-black'
                        : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    <span>📝 Manual / INCI</span>
                  </button>
                </div>

                {/* Sub-tab 1: Barcode Scan */}
                {careTab === 'barcode' && (
                  <div className="space-y-4">
                    {renderCameraView('single')}

                    <form
                      onSubmit={(e) => {
                        e.preventDefault()
                        handleCareBarcodeSubmit()
                      }}
                      className="rounded-2xl bg-white shadow-card p-4 border border-gray-100"
                    >
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                        Enter Care Product Barcode
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={careBarcode}
                          onChange={(e) => setCareBarcode(e.target.value)}
                          placeholder="e.g. 8901030382348"
                          className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                        <button
                          type="submit"
                          disabled={loading || !careBarcode.trim()}
                          className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-soft disabled:opacity-50 transition-all cursor-pointer"
                        >
                          {loading ? 'Searching...' : 'Lookup'}
                        </button>
                      </div>
                    </form>

                    {/* Instant Barcode Demos */}
                    <div className="mt-4">
                      <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                        ⚡ Curated Barcode Presets (Dove, Nivea, Pears, Dettol):
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {CARE_BARCODE_PRESETS.map((p) => (
                          <button
                            key={p.code}
                            type="button"
                            onClick={() => {
                              setCareBarcode(p.code)
                              handleCareBarcodeSubmit(p.code)
                            }}
                            disabled={loading}
                            className="flex flex-col text-left p-2.5 rounded-2xl bg-white hover:bg-teal-50/50 border border-gray-200/80 hover:border-teal-300 shadow-xs transition-all cursor-pointer"
                          >
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className="text-lg">{p.icon}</span>
                              <span className="text-xs font-bold text-gray-900 truncate">{p.name}</span>
                            </div>
                            <span className="text-[10px] font-mono text-teal-700 font-bold">{p.code}</span>
                            <p className="text-[10px] text-gray-500 line-clamp-1">{p.desc}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Sub-tab 2: Label Photo OCR */}
                {careTab === 'ocr' && (
                  <div className="space-y-4">
                    {renderCameraView('single')}

                    <div className="rounded-2xl bg-white shadow-card p-5 border border-gray-100 text-center">
                      <span className="text-3xl block mb-2">🧴</span>
                      <h3 className="text-xs font-extrabold uppercase tracking-wider text-gray-800 mb-1">
                        Scan Cosmetic Packaging or Upload Photo
                      </h3>
                      <p className="text-[11px] text-gray-500 mb-3 max-w-xs mx-auto">
                        Snap the ingredient list (INCI) on the back of your bottle, tube, or soap box.
                      </p>
                      <label className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 text-xs font-bold hover:bg-teal-100 transition-all cursor-pointer">
                        <span>📁 Choose Label Photo</span>
                        <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                      </label>
                    </div>
                  </div>
                )}

                {/* Sub-tab 3: Manual / INCI */}
                {careTab === 'text' && (
                  <div className="space-y-4">
                    <form
                      onSubmit={handleCareSubmit}
                      className="rounded-3xl bg-white shadow-card p-5 border border-gray-100 space-y-4"
                    >
                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                          Product Name (Optional)
                        </label>
                        <input
                          type="text"
                          value={careProductName}
                          onChange={(e) => setCareProductName(e.target.value)}
                          placeholder="e.g. Dove Beauty Bar, Nivea Moisturiser..."
                          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                          Product Category
                        </label>
                        <div className="grid grid-cols-3 gap-1.5">
                          {[
                            { id: 'soap', label: '🧼 Soap / Bar' },
                            { id: 'cream', label: '🧴 Cream' },
                            { id: 'shampoo', label: '🫧 Shampoo' },
                            { id: 'facewash', label: '✨ Facewash' },
                            { id: 'lotion', label: '💧 Lotion' },
                            { id: 'other', label: '📦 Other' },
                          ].map((cat) => (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => setCareCategory(cat.id as any)}
                              className={`py-2 px-2 rounded-xl text-xs font-bold transition-all border text-center cursor-pointer ${
                                careCategory === cat.id
                                  ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                                  : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                              }`}
                            >
                              {cat.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                          Target Skin Type
                        </label>
                        <div className="grid grid-cols-4 gap-1.5">
                          {['normal', 'oily', 'dry', 'sensitive'].map((st) => (
                            <button
                              key={st}
                              type="button"
                              onClick={() => setSkinType(st)}
                              className={`py-1.5 rounded-xl text-xs font-bold capitalize transition-all border text-center cursor-pointer ${
                                skinType === st
                                  ? 'bg-teal-50 text-teal-800 border-teal-300 font-extrabold'
                                  : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
                              }`}
                            >
                              {st}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                          Ingredients (INCI List)
                        </label>
                        <textarea
                          rows={4}
                          value={careIngredients}
                          onChange={(e) => setCareIngredients(e.target.value)}
                          placeholder="e.g. Aqua, Glycerin, Sodium Laureth Sulfate, Cocamidopropyl Betaine, Methylparaben, Dimethicone, Parfum..."
                          className="w-full rounded-xl border border-gray-200 bg-gray-50 p-3 text-xs leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
                        />
                        <p className="text-[10px] text-gray-400 mt-1">
                          Paste full ingredient list from packaging label.
                        </p>
                      </div>

                      <button
                        type="submit"
                        disabled={loading || !careIngredients.trim()}
                        className="w-full rounded-2xl bg-teal-600 hover:bg-teal-700 active:scale-95 text-white font-black py-3 text-sm transition-all disabled:opacity-50 shadow-soft cursor-pointer"
                      >
                        {loading ? 'Evaluating INCI Chemicals...' : 'Analyze Clean Score & Hazards'}
                      </button>
                    </form>

                    {/* 1-Tap Quick Sample Presets for Personal Care */}
                    <div className="mt-4">
                      <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2.5">
                        ⚡ Instant Care Demos:
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {CARE_PRESETS.map((p) => (
                          <button
                            key={p.name}
                            type="button"
                            onClick={() => {
                              setCareProductName(p.name)
                              setCareCategory(p.category)
                              setCareIngredients(p.ingredients)
                              handleCareSubmit(undefined, p)
                            }}
                            disabled={loading}
                            className="flex flex-col text-left p-3 rounded-2xl bg-white hover:bg-teal-50/50 border border-gray-200/80 hover:border-teal-300 shadow-xs transition-all cursor-pointer"
                          >
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className="text-xl">{p.icon}</span>
                              <span className="text-xs font-bold text-gray-900 truncate">{p.name}</span>
                            </div>
                            <p className="text-[10px] text-gray-500 line-clamp-2">{p.desc}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODE 3: MEDICINE & FOOD INTERACTIONS */}
        {/* ========================================================================= */}
        {categoryMode === 'medicine' && (
          <div className="space-y-4">
            {/* Doctor Prep & Clinical Checklist Shortcut Banner */}
            <button
              type="button"
              onClick={() => setShowSymptomModal(true)}
              className="w-full flex items-center justify-between p-4 rounded-3xl bg-gradient-to-r from-blue-700 via-indigo-700 to-indigo-900 text-white shadow-soft hover:shadow-md transition-all active:scale-[0.99] text-left cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-3xl shrink-0">🩺</span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-blue-200">
                      Safe Clinical Prep
                    </span>
                    <span className="bg-white/20 text-[9px] font-black px-1.5 py-0.2 rounded-full uppercase">
                      Zero Diagnosis
                    </span>
                  </div>
                  <p className="text-sm font-black truncate">Doctor Visit Preparation & Triage</p>
                  <p className="text-[11px] text-blue-100 truncate">
                    Question checklist, home comfort care & emergency red flags
                  </p>
                </div>
              </div>
              <span className="text-xl font-black shrink-0 text-white/80">→</span>
            </button>

            {medicineResult ? (
              <MedicineInteractionCard data={medicineResult} onReset={() => setMedicineResult(null)} />
            ) : (
              <>
                {/* Sub-tabs for Medicine: Strip Photo (OCR) | Barcode | Search / Salt */}
                <div className="flex rounded-2xl bg-gray-100 p-1 shadow-xs">
                  <button
                    type="button"
                    onClick={() => setMedicineTab('ocr')}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      medicineTab === 'ocr'
                        ? 'bg-white text-indigo-800 shadow-sm font-black'
                        : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    <span>📷 Strip Photo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMedicineTab('barcode')}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      medicineTab === 'barcode'
                        ? 'bg-white text-indigo-800 shadow-sm font-black'
                        : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    <span>📊 Barcode</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMedicineTab('text')}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      medicineTab === 'text'
                        ? 'bg-white text-indigo-800 shadow-sm font-black'
                        : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    <span>📝 Search / Salt</span>
                  </button>
                </div>

                {/* Sub-tab 1: Strip Photo OCR */}
                {medicineTab === 'ocr' && (
                  <div className="space-y-4">
                    {renderCameraView('single')}

                    <div className="rounded-2xl bg-white shadow-card p-5 border border-gray-100 text-center">
                      <span className="text-3xl block mb-2">💊</span>
                      <h3 className="text-xs font-extrabold uppercase tracking-wider text-gray-800 mb-1">
                        Scan Tablet Strip or Syrup Packaging
                      </h3>
                      <p className="text-[11px] text-gray-500 mb-3 max-w-xs mx-auto">
                        Hold blister pack, tablet strip, or syrup label in focus under good lighting.
                      </p>
                      <label className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs font-bold hover:bg-indigo-100 transition-all cursor-pointer">
                        <span>📁 Choose Strip Photo</span>
                        <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                      </label>
                    </div>
                  </div>
                )}

                {/* Sub-tab 2: Barcode Scan */}
                {medicineTab === 'barcode' && (
                  <div className="space-y-4">
                    {renderCameraView('single')}

                    <form
                      onSubmit={(e) => {
                        e.preventDefault()
                        handleMedicineBarcodeSubmit()
                      }}
                      className="rounded-2xl bg-white shadow-card p-4 border border-gray-100"
                    >
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                        Enter Medicine Barcode Number
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={medicineBarcode}
                          onChange={(e) => setMedicineBarcode(e.target.value)}
                          placeholder="e.g. 8901117002014"
                          className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <button
                          type="submit"
                          disabled={loading || !medicineBarcode.trim()}
                          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-soft disabled:opacity-50 transition-all cursor-pointer"
                        >
                          {loading ? 'Searching...' : 'Lookup'}
                        </button>
                      </div>
                    </form>

                    {/* Curated Medicine Barcodes */}
                    <div className="mt-4">
                      <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                        ⚡ Curated Medicine Barcodes (Dolo, Pan 40, Augmentin):
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {MEDICINE_BARCODE_PRESETS.map((p) => (
                          <button
                            key={p.code}
                            type="button"
                            onClick={() => {
                              setMedicineBarcode(p.code)
                              handleMedicineBarcodeSubmit(p.code)
                            }}
                            disabled={loading}
                            className="flex flex-col text-left p-2.5 rounded-2xl bg-white hover:bg-indigo-50/50 border border-gray-200/80 hover:border-indigo-300 shadow-xs transition-all cursor-pointer"
                          >
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className="text-lg">{p.icon}</span>
                              <span className="text-xs font-bold text-gray-900 truncate">{p.name}</span>
                            </div>
                            <span className="text-[10px] font-mono text-indigo-700 font-bold">{p.code}</span>
                            <p className="text-[10px] text-gray-500 line-clamp-1">{p.desc}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Sub-tab 3: Search / Salt */}
                {medicineTab === 'text' && (
                  <div className="space-y-4">
                    <form
                      onSubmit={handleMedicineSubmit}
                      className="rounded-3xl bg-white shadow-card p-5 border border-gray-100 space-y-4"
                    >
                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                          Medicine / Tablet / Syrup Name
                        </label>
                        <input
                          type="text"
                          value={medicineName}
                          onChange={(e) => setMedicineName(e.target.value)}
                          placeholder="e.g. Dolo 650, Pan 40, Amoxicillin, Cetirizine..."
                          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                          Recent Food / Drink Eaten (Optional)
                        </label>
                        <input
                          type="text"
                          value={recentFoodQuery}
                          onChange={(e) => setRecentFoodQuery(e.target.value)}
                          placeholder="e.g. Milk, Curd, Coffee, Grapefruit, Alcohol..."
                          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <p className="text-[10px] text-gray-400 mt-1">
                          We check if this food blocks drug absorption or risks toxicity.
                        </p>
                      </div>

                      <button
                        type="submit"
                        disabled={loading || !medicineName.trim()}
                        className="w-full rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-black py-3 text-sm transition-all disabled:opacity-50 shadow-soft cursor-pointer"
                      >
                        {loading ? 'Checking Pharmacology Rules...' : 'Check Food Conflicts & Meal Timing'}
                      </button>
                    </form>

                    {/* 1-Tap Quick Sample Presets for Medicines */}
                    <div className="mt-4">
                      <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2.5">
                        ⚡ Common Medicines & Food Conflicts:
                      </p>
                      <div className="grid grid-cols-1 gap-2">
                        {MEDICINE_PRESETS.map((p) => (
                          <button
                            key={p.name}
                            type="button"
                            onClick={() => {
                              setMedicineName(p.name)
                              setRecentFoodQuery(p.food)
                              handleMedicineSubmit(undefined, p)
                            }}
                            disabled={loading}
                            className="flex items-center justify-between p-3 rounded-2xl bg-white hover:bg-indigo-50/50 border border-gray-200/80 hover:border-indigo-300 shadow-xs transition-all text-left cursor-pointer"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="text-2xl shrink-0">{p.icon}</span>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-gray-900 truncate">{p.name}</p>
                                <p className="text-[10px] text-gray-500 truncate">{p.desc}</p>
                              </div>
                            </div>
                            <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg shrink-0">
                              {p.food ? `vs ${p.food}` : 'Inspect'}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Clinical Safety & Regulatory Banner */}
                <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200/60 text-blue-900 text-[11px] leading-relaxed">
                  <span className="font-bold">⚕️ Clinical Disclaimer:</span> FoodAI provides nutritional and chemical safety information for educational reference. It does not replace professional medical judgment, diagnosis, or prescription.
                </div>
              </>
            )}
          </div>
        )}

        {/* Doctor Visit Prep / Symptom Triage Modal */}
        <SymptomTriageModal
          isOpen={showSymptomModal}
          onClose={() => setShowSymptomModal(false)}
        />
      </div>
    </SafeAreaView>
  )
}
