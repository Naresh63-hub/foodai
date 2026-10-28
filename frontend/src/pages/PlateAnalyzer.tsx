import React, { useState, useRef, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import SafeAreaView from '../components/SafeAreaView'
import {
  analyzePlatePhoto,
  saveDailyMealLog,
  saveScanHistory,
  PlateFoodItem,
  PlateAnalysisResult,
} from '../api/food'
import {
  updateItemPortion,
  calculateMealNutritionSummary,
  createCustomFoodItem,
  PORTION_UNITS,
} from '../utils/nutritionMath'
import { useAuth } from '../contexts/AuthContext'
import { useUserPreferences } from '../hooks/useUserPreferences'
import { saveDailyLogToFirestore, saveFoodScanToFirestore } from '../services/firestoreService'

// Sample preset meal plates for instant 1-tap testing
const SAMPLE_PLATE_PRESETS = [
  {
    name: 'Traditional Indian Thali',
    hint: 'Indian Thali with Rice Dal Paneer Salad Roti',
    emoji: '🍱',
    description: 'Basmati rice, moong dal, paneer butter masala, salad & rotis',
    imageUrl: 'https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?w=600&auto=format&fit=crop&q=80',
  },
  {
    name: 'Mediterranean Salmon Platter',
    hint: 'Grilled Salmon Quinoa Steamed Greens Avocado',
    emoji: '🥗',
    description: 'Atlantic salmon fillet, tri-color quinoa, asparagus & avocado',
    imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80',
  },
  {
    name: 'Herb Chicken & Rice Bowl',
    hint: 'Herb Roasted Chicken Breast Basmati Rice Grilled Veggies',
    emoji: '🍛',
    description: 'Roasted chicken breast, basmati rice, grilled zucchini & yogurt dip',
    imageUrl: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=600&auto=format&fit=crop&q=80',
  },
]

export default function PlateAnalyzer() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { values: userPrefs } = useUserPreferences()

  // Capture & Camera states
  const [cameraActive, setCameraActive] = useState(false)
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment')
  const [torchOn, setTorchOn] = useState(false)
  const [torchSupported, setTorchSupported] = useState(true)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [activePreset, setActivePreset] = useState<typeof SAMPLE_PLATE_PRESETS[0] | null>(null)

  // Analysis & Items state
  const [loading, setLoading] = useState(false)
  const [loadingStep, setLoadingStep] = useState('Detecting plate boundary...')
  const [analysisResult, setAnalysisResult] = useState<PlateAnalysisResult | null>(null)
  const [mealName, setMealName] = useState('My Plated Meal')
  const [plateItems, setPlateItems] = useState<PlateFoodItem[]>([])
  const [uncertaintyNotes, setUncertaintyNotes] = useState<string[]>([])

  // Modal / Add item state
  const [showAddItem, setShowAddItem] = useState(false)
  const [newItemName, setNewItemName] = useState('')
  const [newItemQty, setNewItemQty] = useState(1)
  const [newItemUnit, setNewItemUnit] = useState('bowl')
  const [newItemCategory, setNewItemCategory] = useState<'grain' | 'protein' | 'vegetable' | 'curry' | 'dairy' | 'fruit' | 'custom'>('custom')

  // Save state
  const [savingMeal, setSavingMeal] = useState(false)
  const [savedSuccess, setSavedSuccess] = useState(false)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Start live camera stream
  const startCamera = async (mode: 'environment' | 'user' = facingMode) => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
      }
      setCameraActive(true)
      setTorchOn(false)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })
      streamRef.current = stream
      const track = stream.getVideoTracks()[0]
      if (track) {
        const caps = (track.getCapabilities && track.getCapabilities()) as any
        setTorchSupported(caps && 'torch' in caps ? Boolean(caps.torch) : mode === 'environment')
      }
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }
    } catch (err) {
      console.warn('Camera stream error:', err)
      toast.info('Camera unavailable in current environment. You can upload an image or tap a demo plate below!')
      setCameraActive(false)
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      const track = streamRef.current.getVideoTracks()[0]
      if (track && torchOn) {
        try {
          track.applyConstraints({ advanced: [{ torch: false } as any] })
        } catch {}
      }
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    setTorchOn(false)
    setCameraActive(false)
  }

  const toggleTorch = async () => {
    if (!streamRef.current) return
    const track = streamRef.current.getVideoTracks()[0]
    if (!track) return
    try {
      const nextState = !torchOn
      await track.applyConstraints({ advanced: [{ torch: nextState } as any] })
      setTorchOn(nextState)
      toast.success(nextState ? 'Torch ON 🔦' : 'Torch OFF')
    } catch {
      toast.error('Torch not supported on this device/camera')
      setTorchSupported(false)
    }
  }

  const toggleFacingMode = () => {
    const next = facingMode === 'environment' ? 'user' : 'environment'
    setFacingMode(next)
    startCamera(next)
  }

  // Snap photo from video frame
  const handleSnapPhoto = () => {
    if (!videoRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current || document.createElement('canvas')
    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const b64 = canvas.toDataURL('image/jpeg', 0.88)
    setCapturedImage(b64)
    setImageFile(null)
    setActivePreset(null)
    stopCamera()
    toast.success('Plate photograph captured!')
  }

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image file exceeds 10MB limit. Please choose a smaller image.')
      return
    }
    setImageFile(file)
    setActivePreset(null)
    const reader = new FileReader()
    reader.onload = () => {
      setCapturedImage(reader.result as string)
      stopCamera()
    }
    reader.readAsDataURL(file)
  }

  // Select preset sample plate
  const handleSelectPreset = (preset: typeof SAMPLE_PLATE_PRESETS[0]) => {
    stopCamera()
    setActivePreset(preset)
    setImageFile(null)
    setCapturedImage(preset.imageUrl)
    toast.info(`Selected "${preset.name}" sample plate`)
  }

  // Trigger AI Plate Analysis
  const runPlateAnalysis = async () => {
    if (!capturedImage && !activePreset) {
      toast.error('Please snap a photo, upload an image, or pick a sample plate')
      return
    }

    setLoading(true)
    setLoadingStep('Detecting plate boundary...')
    const stepInterval = setInterval(() => {
      setLoadingStep((prev) => {
        if (prev.includes('boundary')) return 'Separating individual food items...'
        if (prev.includes('Separating')) return 'Estimating portions and caloric density...'
        return 'Calculating meal macronutrients...'
      })
    }, 900)

    try {
      const foodHint = activePreset ? activePreset.hint : undefined
      const isExternalUrl = capturedImage && capturedImage.startsWith('http')
      const payloadB64 = capturedImage && !isExternalUrl ? capturedImage : undefined

      const result = await analyzePlatePhoto({
        imageFile: imageFile || undefined,
        image_base64: payloadB64,
        food_hint: foodHint,
        age: userPrefs?.age ? parseInt(userPrefs.age, 10) : undefined,
        weight_kg: userPrefs?.weight ? parseFloat(userPrefs.weight) : undefined,
        health_conditions: userPrefs?.conditions || undefined,
      })

      clearInterval(stepInterval)
      setAnalysisResult(result)
      setMealName(result.meal_name || (activePreset ? activePreset.name : 'Plated Meal'))
      setPlateItems(result.items || [])
      setUncertaintyNotes(result.uncertainty_notes || [])
      setSavedSuccess(false)
      toast.success(`Identified ${result.items?.length || 0} items on plate!`)
    } catch (err: any) {
      clearInterval(stepInterval)
      console.error('Plate analysis error:', err)
      toast.error('Unable to analyze meal plate. Please try another photo.')
    } finally {
      setLoading(false)
    }
  }

  // Reset / Retake
  const handleRetake = () => {
    setCapturedImage(null)
    setImageFile(null)
    setActivePreset(null)
    setAnalysisResult(null)
    setPlateItems([])
    setSavedSuccess(false)
    startCamera()
  }

  // Dynamic combined meal nutrition calculation
  const mealSummary = useMemo(() => {
    return calculateMealNutritionSummary(plateItems)
  }, [plateItems])

  // Portion edit handlers
  const handleUpdateItemQuantity = (id: string, newQty: number) => {
    setPlateItems((prev) =>
      prev.map((item) => (item.id === id ? updateItemPortion(item, newQty, item.portion_unit) : item)),
    )
  }

  const handleUpdateItemUnit = (id: string, newUnit: string) => {
    setPlateItems((prev) =>
      prev.map((item) => (item.id === id ? updateItemPortion(item, item.serving_quantity, newUnit) : item)),
    )
  }

  const handleUpdateItemName = (id: string, newName: string) => {
    setPlateItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, food_name: newName } : item)),
    )
  }

  const handleRemoveItem = (id: string) => {
    const item = plateItems.find((i) => i.id === id)
    setPlateItems((prev) => prev.filter((i) => i.id !== id))
    toast.info(`Removed ${item?.food_name || 'item'} from plate`)
  }

  // Add custom food item
  const handleAddCustomItem = () => {
    if (!newItemName.trim()) {
      toast.error('Please enter a food item name')
      return
    }
    const item = createCustomFoodItem(newItemName.trim(), newItemQty, newItemUnit, newItemCategory)
    setPlateItems((prev) => [...prev, item])
    setNewItemName('')
    setNewItemQty(1)
    setShowAddItem(false)
    toast.success(`Added "${item.food_name}" to plate!`)
  }

  // Save meal to history
  const handleSaveMeal = async () => {
    if (plateItems.length === 0) {
      toast.error('Plate contains no items to save')
      return
    }

    setSavingMeal(true)
    const todayStr = new Date().toISOString().split('T')[0]

    const mealPayload = {
      product_name: mealName || 'Plated Meal',
      meal_type: 'plate',
      portion_g: mealSummary.total_portion_g,
      calories_kcal: mealSummary.calories_kcal,
      carbohydrates_g: mealSummary.carbohydrates_g,
      proteins_g: mealSummary.proteins_g,
      fat_g: mealSummary.fat_g,
      sugars_g: mealSummary.sugars_g.value,
      salt_g: Math.round((mealSummary.sodium_mg.value / 1000) * 100) / 100,
      additives_count: 0,
      processing_level: 'minimally_processed',
      date_key: todayStr,
      items: plateItems,
      uncertainty_notes: uncertaintyNotes,
      overall_confidence: mealSummary.overall_confidence,
    }

    try {
      // 1. Django REST Backend persistence
      try {
        await saveDailyMealLog(mealPayload)
      } catch (backendErr) {
        console.warn('Backend daily meal log notice (saving offline):', backendErr)
      }

      // 2. Scan history record
      try {
        await saveScanHistory({
          food_name: mealName,
          scan_type: 'plate',
          calories_kcal: mealSummary.calories_kcal,
          payload: {
            items_count: plateItems.length,
            items: plateItems.map((it) => ({
              name: it.food_name,
              portion_g: it.portion_g,
              calories: it.calories_kcal,
            })),
          },
        })
      } catch (scanErr) {
        console.warn('Backend scan history notice:', scanErr)
      }

      // 3. Firestore sync if real authenticated Firebase user
      if (user && user.uid && user.uid !== 'local-dev-user') {
        try {
          await saveDailyLogToFirestore({
            id: `plate-${Date.now()}`,
            userId: user.uid,
            productName: mealName,
            portionG: mealSummary.total_portion_g,
            sugarsG: mealSummary.sugars_g.value,
            saltG: Math.round((mealSummary.sodium_mg.value / 1000) * 100) / 100,
            fatG: mealSummary.fat_g,
            additivesCount: 0,
            processingLevel: 'minimally_processed',
            dateKey: todayStr,
            createdAt: new Date().toISOString(),
          })
          await saveFoodScanToFirestore({
            id: `scan-${Date.now()}`,
            userId: user.uid,
            barcode: `plate-${Date.now()}`,
            productName: mealName,
            brands: 'Plated Meal',
            calories: mealSummary.calories_kcal,
            processingLevel: 'minimally_processed',
            score: 85,
            rawPayload: mealPayload,
            createdAt: new Date().toISOString(),
          } as any)
        } catch (fErr) {
          console.warn('Firestore optional sync notice:', fErr)
        }
      }

      // 4. Local storage backup
      try {
        const localLogs = JSON.parse(localStorage.getItem('foodai_daily_logs') || '[]')
        localLogs.unshift({
          ...mealPayload,
          id: `plate-${Date.now()}`,
          timestamp: new Date().toISOString(),
        })
        localStorage.setItem('foodai_daily_logs', JSON.stringify(localLogs.slice(0, 100)))
      } catch {}

      setSavedSuccess(true)
      toast.success('Meal logged successfully to your food diary! 🎉')
    } catch (err: any) {
      console.error('Save meal error:', err)
      toast.error('Failed to save meal.')
    } finally {
      setSavingMeal(false)
    }
  }

  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [])

  return (
    <SafeAreaView>
      <div className="max-w-2xl mx-auto px-4 py-4 pb-28">
        {/* Top Header */}
        <div className="flex items-center justify-between mb-4">
          <Link
            to="/scan"
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-emerald-600 transition-colors"
          >
            <span>←</span> Back to Scanner
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full border border-emerald-200">
              Multi-Item Plate AI
            </span>
          </div>
        </div>

        {/* Page Hero Title */}
        <div className="mb-5">
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <span>Analyze My Plate</span>
            <span className="text-xl">🍽️</span>
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Photograph a plate with multiple food items. AI detects each food independently so you can review portions and track exact nutrition.
          </p>
        </div>

        {/* STEP A: Capture / Upload / Preset Selector */}
        {!analysisResult && (
          <div className="space-y-4">
            {/* Live Camera / Capture Container */}
            <div className="relative rounded-3xl overflow-hidden bg-gray-900 border border-gray-800 shadow-xl aspect-[4/3] flex items-center justify-center">
              {capturedImage ? (
                <div className="relative w-full h-full">
                  <img
                    src={capturedImage}
                    alt="Captured Plate"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                    <span className="text-xs font-medium text-white/90 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full">
                      ✓ Plate Photo Ready
                    </span>
                    <button
                      type="button"
                      onClick={handleRetake}
                      className="text-xs font-bold text-white bg-white/20 hover:bg-white/30 backdrop-blur-md px-3 py-1.5 rounded-full transition-colors"
                    >
                      Retake Photo 🔄
                    </button>
                  </div>
                </div>
              ) : cameraActive ? (
                <div className="relative w-full h-full">
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    autoPlay
                    className="w-full h-full object-cover"
                  />
                  {/* Plate Framing Overlay Guide */}
                  <div className="absolute inset-6 border-2 border-dashed border-white/60 rounded-full pointer-events-none flex items-center justify-center">
                    <span className="text-[11px] font-bold text-white/80 bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm">
                      Align entire plate inside circle
                    </span>
                  </div>

                  {/* Camera Controls Overlay */}
                  <div className="absolute top-3 right-3 flex items-center gap-2">
                    {torchSupported && (
                      <button
                        type="button"
                        onClick={toggleTorch}
                        className={`p-2.5 rounded-full backdrop-blur-md transition-colors ${
                          torchOn ? 'bg-amber-400 text-gray-950 font-bold' : 'bg-black/50 text-white'
                        }`}
                        title="Toggle Flashlight"
                      >
                        🔦
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={toggleFacingMode}
                      className="p-2.5 rounded-full bg-black/50 text-white backdrop-blur-md hover:bg-black/70 transition-colors"
                      title="Flip Camera"
                    >
                      🔄
                    </button>
                  </div>

                  {/* Shutter Button */}
                  <div className="absolute bottom-4 inset-x-0 flex items-center justify-center gap-4">
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="text-xs font-medium text-white/80 bg-black/50 hover:bg-black/70 px-4 py-2 rounded-full backdrop-blur-md"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSnapPhoto}
                      className="w-16 h-16 rounded-full bg-white border-4 border-emerald-500 shadow-xl flex items-center justify-center active:scale-95 transition-transform"
                      aria-label="Take Photo"
                    >
                      <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xl">
                        📸
                      </div>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-6 text-center text-white">
                  <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center text-3xl mb-3">
                    🍱
                  </div>
                  <h3 className="text-base font-bold">Photograph Your Meal Plate</h3>
                  <p className="text-xs text-gray-400 mt-1 max-w-xs">
                    Start live camera, upload an image from your device, or choose a sample plate below.
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-3 mt-4">
                    <button
                      type="button"
                      onClick={() => startCamera()}
                      className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg transition-all"
                    >
                      <span>📸</span> Start Camera
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-4 py-2.5 rounded-xl border border-white/20 transition-all"
                    >
                      <span>📁</span> Upload Photo
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Quick Demo Sample Plates */}
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                Or Tap a Demo Sample Plate:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {SAMPLE_PLATE_PRESETS.map((preset) => {
                  const isSelected = activePreset?.name === preset.name
                  return (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => handleSelectPreset(preset)}
                      className={`text-left p-3 rounded-2xl border transition-all ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50/80 shadow-md ring-2 ring-emerald-500/20'
                          : 'border-gray-200 bg-white hover:border-emerald-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{preset.emoji}</span>
                        <p className="text-xs font-bold text-gray-900 truncate">{preset.name}</p>
                      </div>
                      <p className="text-[10px] text-gray-500 line-clamp-2">{preset.description}</p>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Main Action CTA Button */}
            {(capturedImage || activePreset) && !cameraActive && (
              <button
                type="button"
                onClick={runPlateAnalysis}
                disabled={loading}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-sm shadow-lg shadow-emerald-500/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    <span>{loadingStep}</span>
                  </>
                ) : (
                  <>
                    <span>✨</span>
                    <span>Analyze Plate Items & Nutrition</span>
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {/* LOADING RADAR VIEW */}
        {loading && (
          <div className="my-8 text-center p-8 rounded-3xl bg-white border border-gray-100 shadow-card">
            <div className="relative w-20 h-20 mx-auto mb-4 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
              <div className="w-16 h-16 rounded-full bg-emerald-600 text-white flex items-center justify-center text-2xl shadow-lg">
                🔍
              </div>
            </div>
            <h3 className="text-base font-extrabold text-gray-900 mb-1">Analyzing Meal Plate</h3>
            <p className="text-xs font-medium text-emerald-600 animate-pulse">{loadingStep}</p>
            <p className="text-[11px] text-gray-400 mt-3 max-w-xs mx-auto">
              Extracting individual items, estimating portion sizes, and balancing calories & macros...
            </p>
          </div>
        )}

        {/* STEP B, C, D: RESULTS & INTERACTIVE EDITING */}
        {analysisResult && !loading && (
          <div className="space-y-6 animate-fade-in-up">
            {/* Meal Header Card */}
            <div className="p-4 rounded-3xl bg-white border border-gray-100 shadow-card">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                      {Math.round(mealSummary.overall_confidence * 100)}% Match
                    </span>
                    <span className="text-[10px] text-gray-400 font-medium">
                      {plateItems.length} items detected
                    </span>
                  </div>
                  <input
                    type="text"
                    value={mealName}
                    onChange={(e) => setMealName(e.target.value)}
                    className="text-lg font-black text-gray-900 border-b border-transparent hover:border-gray-300 focus:border-emerald-500 focus:outline-none w-full bg-transparent"
                    placeholder="Meal Plate Name"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleRetake}
                  className="shrink-0 text-xs font-semibold text-gray-500 hover:text-emerald-600 bg-gray-100 hover:bg-emerald-50 px-3 py-1.5 rounded-xl transition-colors"
                >
                  New Scan 📸
                </button>
              </div>

              {/* Uncertainty Notes Warning / Notice */}
              {uncertaintyNotes.length > 0 && (
                <div className="mt-3 p-3 rounded-2xl bg-amber-50/80 border border-amber-200/60 text-amber-900 text-xs">
                  <div className="flex items-center gap-1.5 font-bold mb-1">
                    <span>⚠️</span> Visual Estimation Notice
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-800/90">
                    {uncertaintyNotes.map((note, idx) => (
                      <li key={idx}>{note}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* COMBINED MEAL NUTRITION DASHBOARD */}
            <div className="p-5 rounded-3xl bg-gradient-to-br from-emerald-900 via-teal-900 to-gray-900 text-white shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-[10px] uppercase font-bold tracking-wider text-emerald-300">
                    Total Plate Nutrition
                  </p>
                  <p className="text-3xl font-black tracking-tight mt-0.5">
                    {mealSummary.calories_kcal} <span className="text-base font-normal text-white/80">kcal</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase font-bold tracking-wider text-white/70">
                    Total Weight
                  </p>
                  <p className="text-lg font-bold text-white mt-0.5">
                    {mealSummary.total_portion_g} <span className="text-xs font-normal text-white/70">g</span>
                  </p>
                </div>
              </div>

              {/* Macro Meters */}
              <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-white/10 backdrop-blur-md mb-3">
                <div className="text-center">
                  <span className="text-[10px] font-semibold text-white/70">Protein</span>
                  <p className="text-base font-black">{mealSummary.proteins_g}g</p>
                  <span className="text-[9px] text-emerald-300 font-bold">{mealSummary.macro_ratios.protein_pct}%</span>
                </div>
                <div className="text-center border-x border-white/10">
                  <span className="text-[10px] font-semibold text-white/70">Carbs</span>
                  <p className="text-base font-black">{mealSummary.carbohydrates_g}g</p>
                  <span className="text-[9px] text-amber-300 font-bold">{mealSummary.macro_ratios.carbs_pct}%</span>
                </div>
                <div className="text-center">
                  <span className="text-[10px] font-semibold text-white/70">Fat</span>
                  <p className="text-base font-black">{mealSummary.fat_g}g</p>
                  <span className="text-[9px] text-rose-300 font-bold">{mealSummary.macro_ratios.fat_pct}%</span>
                </div>
              </div>

              {/* Micros / Minor Nutrients with Explicit Missing Handling */}
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2 rounded-xl bg-white/5">
                  <span className="text-[10px] text-white/60 block">Sugar</span>
                  <span className="font-bold">{mealSummary.sugars_g.formatted}</span>
                </div>
                <div className="p-2 rounded-xl bg-white/5">
                  <span className="text-[10px] text-white/60 block">Fiber</span>
                  <span className="font-bold">{mealSummary.fiber_g.formatted}</span>
                </div>
                <div className="p-2 rounded-xl bg-white/5">
                  <span className="text-[10px] text-white/60 block">Sodium</span>
                  <span className="font-bold">{mealSummary.sodium_mg.formatted}</span>
                </div>
              </div>

              {(mealSummary.sugars_g.hasMissing || mealSummary.fiber_g.hasMissing || mealSummary.sodium_mg.hasMissing) && (
                <p className="text-[10px] text-white/60 italic mt-3 text-center">
                  * Asterisk indicates partial estimate; one or more items lack complete manufacturer data.
                </p>
              )}
            </div>

            {/* DETECTED ITEMS EDITABLE LIST */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-extrabold text-gray-900 tracking-tight">
                  Plate Items ({plateItems.length})
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAddItem(true)}
                  className="text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1"
                >
                  <span>+</span> Add Missing Item
                </button>
              </div>

              <div className="space-y-3">
                {plateItems.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className="p-4 rounded-2xl bg-white border border-gray-100 shadow-soft hover:shadow-card transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <input
                            type="text"
                            value={item.food_name}
                            onChange={(e) => handleUpdateItemName(item.id, e.target.value)}
                            className="font-bold text-sm text-gray-900 w-full border-b border-transparent hover:border-gray-200 focus:border-emerald-500 focus:outline-none bg-transparent"
                            aria-label="Food Name"
                          />
                        </div>
                        {item.description && (
                          <p className="text-[11px] text-gray-500">{item.description}</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        className="text-gray-400 hover:text-rose-600 p-1 rounded-lg transition-colors text-xs"
                        title="Remove food item"
                        aria-label={`Remove ${item.food_name}`}
                      >
                        🗑️
                      </button>
                    </div>

                    {/* Quantity & Unit Controls */}
                    <div className="flex flex-wrap items-center gap-2.5 my-2.5 p-2.5 rounded-xl bg-gray-50 border border-gray-100 text-xs">
                      <div className="flex items-center gap-1.5">
                        <label className="text-[11px] font-semibold text-gray-500">Qty:</label>
                        <input
                          type="number"
                          min="0.1"
                          step="0.25"
                          value={item.serving_quantity}
                          onChange={(e) => handleUpdateItemQuantity(item.id, parseFloat(e.target.value) || 1)}
                          className="w-16 px-2 py-1 rounded-lg border border-gray-300 font-bold text-center bg-white"
                          aria-label={`Quantity for ${item.food_name}`}
                        />
                      </div>

                      <div className="flex items-center gap-1.5 flex-1 min-w-[130px]">
                        <label className="text-[11px] font-semibold text-gray-500">Unit:</label>
                        <select
                          value={item.portion_unit}
                          onChange={(e) => handleUpdateItemUnit(item.id, e.target.value)}
                          className="w-full px-2 py-1 rounded-lg border border-gray-300 font-medium bg-white text-xs"
                          aria-label={`Portion unit for ${item.food_name}`}
                        >
                          {PORTION_UNITS.map((u) => (
                            <option key={u.value} value={u.value}>
                              {u.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-lg shrink-0">
                        {item.portion_g}g
                      </span>
                    </div>

                    {/* Item Nutrition Breakdown Chips */}
                    <div className="flex flex-wrap items-center gap-2 text-[11px]">
                      <span className="font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded-md">
                        {item.calories_kcal} kcal
                      </span>
                      <span className="text-gray-600 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-200">
                        P: {item.proteins_g}g
                      </span>
                      <span className="text-gray-600 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-200">
                        C: {item.carbohydrates_g}g
                      </span>
                      <span className="text-gray-600 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-200">
                        F: {item.fat_g}g
                      </span>
                      {item.fiber_g !== null && (
                        <span className="text-gray-500 text-[10px]">Fib: {item.fiber_g}g</span>
                      )}
                      {item.sodium_mg !== null && (
                        <span className="text-gray-500 text-[10px]">Na: {item.sodium_mg}mg</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ADD MISSING ITEM DRAWER / FORM */}
            {showAddItem && (
              <div className="p-4 rounded-3xl bg-emerald-50/60 border border-emerald-200 shadow-soft">
                <h4 className="text-xs font-black text-emerald-950 uppercase tracking-wider mb-2">
                  Add Missing Food Item
                </h4>
                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-bold text-gray-700 block mb-1">
                      Food Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Boiled Egg, Cucumber Salad, Curd"
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-medium focus:border-emerald-500 focus:outline-none bg-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-bold text-gray-700 block mb-1">
                        Quantity
                      </label>
                      <input
                        type="number"
                        min="0.1"
                        step="0.5"
                        value={newItemQty}
                        onChange={(e) => setNewItemQty(parseFloat(e.target.value) || 1)}
                        className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-medium bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-gray-700 block mb-1">
                        Unit
                      </label>
                      <select
                        value={newItemUnit}
                        onChange={(e) => setNewItemUnit(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-medium bg-white"
                      >
                        {PORTION_UNITS.map((u) => (
                          <option key={u.value} value={u.value}>
                            {u.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-gray-700 block mb-1">
                      Category Preset
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {(['grain', 'protein', 'vegetable', 'curry', 'dairy', 'fruit', 'custom'] as const).map(
                        (cat) => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setNewItemCategory(cat)}
                            className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border capitalize transition-all ${
                              newItemCategory === cat
                                ? 'bg-emerald-600 text-white border-emerald-600'
                                : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            {cat}
                          </button>
                        ),
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAddItem(false)}
                      className="px-3 py-1.5 text-xs font-semibold text-gray-600 hover:text-gray-800"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleAddCustomItem}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition-colors"
                    >
                      Add Item
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* SAVE TO FOOD DIARY CTA */}
            {savedSuccess ? (
              <div className="p-4 rounded-3xl bg-emerald-50 border border-emerald-200 text-center animate-fade-in-up">
                <div className="text-2xl mb-1">🎉</div>
                <h4 className="text-sm font-black text-emerald-900">Meal Saved to History!</h4>
                <p className="text-xs text-emerald-700 mt-0.5">
                  Logged {mealSummary.calories_kcal} kcal and {plateItems.length} items to your daily diary.
                </p>
                <div className="flex items-center justify-center gap-2 mt-3">
                  <button
                    type="button"
                    onClick={() => navigate('/history')}
                    className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl transition-colors shadow-sm"
                  >
                    View Diary 📖
                  </button>
                  <button
                    type="button"
                    onClick={handleRetake}
                    className="text-xs font-semibold bg-white border border-emerald-300 text-emerald-800 px-4 py-2 rounded-xl transition-colors"
                  >
                    Scan Another Plate 📸
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleSaveMeal}
                disabled={savingMeal || plateItems.length === 0}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-sm shadow-lg shadow-emerald-500/25 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
              >
                {savingMeal ? (
                  <>
                    <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    <span>Saving to Daily Log...</span>
                  </>
                ) : (
                  <>
                    <span>💾</span>
                    <span>Save Meal to Food Diary ({mealSummary.calories_kcal} kcal)</span>
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </SafeAreaView>
  )
}
