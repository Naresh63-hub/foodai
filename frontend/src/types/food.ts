export interface Per100gNutrition {
  sugars_g: number | null
  salt_g: number | null
  fat_g: number | null
  proteins_g: number | null
  fiber_g: number | null
  carbohydrates_g?: number | null
  saturated_fat_g?: number | null
  energy_kcal_100g?: number | null
}

export interface PerServingNutrition {
  sugars_g: number | null
  salt_g: number | null
  fat_g: number | null
  proteins_g: number | null
  fiber_g: number | null
}

export interface PctByWeightNutrition {
  sugars_pct: number | null
  salt_pct: number | null
  fat_pct: number | null
  proteins_pct: number | null
  fiber_pct: number | null
}

export interface NutritionBreakdown {
  per_100g: Per100gNutrition
  per_serving: PerServingNutrition
  pct_by_weight: PctByWeightNutrition
}

export interface IngredientAnalysis {
  id: number | string
  name: string
  category: string
  amount_g: number | null
  amount_display?: string
  purpose_text: string
  concern_text: string
  simple_explanation?: string
  regulatory_refs: {
    fssai?: string
    who_jecfa?: string
    adi_mg_per_kg?: number | null
    food_limit_mg_per_kg?: number | null
    user_daily_limit_mg?: number | null
    regulatory_status?: string
    adi_limit?: string
    [key: string]: any
  }
}

export interface SummaryInfo {
  summary: string
  key_highlights: string[]
  age_insights: string[]
  scientific_note: string
  disclaimer: string
}

export interface ProductData {
  id?: number
  barcode: string | null
  product_name: string
  brands: string
  ingredients_text: string
  serving_size: string
  product_weight_g: number | null
  source: string
  categories_tags: string[]
}

export interface HealthWarning {
  condition: string
  condition_title: string
  severity: 'danger' | 'warning' | 'info'
  badge: string
  title: string
  message: string
  action: string
  scientific_ref: string
}

export interface HealthierSwap {
  name: string
  category: string
  benefits: string
  why_better: string
  calories_density: string
  nova_group: number
}

export interface FOPNLWarning {
  type: 'HIGH_SUGAR' | 'HIGH_SALT' | 'HIGH_FAT' | string
  badge: string
  icon: string
  color: string
  title: string
  description: string
  threshold_exceeded: string
}

export interface DamageControlStep {
  icon: string
  action: string
  rationale: string
}

export interface DamageControlAdvice {
  headline: string
  portion_limit: string
  mitigation_steps: DamageControlStep[]
}

export interface ProductAnalysisResult {
  product: ProductData
  nutrition: NutritionBreakdown
  ingredients: IngredientAnalysis[]
  processing_level: 'minimally_processed' | 'processed' | 'highly_processed' | 'ultra_processed' | string
  verdict: string
  additives_count: number
  has_unknown_amount_count: number
  processing_level_label: {
    key: string
    label: string
  }
  summary_info?: SummaryInfo
  dna_breakdown?: Record<string, number>
  health_warnings?: HealthWarning[]
  healthier_swaps?: HealthierSwap[]
  fopnl_warnings?: FOPNLWarning[]
  damage_control?: DamageControlAdvice
}

export interface ComparisonResult {
  product_1: ProductAnalysisResult
  product_2: ProductAnalysisResult
  comparison: {
    sugar_diff_g: number
    salt_diff_g: number
    fat_diff_g: number
    protein_diff_g: number
    better_choice_index: 1 | 2
    better_choice_product_name: string
    rationale: string
  }
}

export interface AdditiveReferenceItem {
  id: number
  code: string
  common_name: string
  category: string
  fssai_ref: string
  who_jecfa_ref: string
  adi_mg_per_kg: number | null
  food_limit_mg_per_kg: number | null
  notes: string
  calculated_user_exposure_mg_per_day?: number | null
  explanation?: string
}

export interface UserProfileData {
  age: number | null
  body_weight_kg: number | null
  health_conditions?: string[]
}

export interface DailyFoodLogItem {
  id: string
  timestamp: string
  product_name: string
  barcode?: string
  portion_g: number
  sugars_g: number
  salt_g: number
  fat_g: number
  additives_count: number
  processing_level: string
}

export interface GroceryCartItem {
  id: string
  barcode?: string
  product_name: string
  brands: string
  processing_level: string
  sugars_100g: number
  salt_100g: number
  fat_100g: number
  additives_count: number
  has_palm_oil: boolean
  healthier_swap?: string
}
