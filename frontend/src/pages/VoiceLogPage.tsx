import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import SafeAreaView from '../components/SafeAreaView'
import { useWebSpeech } from '../hooks/useWebSpeech'
import { parseVoiceFoodCommand, estimateCaloriesQuick, MealType } from '../services/voiceFoodParser'
import { analyzeFoodNutrition } from '../api/food'
import { useAuth } from '../contexts/AuthContext'
import { saveDailyLogToFirestore, saveFoodScanToFirestore } from '../services/firestoreService'
import { useUserPreferences } from '../hooks/useUserPreferences'
import { DailyFoodLogItem } from '../types/food'

const VOICE_TIPS = [
  { label: 'Breakfast', example: 'Log 2 scrambled eggs, avocado toast, and green tea' },
  { label: 'Lunch', example: 'I had 1 bowl of chicken biryani with cucumber raita' },
  { label: 'Snack', example: 'Add 1 medium banana and 10 almonds' },
  { label: 'Dinner', example: 'Log grilled salmon with steamed broccoli and brown rice' },
]

export default function VoiceLogPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { values: userPrefs } = useUserPreferences()

  const [selectedMealType, setSelectedMealType] = useState<MealType>('lunch')
  const [manualText, setManualText] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [recentVoiceLogs, setRecentVoiceLogs] = useState<DailyFoodLogItem[]>([])

  const {
    isSupported,
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
  } = useWebSpeech({
    lang: 'en-US',
    continuous: false,
    interimResults: true,
  })

  // Load today's logs from localStorage on mount
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    const localKey = `foodai_daily_log_${today}`
    try {
      const saved: DailyFoodLogItem[] = JSON.parse(localStorage.getItem(localKey) || '[]')
      setRecentVoiceLogs(saved.slice(0, 5))
    } catch {}
  }, [])

  // Auto-detect meal type from spoken transcript
  useEffect(() => {
    const activeText = transcript.trim() || manualText.trim()
    if (activeText) {
      const parsed = parseVoiceFoodCommand(activeText)
      if (parsed.mealType) {
        setSelectedMealType(parsed.mealType)
      }
    }
  }, [transcript, manualText])

  const activeSpeechText = (transcript + (interimTranscript ? ` ${interimTranscript}` : '')).trim() || manualText.trim()
  const parsed = activeSpeechText ? parseVoiceFoodCommand(activeSpeechText) : null

  const handleLogMeal = async (useAiNutrition = true) => {
    const foodName = parsed?.cleanedFoodQuery || manualText.trim()
    if (!foodName) {
      toast.error('Please speak or type a food command first')
      return
    }

    setIsProcessing(true)
    const today = new Date().toISOString().split('T')[0]
    const localKey = `foodai_daily_log_${today}`

    try {
      let finalCalories = parsed?.statedCalories || 0
      let finalCarbs = 0
      let finalProtein = 0
      let finalFat = 0
      let finalSugar = 0
      let finalSalt = 1.0
      let finalSodium = 350
      let finalServingDesc = parsed?.portionEstimate || '1 serving (~200g)'
      let finalHealthScore = 75
      let finalProcessing = 'minimally_processed'

      if (useAiNutrition || !parsed?.statedCalories) {
        try {
          const aiResult = await analyzeFoodNutrition({
            food_query: foodName,
            age: userPrefs.age ? parseInt(userPrefs.age, 10) : null,
            weight_kg: userPrefs.weight ? parseFloat(userPrefs.weight) : null,
            health_conditions: userPrefs.conditions,
          })

          finalCalories = aiResult.calories_kcal
          finalCarbs = aiResult.macros.carbohydrates_g
          finalProtein = aiResult.macros.proteins_g
          finalFat = aiResult.macros.fat_g
          finalSugar = aiResult.macros.sugars_g
          finalSodium = aiResult.macros.sodium_mg
          finalSalt = parseFloat((finalSodium / 400).toFixed(2))
          finalServingDesc = aiResult.serving_description || finalServingDesc
          finalHealthScore = aiResult.health_score || 75
          finalProcessing = aiResult.processing_level || 'processed'
        } catch {
          const fallback = estimateCaloriesQuick(foodName)
          finalCalories = parsed?.statedCalories || fallback.calories
          finalCarbs = fallback.carbsG
          finalProtein = fallback.proteinG
          finalFat = fallback.fatG
          finalSugar = fallback.sugarG
          finalSodium = fallback.sodiumMg
          finalSalt = parseFloat((finalSodium / 400).toFixed(2))
        }
      } else {
        const fallback = estimateCaloriesQuick(foodName)
        finalCalories = parsed.statedCalories
        finalCarbs = fallback.carbsG
        finalProtein = fallback.proteinG
        finalFat = fallback.fatG
        finalSugar = fallback.sugarG
        finalSodium = fallback.sodiumMg
        finalSalt = parseFloat((finalSodium / 400).toFixed(2))
      }

      const existing: DailyFoodLogItem[] = JSON.parse(localStorage.getItem(localKey) || '[]')
      const newLogItem: DailyFoodLogItem = {
        id: `voice_${Date.now()}`,
        timestamp: new Date().toISOString(),
        product_name: `${foodName} (${selectedMealType.toUpperCase()})`,
        portion_g: 200,
        sugars_g: finalSugar,
        salt_g: finalSalt,
        fat_g: finalFat,
        additives_count: 0,
        processing_level: finalProcessing,
      }
      existing.unshift(newLogItem)
      localStorage.setItem(localKey, JSON.stringify(existing))
      setRecentVoiceLogs(existing.slice(0, 5))

      // Sync to Firestore
      if (user?.uid) {
        await saveDailyLogToFirestore({
          id: newLogItem.id,
          userId: user.uid,
          productName: newLogItem.product_name,
          portionG: newLogItem.portion_g,
          sugarsG: newLogItem.sugars_g,
          saltG: newLogItem.salt_g,
          fatG: newLogItem.fat_g,
          additivesCount: 0,
          processingLevel: finalProcessing,
          dateKey: today,
          createdAt: newLogItem.timestamp,
        })

        await saveFoodScanToFirestore({
          id: `scan_${Date.now()}`,
          userId: user.uid,
          foodName: foodName,
          caloriesKcal: finalCalories,
          servingDescription: finalServingDesc,
          servingWeightG: 200,
          macros: {
            carbohydrates_g: finalCarbs,
            proteins_g: finalProtein,
            fat_g: finalFat,
            sugars_g: finalSugar,
            sodium_mg: finalSodium,
          },
          healthScore: finalHealthScore,
          processingLevel: finalProcessing,
          glycemicImpact: 'Moderate',
          ingredients: [],
          createdAt: new Date().toISOString(),
        })
      }

      speak(`Logged ${foodName} for ${selectedMealType}, ${finalCalories} calories.`)
      toast.success(`Logged ${foodName} (${finalCalories} kcal)!`)
      resetTranscript()
      setManualText('')
    } catch {
      toast.error('Failed to log meal')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <SafeAreaView>
      <div className="px-4 sm:px-5 py-6 pb-36 max-w-md mx-auto w-full box-border">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <Link
            to="/tracker"
            className="flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-gray-900 bg-white border border-gray-200 rounded-full px-3 py-1 shadow-xs transition-all"
          >
            <span>←</span>
            <span>Tracker</span>
          </Link>

          <button
            onClick={() => setTtsEnabled(!ttsEnabled)}
            className={`text-xs font-bold px-3 py-1 rounded-full border transition-all ${
              ttsEnabled ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-gray-100 text-gray-400 border-gray-200'
            }`}
          >
            {ttsEnabled ? '🔊 Audio Feedback ON' : '🔈 Audio OFF'}
          </button>
        </div>

        {/* Title */}
        <div className="mb-5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-purple-50 to-indigo-50 text-purple-800 text-xs font-bold border border-purple-200 mb-2">
            <span>🎙️</span>
            <span>Web Speech API Voice Assistant</span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-tight">
            Voice Meal Commands
          </h1>
          <p className="mt-1 text-xs text-gray-600 leading-relaxed">
            Speak what you ate hands-free. We extract meal type, portions, calculate calories, and log directly into your Firestore progress chart.
          </p>
        </div>

        {/* Big Mic Hero Card */}
        <div className="p-6 rounded-3xl bg-gradient-to-br from-indigo-900 via-purple-900 to-gray-900 text-white shadow-soft text-center mb-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />

          {/* Microphone Pulsing Button */}
          <div className="relative inline-block mb-3">
            {isListening && (
              <>
                <div className="absolute inset-0 rounded-full bg-red-500/40 animate-ping" />
                <div className="absolute -inset-4 rounded-full bg-red-400/20 animate-pulse" />
              </>
            )}
            <button
              onClick={() => {
                if (isListening) stopListening()
                else startListening()
              }}
              className={`relative w-24 h-24 rounded-full flex items-center justify-center text-4xl shadow-2xl transition-all duration-300 ${
                isListening
                  ? 'bg-gradient-to-tr from-red-600 to-rose-500 text-white scale-105'
                  : 'bg-gradient-to-tr from-purple-500 via-indigo-500 to-emerald-400 text-white hover:scale-105 active:scale-95'
              }`}
            >
              {isListening ? '🛑' : '🎙️'}
            </button>
          </div>

          <p className="text-sm font-extrabold tracking-wide">
            {isListening ? (
              <span className="text-red-400 animate-pulse inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-400" />
                Listening... Speak your meal now
              </span>
            ) : (
              'Tap Mic to Start Speaking'
            )}
          </p>

          <p className="text-xs text-purple-200/80 mt-1 max-w-xs mx-auto">
            Try: “Log 1 bowl of chicken biryani for lunch”
          </p>
        </div>

        {/* Live Speech Recognition Transcript Card */}
        <div className="rounded-2xl bg-white border border-gray-200 p-4 shadow-card mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
              Live Speech Transcript
            </span>
            {activeSpeechText && (
              <button
                onClick={() => {
                  resetTranscript()
                  setManualText('')
                }}
                className="text-xs text-gray-400 hover:text-gray-700"
              >
                Clear
              </button>
            )}
          </div>

          {activeSpeechText ? (
            <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
              <p className="text-sm font-bold text-gray-900 leading-relaxed">
                <span>{transcript}</span>
                {interimTranscript && (
                  <span className="text-gray-400 italic"> {interimTranscript}</span>
                )}
                {!transcript && interimTranscript && (
                  <span className="text-gray-500 italic">{interimTranscript}</span>
                )}
              </p>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-gray-50/70 border border-dashed border-gray-200 text-center">
              <p className="text-xs text-gray-400 italic">
                {isListening ? 'Listening for speech...' : 'Press the mic button above and say what you ate.'}
              </p>
            </div>
          )}

          {/* Fallback input if Web Speech API is not supported */}
          {!isSupported && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs text-amber-700 font-bold mb-1">
                ⚠️ Speech Recognition not supported in this browser. You can type commands below:
              </p>
              <input
                type="text"
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                placeholder="e.g. 2 boiled eggs and coffee for breakfast"
                className="w-full text-xs p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-400"
              />
            </div>
          )}
        </div>

        {/* Error Notification */}
        {error && (
          <div className="mb-4 p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
            <span>⚠️</span>
            <p className="flex-1">{error}</p>
          </div>
        )}

        {/* Parsed Food Candidate Preview */}
        {parsed?.cleanedFoodQuery && (
          <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50/80 border border-emerald-200 p-4 shadow-card mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800">
                ✨ Extracted Food Entry
              </span>
              <span className="text-xs font-black text-emerald-900">
                {parsed.statedCalories ? `${parsed.statedCalories} kcal (stated)` : 'Calculated via AI'}
              </span>
            </div>

            <p className="text-base font-black text-gray-900">{parsed.cleanedFoodQuery}</p>
            <p className="text-xs text-gray-600 mt-0.5">
              Portion: <span className="font-bold text-emerald-800">{parsed.portionEstimate}</span>
            </p>

            {/* Meal Slot Picker */}
            <div className="mt-3 pt-3 border-t border-emerald-200/60">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 block mb-1.5">
                Meal Category
              </span>
              <div className="grid grid-cols-4 gap-1.5 text-center text-xs font-bold">
                {(['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => setSelectedMealType(type)}
                    className={`py-1.5 rounded-xl capitalize transition-all ${
                      selectedMealType === type
                        ? 'bg-emerald-700 text-white shadow-xs font-black'
                        : 'bg-white text-emerald-900 border border-emerald-200 hover:bg-emerald-100/50'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Log Buttons */}
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                disabled={isProcessing}
                onClick={() => handleLogMeal(false)}
                className="py-2.5 px-3 rounded-xl bg-white border border-emerald-300 text-emerald-800 font-extrabold text-xs shadow-xs hover:bg-emerald-50 active:scale-95 transition-all flex items-center justify-center gap-1"
              >
                <span>⚡</span>
                <span>Quick Log</span>
              </button>
              <button
                disabled={isProcessing}
                onClick={() => handleLogMeal(true)}
                className="py-2.5 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs shadow-soft active:scale-95 transition-all flex items-center justify-center gap-1"
              >
                {isProcessing ? (
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>✨</span>
                    <span>AI Nutrition Log</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Voice Command Suggestions */}
        <div className="mb-6">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-gray-700 mb-2">
            💡 Example Voice Commands
          </h2>
          <div className="space-y-2">
            {VOICE_TIPS.map((tip) => (
              <button
                key={tip.label}
                onClick={() => {
                  setTranscript(tip.example)
                  setManualText(tip.example)
                  stopListening()
                }}
                className="w-full text-left p-3 rounded-2xl bg-white border border-gray-100 hover:border-purple-300 shadow-card flex items-start gap-2.5 transition-all active:scale-[0.99]"
              >
                <span className="text-base shrink-0">🎙️</span>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-black uppercase text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full inline-block mb-1">
                    {tip.label}
                  </span>
                  <p className="text-xs font-bold text-gray-800 truncate">“{tip.example}”</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Today's Logged Meals */}
        {recentVoiceLogs.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-gray-700">
                📋 Today's Logged Items ({recentVoiceLogs.length})
              </h2>
              <Link to="/tracker" className="text-xs font-bold text-emerald-600 hover:underline">
                View Tracker →
              </Link>
            </div>
            <div className="space-y-1.5">
              {recentVoiceLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-3 rounded-2xl bg-white border border-gray-100 shadow-xs text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-base">🥗</span>
                    <div className="min-w-0">
                      <p className="font-bold text-gray-900 truncate">{log.product_name}</p>
                      <p className="text-[10px] text-gray-400">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  <span className="font-bold text-emerald-700 shrink-0">
                    {Math.round((log.fat_g * 9) + (log.sugars_g * 4) + 150)} kcal
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </SafeAreaView>
  )
}
