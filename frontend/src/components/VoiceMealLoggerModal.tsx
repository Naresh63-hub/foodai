import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useWebSpeech } from '../hooks/useWebSpeech'
import { parseVoiceFoodCommand, estimateCaloriesQuick, MealType } from '../services/voiceFoodParser'
import { analyzeFoodNutrition } from '../api/food'
import { useAuth } from '../contexts/AuthContext'
import { saveDailyLogToFirestore, saveFoodScanToFirestore } from '../services/firestoreService'
import { useUserPreferences } from '../hooks/useUserPreferences'
import { DailyFoodLogItem } from '../types/food'

interface VoiceMealLoggerModalProps {
  isOpen: boolean
  onClose: () => void
  onMealLogged?: (meal: any) => void
  defaultMealType?: MealType
}

const VOICE_EXAMPLES = [
  '2 boiled eggs and black coffee for breakfast',
  '1 bowl of chicken biryani with raita for lunch',
  'Oatmeal with sliced banana and honey',
  'Grilled salmon with brown rice and asparagus',
  'Greek yogurt with walnuts as a snack',
]

export default function VoiceMealLoggerModal({
  isOpen,
  onClose,
  onMealLogged,
  defaultMealType,
}: VoiceMealLoggerModalProps) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { values: userPrefs } = useUserPreferences()

  const [selectedMealType, setSelectedMealType] = useState<MealType>(defaultMealType || 'lunch')
  const [manualInput, setManualInput] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [analyzedPreview, setAnalyzedPreview] = useState<any>(null)

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

  // Start listening automatically when modal opens
  useEffect(() => {
    if (isOpen) {
      resetTranscript()
      setAnalyzedPreview(null)
      setManualInput('')
      if (isSupported) {
        // Short delay to let modal mount smoothly
        const t = setTimeout(() => {
          startListening()
        }, 300)
        return () => clearTimeout(t)
      }
    } else {
      stopListening()
    }
  }, [isOpen, isSupported])

  // Automatically update parsed meal when speech transcript updates
  useEffect(() => {
    const activeText = transcript.trim() || manualInput.trim()
    if (activeText) {
      const parsed = parseVoiceFoodCommand(activeText)
      if (parsed.mealType) {
        setSelectedMealType(parsed.mealType)
      }
    }
  }, [transcript, manualInput])

  if (!isOpen) return null

  const activeSpeechText = (transcript + (interimTranscript ? ` ${interimTranscript}` : '')).trim() || manualInput.trim()
  const parsed = activeSpeechText ? parseVoiceFoodCommand(activeSpeechText) : null

  // Execute Meal Logging
  const handleLogMeal = async (useAiNutrition = false) => {
    const foodName = parsed?.cleanedFoodQuery || manualInput.trim()
    if (!foodName) {
      toast.error('Please speak or type a food description first')
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

      // If user requested AI deep nutrition or no stated calories, call Gemini endpoint
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
        } catch (aiErr) {
          console.warn('Gemini AI nutrition call failed, using quick estimator fallback:', aiErr)
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

      // 1. Save to LocalStorage
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

      // 2. Sync to Firestore (Daily Logs & Food Scans)
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

      // 3. Audio Voice Confirmation (Web Speech API speechSynthesis)
      const spokenFeedback = `Logged ${foodName} for ${selectedMealType}, ${finalCalories} calories.`
      speak(spokenFeedback)

      toast.success(
        <div>
          <p className="font-bold">🎙️ Voice Log Successful!</p>
          <p className="text-xs text-gray-500">{foodName} · {finalCalories} kcal · {selectedMealType.toUpperCase()}</p>
        </div>
      )

      onMealLogged?.(newLogItem)
      onClose()
    } catch (err: any) {
      console.error('Failed to log voice meal:', err)
      toast.error('Failed to log meal. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSelectExample = (ex: string) => {
    setManualInput(ex)
    setTranscript(ex)
    stopListening()
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="voice-modal-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 overflow-y-auto animate-fadeIn"
    >
      <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-gray-100 p-5 sm:p-6 overflow-hidden relative max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center text-lg shadow-sm">
              🎙️
            </span>
            <div>
              <h2 id="voice-modal-title" className="text-base font-black text-gray-900 leading-tight">
                Voice Meal Logger
              </h2>
              <p className="text-[11px] text-gray-500 font-medium">
                Web Speech API & Firestore Sync
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Audio speech synthesis toggle */}
            <button
              onClick={() => setTtsEnabled(!ttsEnabled)}
              title={ttsEnabled ? 'Voice feedback audio is ON' : 'Voice feedback audio is OFF'}
              className={`p-2 rounded-xl text-xs font-bold transition-all border ${
                ttsEnabled
                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                  : 'bg-gray-50 text-gray-400 border-gray-200'
              }`}
            >
              {ttsEnabled ? '🔊 Audio ON' : '🔈 Muted'}
            </button>

            <button
              onClick={() => {
                stopListening()
                onClose()
              }}
              className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center font-bold text-sm transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {/* Pulsing Microphone Center Display */}
          <div className="flex flex-col items-center justify-center py-4 bg-gradient-to-b from-gray-50/80 to-white rounded-3xl border border-gray-100">
            <div className="relative">
              {isListening && (
                <>
                  <div className="absolute inset-0 rounded-full bg-red-400/20 animate-ping" />
                  <div className="absolute -inset-3 rounded-full bg-red-500/10 animate-pulse" />
                </>
              )}
              <button
                type="button"
                onClick={() => {
                  if (isListening) stopListening()
                  else startListening()
                }}
                className={`relative w-20 h-20 rounded-full flex items-center justify-center text-3xl shadow-soft transition-all duration-300 ${
                  isListening
                    ? 'bg-gradient-to-tr from-red-600 to-rose-500 text-white scale-105 shadow-red-200'
                    : 'bg-gradient-to-tr from-purple-600 via-indigo-600 to-emerald-600 text-white hover:scale-105'
                }`}
              >
                {isListening ? '🛑' : '🎙️'}
              </button>
            </div>

            <p className="mt-3 text-xs font-bold tracking-wide uppercase text-gray-500">
              {isListening ? (
                <span className="inline-flex items-center gap-1.5 text-red-600 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-red-600" />
                  Listening... speak your meal
                </span>
              ) : (
                'Tap microphone to speak'
              )}
            </p>

            <p className="text-[11px] text-gray-400 text-center max-w-[280px] mt-0.5">
              “Log 2 eggs and coffee for breakfast” or “1 bowl chicken salad”
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
              <span className="text-base shrink-0">⚠️</span>
              <p className="flex-1 leading-snug">{error}</p>
            </div>
          )}

          {/* Live Recognized Speech Transcript */}
          <div className="rounded-2xl bg-white border border-gray-200 p-3.5 shadow-xs">
            <div className="flex items-center justify-between mb-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              <span>Spoken Command Transcript</span>
              {activeSpeechText && (
                <button
                  onClick={() => {
                    resetTranscript()
                    setManualInput('')
                  }}
                  className="text-gray-400 hover:text-gray-600 lowercase"
                >
                  clear
                </button>
              )}
            </div>

            {activeSpeechText ? (
              <p className="text-sm font-semibold text-gray-900 leading-relaxed">
                <span>{transcript}</span>
                {interimTranscript && (
                  <span className="text-gray-400 italic"> {interimTranscript}</span>
                )}
                {!transcript && interimTranscript && (
                  <span className="text-gray-500 italic">{interimTranscript}</span>
                )}
              </p>
            ) : (
              <p className="text-xs text-gray-400 italic">
                {isListening
                  ? 'Start speaking your food or meal...'
                  : 'No speech captured yet. Tap microphone above or choose an example below.'}
              </p>
            )}
          </div>

          {/* Parsed Meal Interpretation Card */}
          {parsed?.cleanedFoodQuery && (
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50/70 border border-emerald-200 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800">
                  ✨ Detected Food
                </span>
                <span className="text-xs font-black text-emerald-900">
                  {parsed.statedCalories ? `${parsed.statedCalories} kcal stated` : 'Auto calories'}
                </span>
              </div>

              <p className="text-sm font-black text-gray-900">{parsed.cleanedFoodQuery}</p>
              <p className="text-[11px] text-gray-600 mt-0.5">
                Portion: <span className="font-semibold text-emerald-800">{parsed.portionEstimate}</span>
              </p>

              {/* Meal Type Selector Buttons */}
              <div className="mt-3 pt-2.5 border-t border-emerald-200/60">
                <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider mb-1.5">
                  Meal Slot
                </p>
                <div className="grid grid-cols-4 gap-1.5 text-center text-xs font-bold">
                  {(['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setSelectedMealType(type)}
                      className={`py-1.5 px-1 rounded-xl capitalize transition-all ${
                        selectedMealType === type
                          ? 'bg-emerald-700 text-white shadow-xs font-black'
                          : 'bg-white/80 text-emerald-950 border border-emerald-200 hover:bg-white'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Quick Example Prompt Chips */}
          <div>
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
              <span>⚡</span>
              <span>Quick Voice Examples</span>
            </p>
            <div className="flex flex-wrap gap-1.5">
              {VOICE_EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => handleSelectExample(ex)}
                  className="text-left text-xs bg-gray-100 hover:bg-gray-200 border border-gray-200/80 rounded-xl px-2.5 py-1.5 text-gray-700 transition-all active:scale-95"
                >
                  🎙️ {ex}
                </button>
              ))}
            </div>
          </div>

          {/* Fallback Manual Typing */}
          {!isSupported && (
            <div className="pt-2">
              <label className="block text-[11px] font-bold text-gray-600 mb-1">
                Type meal command (Web Speech API unavailable in this browser):
              </label>
              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="e.g. 2 eggs and toast for breakfast"
                className="w-full text-xs p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-400 focus:outline-hidden"
              />
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-gray-100 grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={isProcessing || (!parsed?.cleanedFoodQuery && !manualInput.trim())}
            onClick={() => handleLogMeal(false)}
            className="w-full py-3 px-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-50 text-white font-extrabold text-xs shadow-soft flex items-center justify-center gap-1.5 transition-all"
          >
            {isProcessing ? (
              <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>⚡</span>
                <span>Fast 1-Tap Log</span>
              </>
            )}
          </button>

          <button
            type="button"
            disabled={isProcessing || (!parsed?.cleanedFoodQuery && !manualInput.trim())}
            onClick={() => handleLogMeal(true)}
            className="w-full py-3 px-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 active:scale-[0.98] disabled:opacity-50 text-white font-extrabold text-xs shadow-soft flex items-center justify-center gap-1.5 transition-all"
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
    </div>
  )
}
