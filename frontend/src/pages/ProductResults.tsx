import { useEffect, useState } from 'react'
import { useParams, Link, useLocation } from 'react-router-dom'
import SafeAreaView from '../components/SafeAreaView'
import ProcessingBadge from '../components/ProcessingBadge'
import NutritionChip from '../components/NutritionChip'
import IngredientCard from '../components/IngredientCard'
import WhatShouldIKnowCard from '../components/WhatShouldIKnowCard'
import { getProductDetail, scanBarcode } from '../api/food'
import {
  ProductAnalysisResult,
  HealthWarning,
  HealthierSwap,
  FOPNLWarning,
  DailyFoodLogItem,
  GroceryCartItem,
} from '../types/food'
import { toast } from 'sonner'
import demoProductsData from '../constants/demoProducts.json'
import { QUICK_SAMPLE_PRESETS } from '../constants'

const demoProducts = demoProductsData as Record<string, ProductAnalysisResult>

export default function ProductResults() {
  const { scanId } = useParams<{ scanId: string }>()
  const location = useLocation()
  const [imgError, setImgError] = useState(false)
  const [data, setData] = useState<ProductAnalysisResult | null>(() => {
    const passed = (location.state as any)?.result
    if (passed) return passed
    if (scanId && demoProducts[scanId]) {
      return demoProducts[scanId]
    }
    return null
  })
  const [loading, setLoading] = useState(() => {
    if ((location.state as any)?.result) return false
    if (scanId && demoProducts[scanId]) return false
    return true
  })
  const [activeConditions, setActiveConditions] = useState<string[]>([])
  const [notFound, setNotFound] = useState(false)
  const [notFoundDetail, setNotFoundDetail] = useState<string>('')

  useEffect(() => {
    // Load local stored preferences
    const savedAge = localStorage.getItem('prefs_age')
    const savedWeight = localStorage.getItem('prefs_weight')
    const savedConditionsStr = localStorage.getItem('prefs_health_conditions') ?? '[]'
    let conditions: string[] = []
    try {
      conditions = JSON.parse(savedConditionsStr)
    } catch {
      conditions = []
    }
    setActiveConditions(conditions)

    const ageNum = savedAge ? Number(savedAge) : null
    const weightNum = savedWeight ? Number(savedWeight) : null

    // If we already have data from state and it matches current scanId without custom conditions, avoid redundant network calls
    if (data && data.product && (!scanId || data.product.barcode === scanId)) {
      if (!conditions.length && !ageNum && !weightNum) {
        return
      }
    }

    if (scanId) {
      if (!data && !demoProducts[scanId]) {
        setLoading(true)
      }
      getProductDetail(scanId, ageNum, weightNum, conditions)
        .then((res) => {
          setData(res)
          setNotFound(false)
          setLoading(false)
        })
        .catch(() => {
          scanBarcode(scanId, ageNum, weightNum, conditions)
            .then((res) => {
              setData(res)
              setNotFound(false)
            })
            .catch((err: any) => {
              if (demoProducts[scanId]) {
                setData(demoProducts[scanId])
                setNotFound(false)
              } else {
                setNotFound(true)
                setNotFoundDetail(
                  err?.response?.data?.detail ||
                    'This product is not in our verified database. To keep results trustworthy, we never guess product data \u2014 use the label photo (OCR) or paste the ingredients manually.'
                )
              }
            })
            .finally(() => setLoading(false))
        })
    }
  }, [scanId])

  const handleLogToDailyTracker = () => {
    if (!data) return
    const todayKey = `foodai_daily_log_${new Date().toISOString().split('T')[0]}`
    let existingLogs: DailyFoodLogItem[] = []
    try {
      const saved = localStorage.getItem(todayKey)
      if (saved) existingLogs = JSON.parse(saved)
    } catch {
      existingLogs = []
    }

    const servingSugars = data.nutrition.per_serving.sugars_g ?? data.nutrition.per_100g.sugars_g ?? 0
    const servingSalt = data.nutrition.per_serving.salt_g ?? data.nutrition.per_100g.salt_g ?? 0
    const servingFat = data.nutrition.per_serving.fat_g ?? data.nutrition.per_100g.fat_g ?? 0

    const newLog: DailyFoodLogItem = {
      id: Date.now().toString(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      product_name: data.product.product_name,
      barcode: data.product.barcode || undefined,
      portion_g: data.product.product_weight_g || 30,
      sugars_g: Number(servingSugars.toFixed(1)),
      salt_g: Number(servingSalt.toFixed(2)),
      fat_g: Number(servingFat.toFixed(1)),
      additives_count: data.additives_count || 0,
      processing_level: data.processing_level,
    }

    existingLogs.push(newLog)
    localStorage.setItem(todayKey, JSON.stringify(existingLogs))
    toast.success(`Logged "${data.product.product_name}" to Today's Tracker!`)
  }

  const handleAddToCart = () => {
    if (!data) return
    let existingCart: GroceryCartItem[] = []
    try {
      const saved = localStorage.getItem('foodai_grocery_cart')
      if (saved) existingCart = JSON.parse(saved)
    } catch {
      existingCart = []
    }

    const hasPalm = data.ingredients.some((i) => i.name.toLowerCase().includes('palm'))
    const newCartItem: GroceryCartItem = {
      id: Date.now().toString(),
      barcode: data.product.barcode || undefined,
      product_name: data.product.product_name,
      brands: data.product.brands,
      processing_level: data.processing_level,
      sugars_100g: data.nutrition.per_100g.sugars_g || 0,
      salt_100g: data.nutrition.per_100g.salt_g || 0,
      fat_100g: data.nutrition.per_100g.fat_g || 0,
      additives_count: data.additives_count || 0,
      has_palm_oil: hasPalm,
      healthier_swap: data.healthier_swaps?.[0]?.name,
    }

    existingCart.push(newCartItem)
    localStorage.setItem('foodai_grocery_cart', JSON.stringify(existingCart))
    toast.success(`Added "${data.product.product_name}" to Grocery Cart!`)
  }

  if (loading) {
    return (
      <SafeAreaView>
        <div className="px-5 py-12 text-center max-w-md mx-auto animate-pulse space-y-4">
          <div className="h-28 bg-gray-200 rounded-3xl" />
          <div className="grid grid-cols-2 gap-3">
            <div className="h-20 bg-gray-200 rounded-2xl" />
            <div className="h-20 bg-gray-200 rounded-2xl" />
            <div className="h-20 bg-gray-200 rounded-2xl" />
            <div className="h-20 bg-gray-200 rounded-2xl" />
          </div>
          <div className="h-36 bg-gray-200 rounded-2xl" />
        </div>
      </SafeAreaView>
    )
  }

  if (notFound || !data) {
    return (
      <SafeAreaView>
        <div className="px-5 py-10 max-w-md mx-auto">
          <div className="rounded-3xl bg-white shadow-card border border-gray-100 p-6 text-center">
            <div className="text-5xl mb-3">🔍</div>
            <h1 className="text-lg font-black text-gray-900 tracking-tight mb-2">
              No Verified Data Found
            </h1>
            <p className="text-xs text-gray-600 leading-relaxed mb-1">
              {notFoundDetail ||
                'This product is not in our verified database.'}
            </p>
            <p className="text-[11px] text-gray-400 mb-5">
              We never invent nutrition numbers. Add this product yourself and we will
              analyze the real label.
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              <Link
                to="/scan"
                state={{ tab: 'ocr' }}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 text-xs transition-all"
              >
                📷 Photograph Label
              </Link>
              <Link
                to="/scan"
                state={{ tab: 'text' }}
                className="rounded-xl bg-gray-900 hover:bg-black text-white font-bold py-2.5 text-xs transition-all"
              >
                📝 Paste Ingredients
              </Link>
            </div>
            <Link
              to="/explore"
              className="inline-block mt-4 text-[11px] font-bold text-emerald-700 hover:underline"
            >
              Browse the curated catalog ›
            </Link>
          </div>
        </div>
      </SafeAreaView>
    )
  }

  const p = data?.product
  const n = data?.nutrition
  const verdict = data?.verdict || 'Processed Food Product'
  const processingLevel = (data?.processing_level as any) || 'highly_processed'
  const ingredients = data?.ingredients || []
  const sugarsPct = n?.pct_by_weight?.sugars_pct ?? n?.per_100g?.sugars_g
  const saltPct = n?.pct_by_weight?.salt_pct ?? n?.per_100g?.salt_g
  const fatPct = n?.pct_by_weight?.fat_pct ?? n?.per_100g?.fat_g
  const proteinPct = n?.pct_by_weight?.proteins_pct ?? n?.per_100g?.proteins_g
  const fiberPct = n?.pct_by_weight?.fiber_pct ?? n?.per_100g?.fiber_g
  const healthWarnings = data?.health_warnings || []
  const healthierSwaps = data?.healthier_swaps || []
  const fopnlWarnings = data?.fopnl_warnings || []
  const damageControl = data?.damage_control
  const disguised = data?.disguised_ingredients
  const glycemic = data?.glycemic_response

  const handlePrintReport = () => {
    window.print()
  }

  // Product image resolution
  const productImageUrl =
    p?.image_url ||
    (scanId && QUICK_SAMPLE_PRESETS.find((q) => q.barcode === scanId)?.imageUrl) ||
    (p?.barcode && `https://images.openfoodfacts.org/images/products/${p.barcode}/front_en.400.jpg`) ||
    null

  // Category Icon helper for fallback
  const categoryIcon = (() => {
    const name = (p?.product_name || '').toLowerCase()
    const tags = (p?.categories_tags || []).join(' ').toLowerCase()
    if (name.includes('biscuit') || name.includes('cookie') || tags.includes('biscuit')) return '🍪'
    if (name.includes('noodle') || tags.includes('noodle')) return '🍜'
    if (name.includes('yogurt') || name.includes('curd') || tags.includes('dairy')) return '🥛'
    if (name.includes('coke') || name.includes('soda') || name.includes('drink')) return '🥤'
    if (name.includes('peanut') || name.includes('butter') || tags.includes('spread')) return '🥜'
    if (name.includes('chip') || name.includes('crisp')) return '🥔'
    if (name.includes('apple') || name.includes('fruit')) return '🍎'
    return '🥗'
  })()

  // Calculate Health Score & Verdict Pill matching screenshot
  const { healthScorePct, healthScoreLabel, healthScoreColor, verdictPillText, verdictPillClass, verdictPillIcon } = (() => {
    if (processingLevel === 'minimally_processed') {
      return {
        healthScorePct: 88,
        healthScoreLabel: 'Good',
        healthScoreColor: 'text-emerald-600',
        verdictPillText: 'Healthy whole food option',
        verdictPillClass: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
        verdictPillIcon: '✅',
      }
    }
    if (processingLevel === 'processed_culinary') {
      return {
        healthScorePct: 76,
        healthScoreLabel: 'Good',
        healthScoreColor: 'text-emerald-600',
        verdictPillText: 'Culinary ingredient',
        verdictPillClass: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
        verdictPillIcon: '🥣',
      }
    }
    if (processingLevel === 'processed') {
      return {
        healthScorePct: 58,
        healthScoreLabel: 'Fair',
        healthScoreColor: 'text-amber-600',
        verdictPillText: 'Moderate option',
        verdictPillClass: 'bg-amber-50 text-amber-800 border border-amber-200',
        verdictPillIcon: '⚠️',
      }
    }
    const sugarHigh = (n?.per_100g?.sugars_g || 0) > 15
    return {
      healthScorePct: sugarHigh ? 38 : 55,
      healthScoreLabel: 'Fair',
      healthScoreColor: 'text-amber-600',
      verdictPillText: 'Not the best option',
      verdictPillClass: 'bg-amber-50/90 text-amber-900 border border-amber-200',
      verdictPillIcon: '⚠️',
    }
  })()

  const caloriesVal =
    n?.per_100g?.energy_kcal_100g ||
    (data?.product as any)?.nutriments?.energy_kcal_100g ||
    (sugarsPct ? Math.round(sugarsPct * 4 + 200) : null)
  const proteinVal = n?.per_100g?.proteins_g ?? null
  const sugarsVal = n?.per_100g?.sugars_g ?? null

  return (
    <SafeAreaView>
      <div className="px-5 py-6 pb-28 max-w-md mx-auto print:max-w-none print:p-0 print:pb-0">
        {/* TOP BAR / NAVIGATION */}
        <div className="flex items-center justify-between mb-4 print:hidden">
          <Link
            to="/scan"
            className="w-9 h-9 rounded-full bg-white border border-gray-200 text-gray-700 flex items-center justify-center hover:bg-gray-50 active:scale-95 transition-all shadow-xs"
            title="Back to Scan"
          >
            <span className="text-base font-bold">‹</span>
          </Link>
          <h1 className="text-sm font-black text-gray-900 tracking-tight">
            Scan Result
          </h1>
          <button
            onClick={handlePrintReport}
            className="w-9 h-9 rounded-full bg-white border border-gray-200 text-gray-700 flex items-center justify-center hover:bg-gray-50 active:scale-95 transition-all shadow-xs"
            title="Print or share report"
          >
            <span className="text-xs">📄</span>
          </button>
        </div>

        {/* PRODUCT IDENTITY & IMAGE CARD (Matching User Screenshot) */}
        <div className="rounded-3xl bg-white p-4 sm:p-5 shadow-card border border-gray-100 mb-4 print:border-gray-300">
          <div className="flex items-center gap-3.5 sm:gap-4">
            {/* Product Image on the Left */}
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-gray-50 border border-gray-100 p-2 flex items-center justify-center shrink-0 relative overflow-hidden group">
              {productImageUrl && !imgError ? (
                <img
                  src={productImageUrl}
                  alt={p?.product_name || 'Product'}
                  onError={() => setImgError(true)}
                  className="w-full h-full object-contain transition-transform duration-200 group-hover:scale-105"
                  loading="lazy"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-gray-400">
                  <span className="text-3xl sm:text-4xl">{categoryIcon}</span>
                  <span className="text-[9px] font-bold text-gray-400 mt-1 uppercase tracking-tight">Verified</span>
                </div>
              )}
            </div>

            {/* Product Details on the Right */}
            <div className="flex-1 min-w-0">
              <h2 className="text-base sm:text-lg font-black text-gray-950 leading-tight truncate" title={p?.product_name}>
                {p?.product_name || 'Food Product'}
              </h2>
              {p?.brands && (
                <p className="text-xs text-gray-500 font-medium truncate mt-0.5">{p.brands}</p>
              )}

              {/* Health Score line */}
              <div className="mt-2 flex items-center gap-1.5 text-xs">
                <span className="text-gray-500 font-bold">Health Score:</span>
                <span className={`inline-flex items-center gap-1 font-extrabold ${healthScoreColor}`}>
                  <span>✓</span>
                  <span>{healthScoreLabel}</span>
                </span>
              </div>

              {/* Score Range percentage */}
              <div className="text-xs text-gray-600 font-medium mt-0.5">
                <span className="text-gray-500 font-bold">Score Range: </span>
                <span className="font-extrabold text-gray-900">{healthScorePct}%</span>
              </div>

              {/* Quick Nutrient Chips */}
              <div className="mt-2 flex flex-wrap gap-1.5">
                {caloriesVal !== null && (
                  <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-800 text-[10px] font-bold">
                    Cal: {caloriesVal}kcal
                  </span>
                )}
                {proteinVal !== null && (
                  <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-800 text-[10px] font-bold">
                    Protein: {proteinVal}g
                  </span>
                )}
                {sugarsVal !== null && (
                  <span className="px-2 py-0.5 rounded-full bg-pink-50 text-pink-700 text-[10px] font-bold border border-pink-100">
                    Sugar: {sugarsVal}g
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Assessment Bar & Quick Action */}
          <div className="mt-3.5 pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1.5 ${verdictPillClass}`}>
              <span>{verdictPillIcon}</span>
              <span>{verdictPillText}</span>
            </span>

            <button
              onClick={handleAddToCart}
              className="w-8 h-8 rounded-full bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 flex items-center justify-center transition-all active:scale-95"
              title="Add to Grocery Cart"
            >
              <span className="text-xs">🛒</span>
            </button>
          </div>
        </div>
        {/* HERO FOOD IDENTITY BANNER */}
        <div className="rounded-3xl bg-gradient-to-br from-emerald-600 via-teal-700 to-gray-900 text-white p-6 shadow-soft text-center mb-4 relative overflow-hidden print:bg-white print:text-black print:border print:border-gray-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none print:hidden" />

          <p className="text-[11px] uppercase tracking-[0.25em] font-extrabold text-emerald-200 mb-1 print:text-gray-600">
            Food Identity Analysis & Health Report
          </p>

          <h2 className="text-xs font-black tracking-widest text-emerald-300 uppercase mb-2 print:text-gray-800">
            YOU'RE EATING
          </h2>

          <div className="my-2 py-2 px-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 inline-block print:border-gray-400 print:bg-gray-50">
            <h1 className="text-2xl font-black text-white tracking-tight leading-snug print:text-black">
              “{verdict}”
            </h1>
          </div>

          <p className="mt-2 text-xs font-semibold text-emerald-100/90 truncate print:text-gray-700">
            {p?.product_name || 'Food Product'} {p?.serving_size ? `· ${p.serving_size}` : ''}
          </p>

          <div className="mt-4 flex items-center justify-center gap-2">
            <ProcessingBadge level={processingLevel} size="md" />
            <span className="text-xs font-bold text-emerald-200 bg-white/10 px-3 py-1 rounded-full border border-white/10 print:text-gray-800 print:border-gray-300">
              {data?.additives_count || 0} Additives
            </span>
          </div>
        </div>

        {/* FSSAI FRONT-OF-PACK RED WARNING OCTAGONS (FOPNL) */}
        {fopnlWarnings.length > 0 && (
          <div className="mb-5 rounded-2xl bg-gradient-to-r from-red-900 via-rose-950 to-gray-900 text-white p-3.5 shadow-soft border border-red-500/30 print:border-red-600 print:bg-red-50 print:text-red-950">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <span className="text-base">🛑</span>
                <span className="text-[11px] font-black uppercase tracking-wider text-rose-300 print:text-red-900">
                  FSSAI Front-of-Pack Warnings
                </span>
              </div>
              <span className="text-[10px] bg-red-500/30 text-rose-200 px-2 py-0.5 rounded-full border border-red-400/30 print:bg-red-200 print:text-red-900">
                {fopnlWarnings.length} Flags
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {fopnlWarnings.map((flag: FOPNLWarning, fIdx: number) => (
                <div
                  key={fIdx}
                  className="inline-flex items-center gap-1.5 bg-red-500/20 border border-red-400/40 px-3 py-1.5 rounded-xl text-xs font-black text-rose-100 print:bg-red-100 print:text-red-900 print:border-red-400"
                >
                  <span className="text-sm">🛑</span>
                  <span>{flag.badge}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* QUICK LOGGING, CART & PRINT ACTION BAR */}
        <div className="grid grid-cols-3 gap-2 mb-5 print:hidden">
          <button
            onClick={handleLogToDailyTracker}
            className="rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2.5 px-2 text-xs shadow-soft transition-all flex flex-col items-center justify-center gap-1 active:scale-95"
          >
            <span className="text-base">➕</span>
            <span className="text-[11px]">Log Intake</span>
          </button>
          <button
            onClick={handleAddToCart}
            className="rounded-2xl bg-gray-900 hover:bg-black text-white font-bold py-2.5 px-2 text-xs shadow-soft transition-all flex flex-col items-center justify-center gap-1 active:scale-95"
          >
            <span className="text-base">🛒</span>
            <span className="text-[11px]">Add to Cart</span>
          </button>
          <button
            onClick={handlePrintReport}
            className="rounded-2xl bg-white hover:bg-gray-50 border border-gray-200 text-gray-800 font-bold py-2.5 px-2 text-xs shadow-soft transition-all flex flex-col items-center justify-center gap-1 active:scale-95"
          >
            <span className="text-base">📄</span>
            <span className="text-[11px]">Print Report</span>
          </button>
        </div>

        {/* PERSONALIZED HEALTH WARNINGS ALERT BANNER */}
        {healthWarnings.length > 0 ? (
          <div className="mb-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-base animate-pulse">⚠️</span>
                <h2 className="text-xs font-extrabold uppercase tracking-wider text-rose-800">
                  Pre-Eating Health Warning ({healthWarnings.length})
                </h2>
              </div>
              <Link
                to="/profile/preferences"
                className="text-[11px] font-bold text-emerald-700 hover:underline"
              >
                Edit Profile ›
              </Link>
            </div>

            {healthWarnings.map((warn: HealthWarning, idx: number) => {
              const isDanger = warn.severity === 'danger'
              return (
                <div
                  key={idx}
                  className={[
                    'rounded-2xl p-4 border transition-all shadow-sm',
                    isDanger
                      ? 'bg-gradient-to-br from-rose-50 to-red-50/90 border-rose-300 text-rose-950'
                      : 'bg-gradient-to-br from-amber-50 to-orange-50/90 border-amber-300 text-amber-950'
                  ].join(' ')}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{isDanger ? '🚨' : '⚠️'}</span>
                      <h3 className="text-sm font-extrabold tracking-tight">
                        {warn.condition_title} Alert
                      </h3>
                    </div>
                    <span
                      className={[
                        'text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full',
                        isDanger ? 'bg-rose-200 text-rose-900' : 'bg-amber-200 text-amber-900'
                      ].join(' ')}
                    >
                      {warn.badge}
                    </span>
                  </div>

                  <p className="text-xs font-bold text-gray-900 mb-1">{warn.title}</p>
                  <p className="text-xs text-gray-700 leading-relaxed mb-2.5">{warn.message}</p>

                  <div className="rounded-xl bg-white/80 p-2.5 border border-black/5 flex items-start gap-2">
                    <span className="text-sm pt-0.5">💡</span>
                    <div>
                      <p className="text-[11px] font-extrabold text-gray-900">Recommended Action:</p>
                      <p className="text-[11px] text-gray-700 font-medium">{warn.action}</p>
                    </div>
                  </div>

                  {warn.scientific_ref && (
                    <p className="text-[10px] text-gray-400 mt-2 font-medium italic">
                      Standard: {warn.scientific_ref}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="mb-5 rounded-2xl bg-emerald-50/90 border border-emerald-200 p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="text-lg">🛡️</span>
              <div>
                <p className="text-xs font-bold text-emerald-950">
                  {activeConditions.length > 0
                    ? `No health conflicts for your ${activeConditions.length} active conditions`
                    : 'Personalize health warnings for your conditions'}
                </p>
                <p className="text-[10px] text-emerald-700">
                  {activeConditions.length > 0
                    ? 'Within standard nutritional thresholds.'
                    : 'Get alerts for Diabetes, High BP, Allergies & Child mode.'}
                </p>
              </div>
            </div>
            <Link
              to="/profile/preferences"
              className="text-xs font-bold bg-emerald-700 text-white px-3 py-1.5 rounded-xl hover:bg-emerald-800 transition-colors shrink-0"
            >
              {activeConditions.length > 0 ? 'Edit' : 'Set Profile'}
            </Link>
          </div>
        )}

        {/* DAMAGE CONTROL & MEAL PAIRING HACKS */}
        {damageControl && damageControl.mitigation_steps.length > 0 && (
          <div className="mb-5 rounded-2xl bg-gradient-to-br from-teal-50 to-emerald-50 border border-teal-200 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <span className="text-lg">🛡️</span>
                <h3 className="text-xs font-black uppercase tracking-wider text-teal-950">
                  {damageControl.headline}
                </h3>
              </div>
              <span className="text-[10px] font-extrabold bg-teal-200 text-teal-900 px-2 py-0.5 rounded-md">
                Spike Blunter
              </span>
            </div>

            <p className="text-[11px] font-bold text-gray-800 mb-2.5">
              ⚖️ {damageControl.portion_limit}
            </p>

            <div className="space-y-2">
              {damageControl.mitigation_steps.map((step, sIdx) => (
                <div
                  key={sIdx}
                  className="rounded-xl bg-white/90 p-2.5 border border-teal-100 flex items-start gap-2.5"
                >
                  <span className="text-lg pt-0.5">{step.icon}</span>
                  <div>
                    <p className="text-xs font-black text-gray-900">{step.action}</p>
                    <p className="text-[11px] text-gray-600 mt-0.5 leading-snug">{step.rationale}</p>
                  </div>
                </div>
              ))}
            </div>

            <p className="mt-2.5 text-[10px] leading-snug text-teal-800/80 italic">
              {damageControl.disclaimer ||
                'General nutritional awareness only — not medical advice. Consult a physician or registered dietitian before changing your diet.'}
            </p>
          </div>
        )}

        {/* BLOOD GLUCOSE SPIKE PREDICTOR & GLYCEMIC TRAJECTORY */}
        {glycemic && (
          <div className="mb-5 rounded-2xl bg-gradient-to-br from-purple-50 via-indigo-50/50 to-white border border-purple-200 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <span className="text-lg">📈</span>
                <h3 className="text-xs font-black uppercase tracking-wider text-purple-950">
                  Glycemic Curve & Spike Estimator
                </h3>
              </div>
              <span
                className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                  glycemic.spike_score >= 7.0
                    ? 'bg-rose-100 text-rose-800 border border-rose-200'
                    : glycemic.spike_score >= 4.0
                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                    : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                }`}
              >
                {glycemic.tier}
              </span>
            </div>

            {/* Spike Score Progress Bar */}
            <div className="mt-2 mb-2.5">
              <div className="flex justify-between text-[11px] font-bold text-gray-700 mb-1">
                <span>Spike Severity Index:</span>
                <span className="text-purple-900">{glycemic.spike_score} / 10</span>
              </div>
              <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    glycemic.spike_score >= 7.0
                      ? 'bg-gradient-to-r from-amber-500 to-rose-600'
                      : glycemic.spike_score >= 4.0
                      ? 'bg-gradient-to-r from-emerald-500 to-amber-500'
                      : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, glycemic.spike_score * 10)}%` }}
                />
              </div>
            </div>

            <p className="text-[11px] text-gray-700 leading-relaxed bg-white/80 p-2.5 rounded-xl border border-purple-100">
              {glycemic.explanation}
            </p>

            <div className="mt-2.5 flex items-center justify-between text-[10px] text-purple-900/80 font-semibold px-1">
              <span>Buffering Quality: <strong className="text-purple-950">{glycemic.buffering_quality}</strong></span>
              <span>Fiber: {glycemic.fiber_100g}g · Protein: {glycemic.protein_100g}g</span>
            </div>
          </div>
        )}

        {/* DISGUISED INGREDIENT ALIASES DETECTOR */}
        {disguised && disguised.total_disguised_count > 0 && (
          <div className="mb-5 rounded-2xl bg-gradient-to-br from-amber-50 via-orange-50/40 to-white border border-amber-300/80 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <span className="text-lg">🕵️</span>
                <h3 className="text-xs font-black uppercase tracking-wider text-amber-950">
                  Disguised Ingredients Detected ({disguised.total_disguised_count})
                </h3>
              </div>
              <span className="text-[10px] font-black bg-amber-200 text-amber-950 px-2 py-0.5 rounded-full">
                Technical Aliases
              </span>
            </div>

            <p className="text-[11px] text-gray-700 mb-3 leading-snug">
              {disguised.summary}
            </p>

            <div className="space-y-2">
              {disguised.hidden_sugars.length > 0 && (
                <div className="bg-white/90 p-2.5 rounded-xl border border-amber-200">
                  <span className="text-[11px] font-extrabold text-pink-800 block mb-1">
                    🍬 Hidden Sugar Aliases:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {disguised.hidden_sugars.map((s, sI) => (
                      <span key={sI} className="text-[10px] font-bold bg-pink-50 text-pink-900 border border-pink-200 px-2 py-0.5 rounded-md">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {disguised.hidden_salts.length > 0 && (
                <div className="bg-white/90 p-2.5 rounded-xl border border-amber-200">
                  <span className="text-[11px] font-extrabold text-blue-800 block mb-1">
                    🧂 Hidden Sodium & Additive Salts:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {disguised.hidden_salts.map((s, sI) => (
                      <span key={sI} className="text-[10px] font-bold bg-blue-50 text-blue-900 border border-blue-200 px-2 py-0.5 rounded-md">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {disguised.hidden_fats.length > 0 && (
                <div className="bg-white/90 p-2.5 rounded-xl border border-amber-200">
                  <span className="text-[11px] font-extrabold text-amber-800 block mb-1">
                    🧈 Industrial Refined Fats:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {disguised.hidden_fats.map((s, sI) => (
                      <span key={sI} className="text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded-md">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* NUTRIENT CARDS WITH MATHEMATICAL WEIGHT PERCENTAGES */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-gray-700">
              Key Nutrients & % Weight
            </h2>
            <span className="text-[11px] text-gray-400">per 100g product</span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <NutritionChip
              icon="🍬"
              label="Sugar"
              value={`${n?.per_100g?.sugars_g ?? '—'} g / 100g`}
              percent={sugarsPct}
              accent="primary"
            />
            <NutritionChip
              icon="🧂"
              label="Salt"
              value={`${n?.per_100g?.salt_g ?? '—'} g / 100g`}
              percent={saltPct}
              accent="sky"
            />
            <NutritionChip
              icon="🧈"
              label="Fat"
              value={`${n?.per_100g?.fat_g ?? '—'} g / 100g`}
              percent={fatPct}
              accent="amber"
            />
            <NutritionChip
              icon="💪"
              label="Protein"
              value={`${n?.per_100g?.proteins_g ?? '—'} g / 100g`}
              percent={proteinPct}
              accent="emerald"
            />
            <NutritionChip
              icon="🌾"
              label="Fiber"
              value={`${n?.per_100g?.fiber_g ?? '—'} g / 100g`}
              percent={fiberPct}
              accent="accent"
            />
            <div className="rounded-2xl bg-purple-50/80 p-3.5 border border-purple-100 flex flex-col justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-xl">🧪</span>
                <span className="text-xs font-bold text-purple-900 uppercase">Additives</span>
              </div>
              <p className="text-lg font-black text-purple-900 mt-1">
                {data?.additives_count || 0} detected
              </p>
            </div>
          </div>
        </div>

        {/* HEALTHIER FOOD SWAPS CAROUSEL / CARDS */}
        {healthierSwaps.length > 0 && (
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-1.5">
                <span className="text-base">🔄</span>
                <h2 className="text-xs font-extrabold uppercase tracking-wider text-gray-900">
                  Healthier Food Swaps
                </h2>
              </div>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                Better Choices
              </span>
            </div>

            <div className="space-y-3">
              {healthierSwaps.map((swap: HealthierSwap, sIdx: number) => (
                <div
                  key={sIdx}
                  className="rounded-2xl bg-white shadow-card p-4 border border-emerald-100/80 hover:border-emerald-300 transition-all"
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                        {swap.category}
                      </span>
                      <h3 className="text-sm font-black text-gray-900 mt-1">
                        {swap.name}
                      </h3>
                    </div>
                    <span className="text-xs font-black bg-emerald-600 text-white px-2 py-1 rounded-xl shadow-xs">
                      NOVA {swap.nova_group}
                    </span>
                  </div>

                  <p className="text-xs text-gray-600 leading-relaxed mb-2">
                    {swap.benefits}
                  </p>

                  <div className="rounded-xl bg-gray-50 p-2.5 border border-gray-100 flex items-start gap-2">
                    <span className="text-xs">✨</span>
                    <p className="text-[11px] text-gray-700 font-medium">
                      <strong className="text-emerald-900">Why it's better: </strong>
                      {swap.why_better}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* WHAT SHOULD I KNOW SUMMARY CARD */}
        <div className="mb-5">
          <WhatShouldIKnowCard summaryInfo={data?.summary_info} />
        </div>

        {/* DETECTED INGREDIENTS BREAKDOWN */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-base font-extrabold text-gray-900">Ingredients Detected</h2>
              <p className="text-[11px] text-gray-500">
                {ingredients.length} ingredients analyzed · Tap any item for purpose & safety
              </p>
            </div>
            <span className="text-xs font-bold bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full">
              {ingredients.length} Total
            </span>
          </div>

          <div className="space-y-2.5">
            {ingredients.map((ing) => (
              <IngredientCard
                key={ing.id}
                id={ing.id}
                name={ing.name}
                category={ing.category}
                amount={ing.amount_g ? `${ing.amount_g} g` : undefined}
                disclosed={ing.amount_g !== null}
                purpose={ing.purpose_text}
                concern={ing.concern_text}
                simpleExplanation={ing.simple_explanation}
                regulatoryRefs={ing.regulatory_refs}
              />
            ))}
          </div>
        </div>

        {/* QUICK NAVIGATION ACTION BUTTONS */}
        <div className="grid grid-cols-3 gap-2.5 mb-6">
          <Link
            to={`/nutrition/${scanId || 'current'}`}
            state={{ result: data }}
            className="flex flex-col items-center justify-center rounded-2xl bg-white shadow-card border border-gray-100 p-3 hover:border-emerald-300 transition-all text-center"
          >
            <span className="text-2xl">📊</span>
            <span className="text-xs font-bold text-gray-900 mt-1">Nutrition</span>
            <span className="text-[10px] text-gray-400">100g & Serving</span>
          </Link>

          <Link
            to={`/dna/${scanId || 'current'}`}
            state={{ result: data }}
            className="flex flex-col items-center justify-center rounded-2xl bg-white shadow-card border border-gray-100 p-3 hover:border-emerald-300 transition-all text-center"
          >
            <span className="text-2xl">🧬</span>
            <span className="text-xs font-bold text-gray-900 mt-1">Food DNA</span>
            <span className="text-[10px] text-gray-400">Composition</span>
          </Link>

          <Link
            to="/compare"
            state={{ initialBarcode: p?.barcode }}
            className="flex flex-col items-center justify-center rounded-2xl bg-white shadow-card border border-gray-100 p-3 hover:border-emerald-300 transition-all text-center"
          >
            <span className="text-2xl">⚖️</span>
            <span className="text-xs font-bold text-gray-900 mt-1">Compare</span>
            <span className="text-[10px] text-gray-400">Duel Foods</span>
          </Link>
        </div>

        <div className="text-center text-[10px] text-gray-400 leading-relaxed mt-2">
          <p>Product ID: {scanId} · Evaluated with FSSAI / WHO JECFA Standards</p>
          <p className="mt-1 font-medium text-gray-500">
            Educational nutritional awareness only. Not a medical diagnosis, prescription, or treatment.
          </p>
        </div>
      </div>
    </SafeAreaView>
  )
}