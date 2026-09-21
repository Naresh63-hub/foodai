import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import SafeAreaView from '../components/SafeAreaView'
import { scanBarcode, scanOCR, scanText } from '../api/food'
import { playScanSound } from '../utils/audio'
import { QUICK_SAMPLE_PRESETS } from '../constants'

export default function Scan() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<'barcode' | 'ocr' | 'text'>('barcode')
  const [barcode, setBarcode] = useState('')
  const [ingredientsText, setIngredientsText] = useState('')
  const [productName, setProductName] = useState('')
  const [loading, setLoading] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const [cameraActive, setCameraActive] = useState(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

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
      <div className="px-5 py-6 pb-28 max-w-md mx-auto">
        <div className="mb-5">
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Scan Food</h1>
          <p className="text-xs text-gray-500 mt-1">
            Barcode scanner, label camera OCR, or manual ingredient breakdown.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="rounded-2xl bg-gray-100 p-1 flex gap-1 mb-5">
          <button
            onClick={() => setTab('barcode')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
              tab === 'barcode' ? 'bg-white shadow-card text-gray-900' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            📊 Barcode
          </button>
          <button
            onClick={() => setTab('ocr')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
              tab === 'ocr' ? 'bg-white shadow-card text-gray-900' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            📷 Label OCR
          </button>
          <button
            onClick={() => setTab('text')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
              tab === 'text' ? 'bg-white shadow-card text-gray-900' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            📝 Paste Text
          </button>
        </div>

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
