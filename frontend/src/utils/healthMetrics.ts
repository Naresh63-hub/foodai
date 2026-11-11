export interface ConditionOption {
  id: string
  title: string
  icon: string
  description: string
  category: 'metabolic' | 'cardio' | 'allergy' | 'special'
}

export const AVAILABLE_CONDITIONS: ConditionOption[] = [
  {
    id: 'diabetes',
    title: 'Diabetes / Pre-diabetes',
    icon: '🩸',
    description: 'Warns on high simple sugars, maltodextrin, high GI syrups & fast carbs.',
    category: 'metabolic',
  },
  {
    id: 'hypertension',
    title: 'Hypertension / High BP',
    icon: '🫀',
    description: 'Flags high sodium (>1.25g salt/100g), MSG, sodium benzoate & baking soda.',
    category: 'cardio',
  },
  {
    id: 'heart_disease',
    title: 'High Cholesterol / Heart Health',
    icon: '🧈',
    description: 'Alerts on refined palm oil, hydrogenated fats, trans fats & saturated lipids.',
    category: 'cardio',
  },
  {
    id: 'child_mode',
    title: 'Child Mode (<12 yrs)',
    icon: '👶',
    description: 'Strict checks for synthetic azo dyes (Tartrazine, Sunset Yellow) & excess sugar.',
    category: 'special',
  },
  {
    id: 'celiac',
    title: 'Celiac / Gluten Sensitivity',
    icon: '🌾',
    description: 'Strict alerts for wheat, maida, atta, barley, rye, malt & gluten grains.',
    category: 'allergy',
  },
  {
    id: 'lactose',
    title: 'Lactose Intolerance',
    icon: '🥛',
    description: 'Detects milk solids, whey protein, casein, butterfat & dairy derivatives.',
    category: 'allergy',
  },
  {
    id: 'nut_allergy',
    title: 'Nut & Peanut Allergy',
    icon: '🥜',
    description: 'Severe allergy warning for peanuts, cashews, almonds & tree nuts.',
    category: 'allergy',
  },
  {
    id: 'soy_allergy',
    title: 'Soy Allergy',
    icon: '🌱',
    description: 'Flags soy protein, soya lecithin (INS 322) & soybean derivatives.',
    category: 'allergy',
  },
  {
    id: 'kidney_disease',
    title: 'Kidney / Renal Health',
    icon: '🫘',
    description: 'Warns on inorganic phosphate & potassium additives causing filtration strain.',
    category: 'metabolic',
  },
  {
    id: 'fatty_liver',
    title: 'Fatty Liver / NAFLD',
    icon: '🩺',
    description: 'Monitors high-fructose corn syrup, liquid sugars & hepatic fat drivers.',
    category: 'metabolic',
  },
  {
    id: 'pcos',
    title: 'PCOS / Hormonal Balance',
    icon: '🌸',
    description: 'Warns on high glycemic refined sugars & simple starches worsening insulin resistance.',
    category: 'metabolic',
  },
  {
    id: 'pregnancy',
    title: 'Pregnancy & Nursing Safe Mode',
    icon: '🤰',
    description: 'Flags unpasteurized dairy, synthetic sweeteners (saccharin), and excess stimulants.',
    category: 'special',
  },
  {
    id: 'low_fodmap',
    title: 'IBS / Low FODMAP & Gut Care',
    icon: '🌿',
    description: 'Detects fermentable polyols (maltitol, sorbitol) and isolated inulin fibers causing bloating.',
    category: 'special',
  },
]

export const CONDITION_MAP: Record<string, ConditionOption> = Object.fromEntries(
  AVAILABLE_CONDITIONS.map((c) => [c.id, c])
)

export interface SelectOption {
  value: string
  label: string
}

export const GENDER_OPTIONS: SelectOption[] = [
  { value: '', label: 'Prefer not to say' },
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
]

