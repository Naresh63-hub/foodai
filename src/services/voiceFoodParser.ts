export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export interface ParsedVoiceCommand {
  rawSpeech: string
  cleanedFoodQuery: string
  mealType: MealType
  statedCalories?: number | null
  portionEstimate?: string
}

export function parseVoiceFoodCommand(speech: string): ParsedVoiceCommand {
  const raw = speech.trim()
  const text = raw.toLowerCase()

  // 1. Detect Meal Type from speech
  let mealType: MealType = 'snack'
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 11) mealType = 'breakfast'
  else if (hour >= 11 && hour < 16) mealType = 'lunch'
  else if (hour >= 16 && hour < 22) mealType = 'dinner'

  if (text.includes('breakfast')) mealType = 'breakfast'
  else if (text.includes('lunch')) mealType = 'lunch'
  else if (text.includes('dinner') || text.includes('supper')) mealType = 'dinner'
  else if (text.includes('snack') || text.includes('tea time')) mealType = 'snack'

  // 2. Extract stated calories (e.g. "log 350 calories of oatmeal" or "add 500 kcal pizza")
  let statedCalories: number | null = null
  const calorieMatch = text.match(/(\d+)\s*(?:calories|calorie|kcal|cals)\b/)
  if (calorieMatch) {
    statedCalories = parseInt(calorieMatch[1], 10)
  }

  // 3. Strip conversational commands & meal markers
  let cleaned = text
    // Strip prefixes
    .replace(/^(?:please\s+)?(?:log|add|record|track|i\s+ate|i\s+had|i\s+just\s+had|i\s+drank|put\s+down)\s+/i, '')
    .replace(/^(?:for\s+my\s+|for\s+)?(?:breakfast|lunch|dinner|snack)\s*[:,]?\s*/i, '')
    // Strip suffix markers
    .replace(/\s+(?:for|as)\s+(?:my\s+)?(?:breakfast|lunch|dinner|snack|tea)$/i, '')
    .replace(/\s+(?:today|just\s+now|earlier)$/i, '')
    // Strip "X calories of"
    .replace(/\d+\s*(?:calories|calorie|kcal|cals)\s+(?:of\s+)?/i, '')
    .trim()

  // Capitalize first letter of words
  cleaned = cleaned.replace(/\b\w/g, (char) => char.toUpperCase()).trim()

  // Fallback if empty
  if (!cleaned) {
    cleaned = raw.replace(/\b(log|add|for breakfast|for lunch|for dinner)\b/gi, '').trim() || 'Logged Meal'
  }

  // 4. Extract portion hint if found
  let portionEstimate = '1 serving (~200g)'
  const portionPattern = /(?:(?:a|an|one|\d+)\s+)?(?:(?:\w+\s+)?(?:bowl|cup|plate|slice|piece|glass|spoon|roti|chapati|egg|banana|apple|serving)s?)/i
  const match = cleaned.match(portionPattern)
  if (match) {
    portionEstimate = match[0].trim()
  }

  return {
    rawSpeech: raw,
    cleanedFoodQuery: cleaned,
    mealType,
    statedCalories,
    portionEstimate,
  }
}

// Quick caloric estimator for instant local offline logging
export function estimateCaloriesQuick(foodName: string): {
  calories: number
  carbsG: number
  proteinG: number
  fatG: number
  sugarG: number
  sodiumMg: number
} {
  const lower = foodName.toLowerCase()

  // Curated quick matches for common voice queries
  if (lower.includes('egg')) {
    const count = parseInt(lower.match(/\d+/)?.[0] || '2', 10)
    return { calories: count * 78, carbsG: count * 0.6, proteinG: count * 6.3, fatG: count * 5.3, sugarG: 0, sodiumMg: count * 62 }
  }
  if (lower.includes('biryani')) {
    return { calories: 550, carbsG: 68, proteinG: 24, fatG: 20, sugarG: 4, sodiumMg: 780 }
  }
  if (lower.includes('oat') || lower.includes('porridge')) {
    return { calories: 250, carbsG: 42, proteinG: 8, fatG: 5, sugarG: 6, sodiumMg: 120 }
  }
  if (lower.includes('salad')) {
    return { calories: 180, carbsG: 14, proteinG: 6, fatG: 11, sugarG: 4, sodiumMg: 240 }
  }
  if (lower.includes('coffee') || lower.includes('tea')) {
    return { calories: 45, carbsG: 6, proteinG: 1, fatG: 1.5, sugarG: 5, sodiumMg: 35 }
  }
  if (lower.includes('apple') || lower.includes('banana') || lower.includes('orange')) {
    return { calories: 95, carbsG: 25, proteinG: 1, fatG: 0.3, sugarG: 19, sodiumMg: 2 }
  }
  if (lower.includes('pizza') || lower.includes('burger')) {
    return { calories: 480, carbsG: 52, proteinG: 22, fatG: 21, sugarG: 6, sodiumMg: 890 }
  }
  if (lower.includes('dosa') || lower.includes('idli')) {
    return { calories: 280, carbsG: 52, proteinG: 7, fatG: 5, sugarG: 2, sodiumMg: 410 }
  }
  if (lower.includes('roti') || lower.includes('chapati')) {
    const count = parseInt(lower.match(/\d+/)?.[0] || '2', 10)
    return { calories: count * 120, carbsG: count * 22, proteinG: count * 3.5, fatG: count * 1.8, sugarG: 0.5, sodiumMg: count * 110 }
  }
  if (lower.includes('rice') || lower.includes('dal')) {
    return { calories: 340, carbsG: 60, proteinG: 12, fatG: 4, sugarG: 2, sodiumMg: 420 }
  }

  // Default balanced reference meal (~200g portion)
  return {
    calories: 320,
    carbsG: 38,
    proteinG: 14,
    fatG: 12,
    sugarG: 5,
    sodiumMg: 380,
  }
}
