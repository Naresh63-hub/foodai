import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import SafeAreaView from '../components/SafeAreaView'
import { analyzeFoodNutrition, GeminiNutritionResult } from '../api/food'
import { useUserPreferences } from '../hooks/useUserPreferences'
import { DailyFoodLogItem } from '../types/food'
import { useWebSpeech } from '../hooks/useWebSpeech'
import VoiceMealLoggerModal from '../components/VoiceMealLoggerModal'
import { SkeletonNutritionOverview } from '../components/Skeleton'

const POPULAR_EXAMPLES = [
  { name: 'Avocado Toast with 2 Poached Eggs', emoji: '🥑', tag: 'High Protein' },
  { name: 'Chicken Biryani with Cucumber Raita', emoji: '🍛', tag: 'Indian Classic' },
  { name: 'Overnight Oats with Chia, Berries & Honey', emoji: '🥣', tag: 'Heart Healthy' },
  { name: 'Palak Paneer with 2 Whole Wheat Rotis', emoji: '🧀', tag: 'Vegetarian' },
  { name: 'Greek Yogurt Parfait with Walnuts', emoji: '🥛', tag: 'Gut Friendly' },
  { name: 'Masala Dosa with Sambar & Chutney', emoji: '🥞', tag: 'South Indian' },
  { name: 'Grilled Salmon with Quinoa & Asparagus', emoji: '🐟', tag: 'Omega-3 Rich' },
  { name: 'Double Cheeseburger with French Fries', emoji: '🍔', tag: 'Fast Food Check' },
]

