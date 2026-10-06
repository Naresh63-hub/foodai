import React, { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import SafeAreaView from '../components/SafeAreaView'
import { analyzeFoodPhoto, FoodVisionAnalysisResult } from '../api/food'
import { useAuth } from '../contexts/AuthContext'
import { useUserPreferences } from '../hooks/useUserPreferences'
import { saveFoodScanToFirestore, saveDailyLogToFirestore } from '../services/firestoreService'
import { DailyFoodLogItem } from '../types/food'
import { SkeletonNutritionOverview } from '../components/Skeleton'

// Sample preset meal photos for quick 1-tap testing
const SAMPLE_MEAL_PRESETS = [
  {
    name: 'Grilled Salmon Quinoa Bowl',
    emoji: '🥗',
    url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80',
    description: 'Fresh salmon with quinoa, avocado & greens',
  },
  {
    name: 'Chicken Rice Platter',
    emoji: '🍛',
    url: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=600&auto=format&fit=crop&q=80',
    description: 'Basmati rice with roasted chicken & herbs',
  },
  {
    name: 'Berry Smoothie Bowl',
    emoji: '🥣',
    url: 'https://images.unsplash.com/photo-1590301157890-4810ed352733?w=600&auto=format&fit=crop&q=80',
    description: 'Acai, chia seeds, bananas & blueberries',
  },
]

export default function FoodCameraSnap() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { values: userPrefs } = useUserPreferences()

  const [cameraActive, setCameraActive] = useState(false)
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment')
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [analysis, setAnalysis] = useState<FoodVisionAnalysisResult | null>(null)
  const [savedToCloud, setSavedToCloud] = useState(false)
  const [loggedToTracker, setLoggedToTracker] = useState(false)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Start Camera Stream
  const startCamera = async (mode: 'environment' | 'user' = facingMode) => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
      }
      setCameraActive(true)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }
    } catch (err: any) {
      console.warn('Camera stream error:', err)
      toast.info('Camera unavailable in current environment. You can upload or tap demo photos below!')
      setCameraActive(false)
    }
  }

  // Stop Camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    setCameraActive(false)
  }

  useEffect(() => {
    startCamera()
    return () => {
      stopCamera()
    }
  }, [])

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
    const base64Data = canvas.toDataURL('image/jpeg', 0.85)
    setCapturedImage(base64Data)
    stopCamera()
    toast.success('Food photo snapped!')
  }

  // Switch camera front/back
  const handleToggleFacingMode = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment'
    setFacingMode(nextMode)
    startCamera(nextMode)
  }

  // File upload from gallery
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setCapturedImage(reader.result as string)
      stopCamera()
    }
    reader.readAsDataURL(file)
  }

  // Pick demo preset image
  const handleSelectPreset = async (url: string) => {
    try {
      setLoading(true)
      const res = await fetch(url)
      const blob = await res.blob()
      const reader = new FileReader()
      reader.onload = () => {
        setCapturedImage(reader.result as string)
        stopCamera()
        setLoading(false)
      }
      reader.readAsDataURL(blob)
    } catch {
      setLoading(false)
      toast.error('Failed to load preset photo')
    }
  }

  // Send photo to Gemini Vision API
  const handleAnalyzePhoto = async () => {
    if (!capturedImage) {
      toast.error('Please snap or upload a food photo first.')
      return
    }

    setLoading(true)
    setSavedToCloud(false)
    setLoggedToTracker(false)

    try {
      const result = await analyzeFoodPhoto({
        image_base64: capturedImage,
        mime_type: 'image/jpeg',
        age: userPrefs.age ? parseInt(userPrefs.age, 10) : null,
        weight_kg: userPrefs.weight ? parseFloat(userPrefs.weight) : null,
        health_conditions: userPrefs.conditions,
      })

      setAnalysis(result)
      toast.success(`Recognized: ${result.food_name}!`)

      // Auto-save to Firestore if user is authenticated
      if (user?.uid) {
        try {
          const scanId = `snap_${Date.now()}`
          await saveFoodScanToFirestore({
            id: scanId,
            userId: user.uid,
            foodName: result.food_name,
            caloriesKcal: result.calories_kcal,
            servingDescription: result.serving_description,
            servingWeightG: result.serving_weight_g,
            macros: result.macros,
            healthScore: result.health_score,
            processingLevel: result.processing_level,
            glycemicImpact: result.glycemic_impact,
            ingredients: result.recognized_ingredients,
            imageUrl: capturedImage.length < 4000 ? capturedImage : undefined,
            createdAt: new Date().toISOString(),
          })
          setSavedToCloud(true)
        } catch (saveErr) {
          console.warn('Firestore auto-save notice:', saveErr)
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to analyze food photo with Gemini.')
    } finally {
      setLoading(false)
    }
  }

  // Retake photo
  const handleRetake = () => {
    setCapturedImage(null)
    setAnalysis(null)
    setSavedToCloud(false)
    setLoggedToTracker(false)
    startCamera()
  }

  // Save to 24-hr daily intake tracker
  const handleLogToTracker = async () => {
    if (!analysis) return
    const todayKey = `foodai_daily_log_${new Date().toISOString().split('T')[0]}`
    const saltG = parseFloat(((analysis.macros.sodium_mg || 0) / 400).toFixed(2))

    const newItem: DailyFoodLogItem = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      product_name: analysis.food_name,
      portion_g: analysis.serving_weight_g || 150,
      sugars_g: analysis.macros.sugars_g || 0,
      salt_g: saltG,
      fat_g: analysis.macros.saturated_fat_g || analysis.macros.fat_g || 0,
      additives_count: analysis.processing_level === 'Ultra-Processed' ? 2 : 0,
      processing_level: analysis.processing_level.toLowerCase().replace(/[\s-]/g, '_'),
    }

    try {
      const existing: DailyFoodLogItem[] = JSON.parse(localStorage.getItem(todayKey) || '[]')
      existing.unshift(newItem)
      localStorage.setItem(todayKey, JSON.stringify(existing))

      // Persist to Firestore if user logged in
      if (user?.uid) {
        await saveDailyLogToFirestore({
          id: newItem.id,
          userId: user.uid,
          productName: newItem.product_name,
          portionG: newItem.portion_g,
          sugarsG: newItem.sugars_g,
          saltG: newItem.salt_g,
          fatG: newItem.fat_g,
          additivesCount: newItem.additives_count,
          processingLevel: newItem.processing_level,
          dateKey: todayKey,
          createdAt: newItem.timestamp,
        })
      }

      setLoggedToTracker(true)
      toast.success(`Logged ${analysis.calories_kcal} kcal to today's Daily Tracker!`, {
        action: {
          label: 'View Tracker',
          onClick: () => navigate('/tracker'),
        },
      })
    } catch {
      toast.error('Failed to log to tracker')
    }
  }

  return (
    <SafeAreaView>
      <div className="px-4 sm:px-5 py-6 pb-36 max-w-md mx-auto w-full box-border">
        {/* Top Navigation */}
        <div className="flex items-center justify-between mb-4">
          <Link
            to="/scan"
            className="flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-gray-900 bg-white border border-gray-200 rounded-full px-3 py-1 shadow-sm transition-all"
          >
            <span>←</span>
            <span>Back</span>
          </Link>
          <div className="flex items-center gap-1.5">
            <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1">
              <span>📷</span>
              <span>Gemini Vision</span>
            </span>
            {user && (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                ☁️ Cloud Synced
              </span>
            )}
          </div>
        </div>

        {/* Title */}
        <div className="mb-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200 mb-1.5">
            <span>📸</span>
            <span>Food Camera & Calorie Estimator</span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-tight">
            Snap Food to Analyze
          </h1>
          <p className="mt-1 text-xs text-gray-600 leading-relaxed">
            Point your camera at any meal, snack, or recipe to recognize individual ingredients and calculate calories with Gemini Vision AI.
          </p>
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
        />
        <canvas ref={canvasRef} className="hidden" />

        {/* CAMERA VIEWPORT OR PHOTO PREVIEW */}
        {!capturedImage ? (
          <div className="relative rounded-3xl overflow-hidden bg-black aspect-[4/3] shadow-soft border-2 border-emerald-500/30 flex items-center justify-center mb-5">
            {cameraActive ? (
              <>
                <video
                  ref={videoRef}
                  playsInline
                  autoPlay
                  muted
                  className="w-full h-full object-cover"
                />

                {/* Viewfinder Target Overlay */}
                <div className="absolute inset-0 pointer-events-none p-6 flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <div className="w-8 h-8 border-t-4 border-l-4 border-emerald-400 rounded-tl-xl" />
                    <div className="px-3 py-1 bg-black/60 backdrop-blur-md rounded-full text-[10px] text-white font-bold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span>Align meal in frame</span>
                    </div>
                    <div className="w-8 h-8 border-t-4 border-r-4 border-emerald-400 rounded-tr-xl" />
                  </div>
                  <div className="flex justify-between items-end">
                    <div className="w-8 h-8 border-b-4 border-l-4 border-emerald-400 rounded-bl-xl" />
                    <div className="w-8 h-8 border-b-4 border-r-4 border-emerald-400 rounded-br-xl" />
                  </div>
                </div>

                {/* Camera Control Toolbar */}
                <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-6 px-6">
                  {/* Gallery Button */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-11 h-11 rounded-full bg-black/50 backdrop-blur-md text-white text-lg flex items-center justify-center border border-white/20 active:scale-95 transition-all"
                    title="Upload photo"
                  >
                    🖼️
                  </button>

                  {/* Shutter Button */}
                  <button
                    onClick={handleSnapPhoto}
                    className="w-18 h-18 rounded-full border-4 border-white bg-emerald-500 hover:bg-emerald-600 active:scale-90 flex items-center justify-center shadow-lg transition-all"
                    title="Snap Photo"
                  >
                    <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-xl">
                      📸
                    </div>
                  </button>

                  {/* Switch Front/Back Camera */}
                  <button
                    onClick={handleToggleFacingMode}
                    className="w-11 h-11 rounded-full bg-black/50 backdrop-blur-md text-white text-lg flex items-center justify-center border border-white/20 active:scale-95 transition-all"
                    title="Flip Camera"
                  >
                    🔄
                  </button>
                </div>
              </>
            ) : (
              <div className="p-6 text-center text-white space-y-3">
                <span className="text-4xl">📷</span>
                <p className="text-xs font-bold text-gray-200">
                  Camera inactive or unavailable
                </p>
                <div className="flex items-center justify-center gap-2 pt-1">
                  <button
                    onClick={() => startCamera()}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white shadow-sm"
                  >
                    Restart Camera
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-xs font-bold text-white shadow-sm"
                  >
                    Upload Photo
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Captured Photo Preview Card */
          <div className="rounded-3xl overflow-hidden bg-white shadow-soft border border-gray-100 mb-5">
            <div className="relative aspect-[4/3] bg-black">
              <img
                src={capturedImage}
                alt="Captured Food"
                className="w-full h-full object-cover"
              />
              <div className="absolute top-3 right-3 flex items-center gap-2">
                <button
                  onClick={handleRetake}
                  className="px-3 py-1.5 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md text-white text-xs font-bold flex items-center gap-1 transition-all"
                >
                  <span>🔄</span>
                  <span>Retake</span>
                </button>
              </div>
            </div>

            {/* Analyze Action Bar */}
            {!analysis && (
              <div className="p-4 bg-gray-50 flex items-center justify-between gap-3">
                <div className="text-left">
                  <p className="text-xs font-extrabold text-gray-800">Photo Ready</p>
                  <p className="text-[10px] text-gray-500">Tap to analyze ingredients & calories</p>
                </div>
                <button
                  onClick={handleAnalyzePhoto}
                  disabled={loading}
                  className="py-3 px-5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 active:scale-[0.98] disabled:opacity-50 text-white text-xs font-extrabold shadow-soft flex items-center gap-2 transition-all"
                >
                  {loading ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>Analyzing Vision...</span>
                    </>
                  ) : (
                    <>
                      <span>✨</span>
                      <span>Analyze with Gemini</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* DEMO MEAL PHOTO PRESETS (if no photo captured yet) */}
        {!capturedImage && !analysis && (
          <div className="mb-6 p-4 rounded-3xl bg-white shadow-card border border-gray-100">
            <p className="text-xs font-extrabold uppercase tracking-wider text-gray-700 mb-2.5 flex items-center gap-1.5">
              <span>⚡</span>
              <span>Or tap a sample meal photo:</span>
            </p>
            <div className="grid grid-cols-3 gap-2">
              {SAMPLE_MEAL_PRESETS.map((p) => (
                <button
                  key={p.name}
                  onClick={() => handleSelectPreset(p.url)}
                  className="group relative rounded-2xl overflow-hidden aspect-square border border-gray-100 hover:border-emerald-400 active:scale-95 transition-all text-left shadow-sm"
                >
                  <img
                    src={p.url}
                    alt={p.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-2 flex flex-col justify-end text-white">
                    <span className="text-base">{p.emoji}</span>
                    <p className="text-[10px] font-black leading-tight line-clamp-2">
                      {p.name}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* LOADING STATE */}
        {loading && (
          <div className="space-y-4 mb-5">
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200/80 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center text-sm shrink-0 animate-spin">
                ⏳
              </div>
              <div>
                <h3 className="text-xs font-black text-emerald-900">
                  Gemini Vision Inspecting Meal...
                </h3>
                <p className="text-[11px] text-emerald-700">
                  Recognizing ingredients, estimating portion weights & analyzing calories
                </p>
              </div>
            </div>
            <SkeletonNutritionOverview />
          </div>
        )}

        {/* GEMINI VISION ANALYSIS RESULTS */}
        {analysis && !loading && (
          <div className="space-y-4">
            {/* Title & Calories Card */}
            <div className="p-5 rounded-3xl bg-white shadow-soft border border-gray-100">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                    <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                      ✓ {analysis.confidence_score}% Visual Match
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                      {analysis.processing_level}
                    </span>
                  </div>
                  <h2 className="text-xl font-black text-gray-900 leading-tight">
                    {analysis.food_name}
                  </h2>
                  <p className="text-xs text-gray-500 font-medium mt-0.5">
                    Estimated Serving: {analysis.serving_description}
                  </p>
                </div>

                {/* Health Score Ring */}
                <div className="flex flex-col items-center justify-center w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 shadow-sm shrink-0">
                  <span className="text-2xl font-black leading-none">{analysis.health_score}</span>
                  <span className="text-[9px] font-extrabold uppercase mt-0.5">Health</span>
                </div>
              </div>

              {/* Big Calorie Box */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-extrabold text-emerald-900 uppercase tracking-wider">
                    Total Estimated Energy
                  </p>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-3xl font-black text-emerald-800">
                      {analysis.calories_kcal}
                    </span>
                    <span className="text-sm font-bold text-emerald-700">kcal</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-gray-600 block">
                    Macro Calorie Split
                  </span>
                  <span className="text-xs font-black text-gray-800">
                    {analysis.macro_ratios.carbs_pct}% C • {analysis.macro_ratios.protein_pct}% P • {analysis.macro_ratios.fat_pct}% F
                  </span>
                </div>
              </div>

              {/* Macro Bars */}
              <div className="mt-3">
                <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden flex shadow-inner">
                  <div
                    style={{ width: `${analysis.macro_ratios.carbs_pct}%` }}
                    className="bg-amber-400 transition-all duration-500"
                  />
                  <div
                    style={{ width: `${analysis.macro_ratios.protein_pct}%` }}
                    className="bg-emerald-500 transition-all duration-500"
                  />
                  <div
                    style={{ width: `${analysis.macro_ratios.fat_pct}%` }}
                    className="bg-rose-400 transition-all duration-500"
                  />
                </div>
                <div className="flex justify-between items-center text-[10px] text-gray-500 font-semibold mt-1 px-0.5">
                  <span className="text-amber-700">Carbs: {analysis.macros.carbohydrates_g}g</span>
                  <span className="text-emerald-700">Protein: {analysis.macros.proteins_g}g</span>
                  <span className="text-rose-700">Fat: {analysis.macros.fat_g}g</span>
                </div>
              </div>
            </div>

            {/* RECOGNIZED INGREDIENTS LIST */}
            <div className="p-4 rounded-3xl bg-white shadow-soft border border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-gray-800 flex items-center gap-1.5">
                  <span>🥗</span>
                  <span>Recognized Ingredients ({analysis.recognized_ingredients?.length || 0})</span>
                </h3>
                <span className="text-[10px] text-gray-400 font-bold">Visual Detection</span>
              </div>

              <div className="space-y-2">
                {analysis.recognized_ingredients && analysis.recognized_ingredients.length > 0 ? (
                  analysis.recognized_ingredients.map((ing, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-2xl bg-gray-50 border border-gray-100 flex items-start justify-between gap-2"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-gray-900">{ing.name}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white border border-gray-200 text-gray-600 font-semibold">
                            {ing.category}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          Visual cue: {ing.visual_cue}
                        </p>
                      </div>
                      <span className="text-xs font-extrabold text-emerald-700 shrink-0">
                        {ing.amount_estimate}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-gray-500">No individual ingredients cataloged.</p>
                )}
              </div>
            </div>

            {/* MACRONUTRIENT DETAILS GRID */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-3.5 rounded-2xl bg-white border border-gray-100 shadow-sm">
                <div className="flex justify-between items-center text-xs font-bold text-gray-500 mb-1">
                  <span>🍞 Carbs & Fiber</span>
                  <span className="text-amber-600 font-extrabold">{analysis.macros.carbohydrates_g}g</span>
                </div>
                <div className="text-[11px] text-gray-600 pt-1.5 border-t border-gray-100 space-y-0.5">
                  <div className="flex justify-between">
                    <span>Fiber:</span>
                    <span className="font-bold text-emerald-700">{analysis.macros.fiber_g}g</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Sugars:</span>
                    <span className="font-bold text-pink-600">{analysis.macros.sugars_g}g</span>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-white border border-gray-100 shadow-sm">
                <div className="flex justify-between items-center text-xs font-bold text-gray-500 mb-1">
                  <span>🧂 Sodium & Fats</span>
                  <span className="text-indigo-600 font-extrabold">{analysis.macros.sodium_mg}mg</span>
                </div>
                <div className="text-[11px] text-gray-600 pt-1.5 border-t border-gray-100 space-y-0.5">
                  <div className="flex justify-between">
                    <span>Sat. Fat:</span>
                    <span className="font-bold text-rose-700">{analysis.macros.saturated_fat_g}g</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Fat:</span>
                    <span className="font-bold text-gray-800">{analysis.macros.fat_g}g</span>
                  </div>
                </div>
              </div>
            </div>

            {/* GLYCEMIC IMPACT */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50 to-white border border-amber-200">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">📈</span>
                <h3 className="text-xs font-extrabold text-amber-950 uppercase tracking-wide">
                  Glycemic Curve ({analysis.glycemic_impact} Impact)
                </h3>
              </div>
              <p className="text-xs text-amber-900 leading-relaxed font-medium">
                {analysis.glycemic_explanation}
              </p>
            </div>

            {/* CLINICAL & PERSONALIZED ADVICE */}
            {analysis.personalized_advice && (
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">🩺</span>
                  <h3 className="text-xs font-extrabold text-emerald-950 uppercase tracking-wide">
                    Personalized Nutrition Guidance
                  </h3>
                </div>
                <p className="text-xs text-emerald-900 leading-relaxed font-medium">
                  {analysis.personalized_advice}
                </p>
              </div>
            )}

            {/* PHYSICAL BURN-OFF */}
            <div className="p-3.5 rounded-2xl bg-white border border-gray-100 flex items-center gap-3">
              <span className="text-2xl">🏃</span>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Physical Activity Burn-off
                </p>
                <p className="text-xs font-bold text-gray-800 mt-0.5">
                  {analysis.burn_off_estimate}
                </p>
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="pt-2 space-y-2">
              <button
                onClick={handleLogToTracker}
                disabled={loggedToTracker}
                className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] disabled:bg-emerald-800 text-white font-bold text-sm shadow-soft flex items-center justify-center gap-2 transition-all"
              >
                <span>{loggedToTracker ? '✓ Logged to Daily Intake' : '📊 Log to 24-Hr Daily Tracker'}</span>
              </button>

              <button
                onClick={handleRetake}
                className="w-full py-3 px-4 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
              >
                <span>📸 Snap Another Meal</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </SafeAreaView>
  )
}