export const ACTIVITY_LEVEL_OPTIONS: SelectOption[] = [
  { value: '', label: 'Not set' },
  { value: 'sedentary', label: 'Sedentary (Desk / Minimal exercise)' },
  { value: 'light', label: 'Lightly Active (1–3 days/week)' },
  { value: 'moderate', label: 'Moderately Active (3–5 days/week)' },
  { value: 'active', label: 'Very Active (6–7 days/week)' },
  { value: 'very_active', label: 'Athlete / Physical job' },
]

export const DIETARY_PREFERENCE_OPTIONS: SelectOption[] = [
  { value: '', label: 'No Restriction (Omnivore)' },
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'vegan', label: 'Vegan (Plant-based)' },
  { value: 'eggetarian', label: 'Eggetarian' },
  { value: 'pescatarian', label: 'Pescatarian' },
  { value: 'jain', label: 'Jain (No root veggies)' },
  { value: 'keto', label: 'Keto / Low-Carb' },
  { value: 'halal', label: 'Halal' },
]

export const HEALTH_GOAL_OPTIONS: SelectOption[] = [
  { value: '', label: 'General Wellness' },
  { value: 'lose_weight', label: 'Fat Loss / Calorie Deficit' },
  { value: 'maintain', label: 'Maintain Healthy Weight' },
  { value: 'gain_muscle', label: 'Muscle Gain / High Protein' },
  { value: 'manage_blood_sugar', label: 'Blood Sugar Control' },
  { value: 'heart_health', label: 'Heart & Cholesterol Care' },
]

/** Look up a human-readable label for a preference select option. */
export function getOptionLabel(options: SelectOption[], value?: string): string {
  if (!value) return options[0]?.label ?? 'Not set'
  return options.find((o) => o.value === value)?.label ?? value
}

/** Calculate Body Mass Index (BMI) from weight in kg and height in cm. */
export function calculateBMI(weightStr?: string | number | null, heightStr?: string | number | null): number | null {
  const weight = Number(weightStr)
  const heightCm = Number(heightStr)
  if (!Number.isFinite(weight) || !Number.isFinite(heightCm) || weight <= 0 || heightCm <= 0) {
    return null
  }
  const heightM = heightCm / 100
  const bmi = weight / (heightM * heightM)
  return Math.round(bmi * 10) / 10
}

/** Return BMI clinical category and Tailwind badge colors. */
export function getBMICategory(bmi: number): { label: string; badgeClass: string } {
  if (bmi < 18.5) {
    return { label: 'Underweight', badgeClass: 'bg-sky-100 text-sky-800 border-sky-200' }
  }
  if (bmi < 25) {
    return { label: 'Healthy', badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200' }
  }
  if (bmi < 30) {
    return { label: 'Overweight', badgeClass: 'bg-amber-100 text-amber-800 border-amber-200' }
  }
  return { label: 'Obese', badgeClass: 'bg-rose-100 text-rose-800 border-rose-200' }
}

const ACTIVITY_MULTIPLIERS: Record<string, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
}

/**
 * Estimate recommended daily calorie intake using the Mifflin-St Jeor equation
 * adjusted for activity level and health goal.
 */
export function estimateDailyCalories(params: {
  age?: string | number | null
  weight?: string | number | null
  height?: string | number | null
  gender?: string
  activityLevel?: string
  healthGoal?: string
}): number | null {
  const age = Number(params.age)
  const weight = Number(params.weight)
  const height = Number(params.height)

  if (!Number.isFinite(age) || !Number.isFinite(weight) || !Number.isFinite(height)) {
    return null
  }
  if (age <= 0 || weight <= 0 || height <= 0) {
    return null
  }

  let genderOffset = -78 // neutral midpoint when gender is unspecified
  if (params.gender === 'male') genderOffset = 5
  else if (params.gender === 'female') genderOffset = -161

  const bmr = 10 * weight + 6.25 * height - 5 * age + genderOffset
  const multiplier = ACTIVITY_MULTIPLIERS[params.activityLevel || ''] ?? 1.375
  let target = bmr * multiplier

  if (params.healthGoal === 'lose_weight') target -= 400
  else if (params.healthGoal === 'gain_muscle') target += 300

  return Math.max(1200, Math.round(target / 10) * 10)
}