export default function AINutritionAnalyzer() {
  const navigate = useNavigate()
  const { values: userPrefs } = useUserPreferences()
  const [foodQuery, setFoodQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [analysis, setAnalysis] = useState<GeminiNutritionResult | null>(null)
  const [activeTab, setActiveTab] = useState<'macros' | 'micros' | 'clinical' | 'ingredients'>('macros')
  const [addedToTracker, setAddedToTracker] = useState(false)
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false)

  const {
    isSupported: isSpeechSupported,
    isListening,
    startListening,
    stopListening,
  } = useWebSpeech({
    onResult: (text, isFinal) => {
      setFoodQuery(text)
      if (isFinal) {
        toast.success(`Heard: "${text}"`)
      }
    },
    onError: (err) => {
      toast.error(err)
    },
  })

  const handleAnalyze = async (queryToAnalyze?: string) => {
    const targetQuery = (queryToAnalyze || foodQuery).trim()
    if (!targetQuery) {
      toast.error('Please enter a food or meal description')
      return
    }

    if (queryToAnalyze) {
      setFoodQuery(queryToAnalyze)
    }

    setLoading(true)
    setAddedToTracker(false)
    try {
      const result = await analyzeFoodNutrition({
        food_query: targetQuery,
        age: userPrefs.age ? parseInt(userPrefs.age, 10) : null,
        weight_kg: userPrefs.weight ? parseFloat(userPrefs.weight) : null,
        health_conditions: userPrefs.conditions,
      })
      setAnalysis(result)
      toast.success(`Analyzed "${result.food_name}"!`)
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to analyze nutritional content.'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleAddToTracker = () => {
    if (!analysis) return
    const todayKey = `foodai_daily_log_${new Date().toISOString().split('T')[0]}`
    try {
      const existing: DailyFoodLogItem[] = JSON.parse(localStorage.getItem(todayKey) || '[]')
      const saltG = parseFloat(((analysis.macros.sodium_mg || 0) / 400).toFixed(2))
      const newItem: DailyFoodLogItem = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        product_name: analysis.food_name,
        portion_g: analysis.serving_weight_g || 100,
        sugars_g: analysis.macros.sugars_g || 0,
        salt_g: saltG,
        fat_g: analysis.macros.saturated_fat_g || analysis.macros.fat_g || 0,
        additives_count: analysis.processing_level === 'Ultra-Processed' ? 3 : 0,
        processing_level: analysis.processing_level.toLowerCase().replace(/[\s-]/g, '_'),
      }
      existing.unshift(newItem)
      localStorage.setItem(todayKey, JSON.stringify(existing))
      setAddedToTracker(true)
      toast.success(`Added "${analysis.food_name}" to today's Daily Tracker!`, {
        action: {
          label: 'View Tracker',
          onClick: () => navigate('/tracker'),
        },
      })
    } catch {
      toast.error('Could not save to daily log')
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-700 bg-emerald-50 border-emerald-200'
    if (score >= 60) return 'text-amber-700 bg-amber-50 border-amber-200'
    return 'text-rose-700 bg-rose-50 border-rose-200'
  }

  const getGlycemicBadge = (level: string) => {
    if (level === 'Low') return 'bg-emerald-100 text-emerald-800 border-emerald-300'
    if (level === 'Moderate') return 'bg-amber-100 text-amber-800 border-amber-300'
    return 'bg-rose-100 text-rose-800 border-rose-300'
  }

  return (
    <SafeAreaView>
      <div className="px-4 sm:px-5 py-6 pb-36 max-w-md mx-auto w-full box-border">
        {/* Header Navigation */}
        <div className="flex items-center justify-between mb-4">
          <Link
            to="/"
            className="flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-gray-900 bg-white border border-gray-200 rounded-full px-3 py-1 shadow-sm transition-all"
          >
            <span>←</span>
            <span>Back</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1">
              <span>✨</span>
              <span>Gemini AI</span>
            </span>
          </div>
        </div>

        {/* Page Title */}
        <div className="mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200 mb-2">
            <span>🥗</span>
            <span>AI Nutrition Intelligence</span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-tight">
            Analyze Any Food
          </h1>
          <p className="mt-1 text-xs text-gray-600 leading-relaxed">
            Type any meal, recipe, or food item to reveal instant micronutrients, glycemic impact, calories, and personalized clinical health insights.
          </p>
        </div>

        {/* User Health Conditions Active Pill */}
        {userPrefs.conditions && userPrefs.conditions.length > 0 && (
          <div className="mb-4 p-3 rounded-2xl bg-teal-50/70 border border-teal-200/80 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="text-base">🩺</span>
              <div>
                <p className="font-bold text-teal-900">Personalized for you</p>
                <p className="text-[11px] text-teal-700 capitalize">
                  {userPrefs.conditions.join(', ')}
                </p>
              </div>
            </div>
            <Link
              to="/profile/preferences"
              className="text-[11px] font-bold text-teal-800 hover:underline"
            >
              Edit
            </Link>
          </div>
        )}

        {/* Food Query Input Card */}
        <div className="p-4 rounded-3xl bg-white shadow-soft border border-gray-100 mb-6">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-extrabold text-gray-800 uppercase tracking-wider">
              What are you eating or preparing?
            </label>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  if (isListening) stopListening()
                  else startListening()
                }}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition-all ${
                  isListening
                    ? 'bg-red-500 text-white animate-pulse'
                    : 'bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100'
                }`}
                title="Speak to dictate meal"
              >
                <span>{isListening ? '🛑 Stop' : '🎙️ Speak'}</span>
              </button>
              <button
                type="button"
                onClick={() => setIsVoiceModalOpen(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100"
                title="Open Voice Command Logger"
              >
                <span>⚡ Voice Log</span>
              </button>
            </div>
          </div>
          <div className="relative">
            <textarea
              value={foodQuery}
              onChange={(e) => setFoodQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleAnalyze()
                }
              }}
              rows={2}
              placeholder="e.g. 2 whole wheat rotis with palak paneer and salad, or 1 cup of Greek yogurt with blueberries..."
              className="w-full rounded-2xl border border-gray-200 bg-gray-50/60 p-3.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all resize-none"
            />
          </div>

          <div className="mt-3 flex items-center justify-between gap-2">
            <button
              onClick={() => handleAnalyze()}
              disabled={loading || !foodQuery.trim()}
              className="flex-1 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none text-white py-3 px-4 font-bold text-sm shadow-soft flex items-center justify-center gap-2 transition-all"
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Analyzing with Gemini...</span>
                </>
              ) : (
                <>
                  <span>✨</span>
                  <span>Analyze Nutrition</span>
                </>
              )}
            </button>
            {foodQuery && (
              <button
                onClick={() => setFoodQuery('')}
                className="p-3 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-500 text-xs font-bold transition-all"
                title="Clear input"
              >
                ✕
              </button>
            )}
          </div>

          {/* Quick Example Chips */}
          <div className="mt-4 pt-3 border-t border-gray-100">
            <p className="text-[11px] font-bold text-gray-500 mb-2 flex items-center gap-1">
              <span>⚡</span>
              <span>Popular meals to try:</span>
            </p>
            <div className="flex flex-wrap gap-1.5">
              {POPULAR_EXAMPLES.slice(0, 5).map((ex) => (
                <button
                  key={ex.name}
                  onClick={() => handleAnalyze(ex.name)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-gray-100/80 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-200 border border-gray-200 transition-all active:scale-95"
                >
                  <span>{ex.emoji}</span>
                  <span className="truncate max-w-[140px]">{ex.name.split(' with ')[0]}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Loading Skeleton */}
        {loading && (
          <div className="space-y-3">
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200/80 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center text-sm shrink-0 animate-spin">
                ⏳
              </div>
              <div>
                <p className="text-xs font-black text-emerald-900">Gemini AI is analyzing nutrition...</p>
                <p className="text-[11px] text-emerald-700">Calculating macros, glycemic impact, and personalized warnings</p>
              </div>
            </div>
            <SkeletonNutritionOverview />
          </div>
        )}

        {/* Analysis Results Display */}
        {analysis && !loading && (
          <div className="space-y-5">
            {/* Hero Nutrition Score Card */}
            <div className="p-5 rounded-3xl bg-white shadow-soft border border-gray-100">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                    <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${getGlycemicBadge(analysis.glycemic_impact)}`}>
                      {analysis.glycemic_impact} Glycemic Surge
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                      {analysis.processing_level}
                    </span>
                  </div>
                  <h2 className="text-xl font-black text-gray-900 leading-tight">
                    {analysis.food_name}
                  </h2>
                  <p className="text-xs text-gray-500 font-medium mt-0.5">
                    Serving: {analysis.serving_description}
                  </p>
                </div>

                {/* Health Score Badge */}
                <div className={`flex flex-col items-center justify-center w-16 h-16 rounded-2xl border ${getScoreColor(analysis.health_score)} shadow-sm shrink-0`}>
                  <span className="text-xl font-black leading-none">{analysis.health_score}</span>
                  <span className="text-[9px] font-extrabold uppercase mt-0.5">Health</span>
                </div>
              </div>

              {/* Big Calorie Display */}
              <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-transparent border border-emerald-500/20 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-extrabold text-emerald-900 uppercase tracking-wider">
                    Total Energy
                  </p>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-3xl font-black text-emerald-800">
                      {analysis.calories_kcal}
                    </span>
                    <span className="text-sm font-bold text-emerald-700">kcal</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-bold text-gray-600 block">
                    Macro Calorie Split
                  </span>
                  <span className="text-xs font-black text-gray-800">
                    {analysis.macro_ratios.carbs_pct}% C • {analysis.macro_ratios.protein_pct}% P • {analysis.macro_ratios.fat_pct}% F
                  </span>
                </div>
              </div>

              {/* Macro Progress Split Bar */}
              <div className="mt-3">
                <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden flex shadow-inner">
                  <div
                    style={{ width: `${analysis.macro_ratios.carbs_pct}%` }}
                    className="bg-amber-400 transition-all duration-500"
                    title={`Carbs: ${analysis.macro_ratios.carbs_pct}%`}
                  />
                  <div
                    style={{ width: `${analysis.macro_ratios.protein_pct}%` }}
                    className="bg-emerald-500 transition-all duration-500"
                    title={`Protein: ${analysis.macro_ratios.protein_pct}%`}
                  />
                  <div
                    style={{ width: `${analysis.macro_ratios.fat_pct}%` }}
                    className="bg-rose-400 transition-all duration-500"
                    title={`Fat: ${analysis.macro_ratios.fat_pct}%`}
                  />
                </div>
                <div className="flex justify-between items-center text-[10px] text-gray-500 font-semibold mt-1 px-0.5">
                  <span className="text-amber-700">● Carbs ({analysis.macros.carbohydrates_g}g)</span>
                  <span className="text-emerald-700">● Protein ({analysis.macros.proteins_g}g)</span>
                  <span className="text-rose-700">● Fat ({analysis.macros.fat_g}g)</span>
                </div>
              </div>

              {/* Dietary Tags */}
              {analysis.dietary_tags && analysis.dietary_tags.length > 0 && (
                <div className="mt-3.5 pt-3 border-t border-gray-100 flex flex-wrap gap-1.5">
                  {analysis.dietary_tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-100"
                    >
                      ✓ {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Navigation Tabs */}
            <div className="flex rounded-2xl bg-gray-200/70 p-1 text-xs font-bold">
              <button
                onClick={() => setActiveTab('macros')}
                className={`flex-1 py-2 rounded-xl transition-all ${
                  activeTab === 'macros'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Macronutrients
              </button>
              <button
                onClick={() => setActiveTab('micros')}
                className={`flex-1 py-2 rounded-xl transition-all ${
                  activeTab === 'micros'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Vitamins & Minerals
              </button>
              <button
                onClick={() => setActiveTab('clinical')}
                className={`flex-1 py-2 rounded-xl transition-all ${
                  activeTab === 'clinical'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Health Insights
              </button>
              <button
                onClick={() => setActiveTab('ingredients')}
                className={`flex-1 py-2 rounded-xl transition-all ${
                  activeTab === 'ingredients'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Ingredients
              </button>
            </div>

            {/* TAB 1: Macronutrient Cards */}
            {activeTab === 'macros' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2.5">
                  {/* Carbs Card */}
                  <div className="p-3.5 rounded-2xl bg-white border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between text-xs font-bold text-gray-500 mb-1">
                      <span>🍞 Carbohydrates</span>
                      <span className="text-amber-600 font-extrabold">{analysis.macros.carbohydrates_g}g</span>
                    </div>
                    <div className="text-[11px] text-gray-600 space-y-0.5 pt-1.5 border-t border-gray-100">
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

                  {/* Protein Card */}
                  <div className="p-3.5 rounded-2xl bg-white border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between text-xs font-bold text-gray-500 mb-1">
                      <span>🥩 Protein</span>
                      <span className="text-emerald-600 font-extrabold">{analysis.macros.proteins_g}g</span>
                    </div>
                    <p className="text-[11px] text-gray-500 pt-1.5 border-t border-gray-100">
                      {Math.round(((analysis.macros.proteins_g || 0) / 50) * 100)}% of daily 50g reference
                    </p>
                  </div>

                  {/* Fat Card */}
                  <div className="p-3.5 rounded-2xl bg-white border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between text-xs font-bold text-gray-500 mb-1">
                      <span>🥑 Total Fat</span>
                      <span className="text-rose-600 font-extrabold">{analysis.macros.fat_g}g</span>
                    </div>
                    <div className="text-[11px] text-gray-600 pt-1.5 border-t border-gray-100 flex justify-between">
                      <span>Saturated:</span>
                      <span className="font-bold text-rose-700">{analysis.macros.saturated_fat_g}g</span>
                    </div>
                  </div>

                  {/* Sodium Card */}
                  <div className="p-3.5 rounded-2xl bg-white border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between text-xs font-bold text-gray-500 mb-1">
                      <span>🧂 Sodium</span>
                      <span className="text-indigo-600 font-extrabold">{analysis.macros.sodium_mg}mg</span>
                    </div>
                    <p className="text-[11px] text-gray-500 pt-1.5 border-t border-gray-100">
                      {Math.round(((analysis.macros.sodium_mg || 0) / 2000) * 100)}% of WHO 2000mg ceiling
                    </p>
                  </div>
                </div>

                {/* Glycemic Response Banner */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50/70 to-white border border-amber-200">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-lg">📈</span>
                    <h3 className="text-xs font-extrabold text-amber-950 uppercase tracking-wide">
                      Blood Glucose & Glycemic Impact
                    </h3>
                  </div>
                  <p className="text-xs text-amber-900 leading-relaxed font-medium">
                    {analysis.glycemic_explanation}
                  </p>
                </div>

                {/* Burn-off Activity Estimate */}
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
              </div>
            )}

            {/* TAB 2: Micronutrients */}
            {activeTab === 'micros' && (
              <div className="p-4 rounded-3xl bg-white border border-gray-100 shadow-sm space-y-3">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-xs font-extrabold text-gray-800 uppercase tracking-wider">
                    Key Micronutrients & Vitamins
                  </h3>
                  <span className="text-[10px] text-gray-400 font-bold">% Daily Value (DV)</span>
                </div>

                {analysis.micronutrients && analysis.micronutrients.length > 0 ? (
                  <div className="space-y-2.5">
                    {analysis.micronutrients.map((micro) => (
                      <div key={micro.name} className="p-2.5 rounded-2xl bg-gray-50 border border-gray-100">
                        <div className="flex items-center justify-between text-xs font-bold text-gray-800 mb-1">
                          <span>{micro.name}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500 font-medium">{micro.amount}</span>
                            <span className="text-emerald-700 font-extrabold px-2 py-0.5 bg-emerald-100/70 rounded-full text-[10px]">
                              {micro.daily_value_pct}% DV
                            </span>
                          </div>
                        </div>
                        <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                          <div
                            style={{ width: `${Math.min(micro.daily_value_pct, 100)}%` }}
                            className="h-full bg-emerald-600 rounded-full"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">No specific micronutrient breakdown found.</p>
                )}
              </div>
            )}

            {/* TAB 3: Clinical Health Insights */}
            {activeTab === 'clinical' && (
              <div className="space-y-3">
                {/* Personalized Advice */}
                {analysis.personalized_advice && (
                  <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-lg">💡</span>
                      <h3 className="text-xs font-extrabold text-emerald-950 uppercase tracking-wide">
                        Personalized Nutrition Guidance
                      </h3>
                    </div>
                    <p className="text-xs text-emerald-900 leading-relaxed font-medium">
                      {analysis.personalized_advice}
                    </p>
                  </div>
                )}

                {/* Key Benefits */}
                <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-sm">
                  <h3 className="text-xs font-extrabold text-gray-800 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                    <span className="text-emerald-600">✓</span>
                    <span>Top Health Benefits</span>
                  </h3>
                  <ul className="space-y-1.5">
                    {analysis.key_benefits.map((b, i) => (
                      <li key={i} className="text-xs text-gray-700 leading-relaxed flex items-start gap-2">
                        <span className="text-emerald-500 font-bold shrink-0">•</span>
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Concerns or Cautions */}
                {analysis.concerns_or_cautions && analysis.concerns_or_cautions.length > 0 && (
                  <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-sm">
                    <h3 className="text-xs font-extrabold text-rose-800 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                      <span>⚠️</span>
                      <span>Watch Outs & Cautions</span>
                    </h3>
                    <ul className="space-y-1.5">
                      {analysis.concerns_or_cautions.map((c, i) => (
                        <li key={i} className="text-xs text-gray-700 leading-relaxed flex items-start gap-2">
                          <span className="text-rose-500 font-bold shrink-0">•</span>
                          <span>{c}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Smarter Swap Card */}
                {analysis.healthier_swap && (
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-teal-50 to-white border border-teal-200">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-teal-100 text-teal-800">
                        🔄 Smarter Alternative
                      </span>
                    </div>
                    <p className="text-sm font-extrabold text-teal-950">
                      {analysis.healthier_swap.name}
                    </p>
                    <p className="text-xs text-teal-800 mt-1 leading-relaxed">
                      {analysis.healthier_swap.description}
                    </p>
                    <p className="text-[11px] text-teal-700 font-bold mt-1.5">
                      Why it's better: {analysis.healthier_swap.why_better}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: Ingredients Breakdown */}
            {activeTab === 'ingredients' && (
              <div className="p-4 rounded-3xl bg-white border border-gray-100 shadow-sm space-y-2.5">
                <h3 className="text-xs font-extrabold text-gray-800 uppercase tracking-wider mb-2">
                  Identified Ingredient Components
                </h3>
                {analysis.ingredients_breakdown && analysis.ingredients_breakdown.length > 0 ? (
                  analysis.ingredients_breakdown.map((item, idx) => (
                    <div key={idx} className="p-3 rounded-2xl bg-gray-50 border border-gray-100">
                      <div className="flex items-center justify-between text-xs font-bold text-gray-900 mb-0.5">
                        <span>{item.ingredient}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white border border-gray-200 text-gray-600 font-semibold">
                          {item.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 leading-relaxed">
                        {item.purpose_or_benefit}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-gray-500">No ingredient breakdown provided.</p>
                )}
              </div>
            )}

            {/* Bottom Actions Bar */}
            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={handleAddToTracker}
                disabled={addedToTracker}
                className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] disabled:bg-emerald-800/80 text-white font-bold text-sm shadow-soft flex items-center justify-center gap-2 transition-all"
              >
                <span>{addedToTracker ? '✓ Logged to Daily Tracker' : '📊 Add to 24-Hr Daily Tracker'}</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handlePrint}
                  className="py-2.5 px-3 rounded-2xl bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all"
                >
                  <span>🖨️</span>
                  <span>Print Report Card</span>
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `${analysis.food_name}: ${analysis.calories_kcal} kcal | Carbs: ${analysis.macros.carbohydrates_g}g, Protein: ${analysis.macros.proteins_g}g, Fat: ${analysis.macros.fat_g}g | Health Score: ${analysis.health_score}/100`
                    )
                    toast.success('Summary copied to clipboard!')
                  }}
                  className="py-2.5 px-3 rounded-2xl bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all"
                >
                  <span>📋</span>
                  <span>Copy Summary</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Voice Meal Logger Modal */}
      <VoiceMealLoggerModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        onMealLogged={(newMeal) => {
          setAddedToTracker(true)
          toast.success(`Voice logged: ${newMeal.product_name}`)
        }}
      />
    </SafeAreaView>
  )
}
