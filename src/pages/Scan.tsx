import React, { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { toast } from 'sonner'
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
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

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
      toast.error(err.response?.data?.detail || 'Product not found in database.')
    } finally {
      setLoading(false)
    }
  }

  // Start Live Webcam Video Stream for Barcode Scanner
  const startCamera = async () => {
    try {
      setCameraActive(true)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }
      toast.success('Camera activated. Point at barcode!')
    } catch (err) {
      toast.info('Camera unavailable in current environment. Use photo upload or enter digits.')
      setCameraActive(false)
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    setCameraActive(false)
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
    setLoading(true)
    const { age, weightKg, healthConditions } = getUserPreferences()
    try {
      const result = await scanBarcode(cleanBarcode, age, weightKg, healthConditions)
      playScanSound()
      toast.success(`Identified: ${result.product.product_name}`)
      navigate(`/results/${cleanBarcode}`, { state: { result } })
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Barcode lookup failed. Try photo OCR or paste text below.')
    } finally {
      setLoading(false)
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
            onClick={() => setTab('barcode')}
            className={`py-2 px-1 rounded-xl text-[11px] font-bold transition-all text-center truncate ${
              tab === 'barcode' ? 'bg-white shadow-card text-gray-900' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            📊 Barcode
          </button>
          <button
            onClick={() => setTab('batch')}
            className={`py-2 px-1 rounded-xl text-[11px] font-bold transition-all text-center truncate ${
              tab === 'batch' ? 'bg-white shadow-card text-emerald-800 font-extrabold' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            🛒 Cart ({batchCount})
          </button>
          <button
            onClick={() => setTab('ocr')}
            className={`py-2 px-1 rounded-xl text-[11px] font-bold transition-all text-center truncate ${
              tab === 'ocr' ? 'bg-white shadow-card text-gray-900' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            📷 OCR
          </button>
          <button
            onClick={() => setTab('text')}
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
            <div className="relative rounded-3xl bg-gray-950 overflow-hidden text-center text-white p-5 shadow-card border border-gray-800 min-h-[220px] flex flex-col items-center justify-center">
              {cameraActive ? (
                <div className="relative w-full h-48 rounded-2xl overflow-hidden">
                  <video ref={videoRef} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 border-2 border-emerald-400/80 rounded-2xl pointer-events-none" />
                  {/* Glowing Laser Scan Line */}
                  <div className="absolute left-4 right-4 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#34d399] animate-pulse pointer-events-none top-1/2 -translate-y-1/2" />
                </div>
              ) : (
                <div className="w-48 h-28 border-2 border-dashed border-emerald-400/80 rounded-2xl flex flex-col items-center justify-center relative p-3 overflow-hidden">
                  <span className="text-3xl">📷</span>
                  <p className="text-[11px] font-semibold text-emerald-300 mt-1">Align Barcode in Box</p>
                  <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-emerald-400" />
                  <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-emerald-400" />
                  <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-emerald-400" />
                  <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-emerald-400" />
                  {/* Animated laser line */}
                  <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_8px_#34d399] animate-pulse pointer-events-none top-1/2" />
                </div>
              )}

              <div className="mt-3 flex items-center gap-2">
                {!cameraActive ? (
                  <button
                    type="button"
                    onClick={startCamera}
                    className="px-4 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-soft transition-all"
                  >
                    Open Live Camera
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="px-4 py-1.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-all"
                  >
                    Close Camera
                  </button>
                )}
              </div>
            </div>

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
