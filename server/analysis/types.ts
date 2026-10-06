export interface ProductData {
  id?: number;
  barcode: string | null;
  product_name: string;
  brands: string;
  ingredients_text: string;
  serving_size: string;
  serving_size_g?: number | null;
  product_weight_g: number | null;
  source: string;
  categories_tags: string[];
  nutriments?: Record<string, any>;
}

export interface Per100gNutrition {
  sugars_g: number | null;
  salt_g: number | null;
  fat_g: number | null;
  proteins_g: number | null;
  fiber_g: number | null;
  carbohydrates_g?: number | null;
  saturated_fat_g?: number | null;
  energy_kcal_100g?: number | null;
}

export interface PerServingNutrition {
  sugars_g: number | null;
  salt_g: number | null;
  fat_g: number | null;
  proteins_g: number | null;
  fiber_g: number | null;
}

export interface PctByWeightNutrition {
  sugars_pct: number | null;
  salt_pct: number | null;
  fat_pct: number | null;
  proteins_pct: number | null;
  fiber_pct: number | null;
}

export interface NutritionBreakdown {
  per_100g: Per100gNutrition;
  per_serving: PerServingNutrition;
  pct_by_weight: PctByWeightNutrition;
}

export interface IngredientAnalysis {
  id: number | string;
  name: string;
  category: string;
  amount_g: number | null;
  amount_display?: string;
  purpose_text: string;
  concern_text: string;
  simple_explanation?: string;
  regulatory_refs: {
    fssai?: string;
    who_jecfa?: string;
    adi_mg_per_kg?: number | null;
    food_limit_mg_per_kg?: number | null;
    user_daily_limit_mg?: number | null;
    regulatory_status?: string;
    adi_limit?: string;
    [key: string]: any;
  };
}

export interface SummaryInfo {
  summary: string;
  key_highlights: string[];
  age_insights: string[];
  scientific_note: string;
  disclaimer: string;
}

export interface HealthWarning {
  condition: string;
  condition_title: string;
  severity: 'danger' | 'warning' | 'info';
  badge: string;
  title: string;
  message: string;
  action: string;
  scientific_ref: string;
}

export interface HealthierSwap {
  name: string;
  category: string;
  benefits: string;
  why_better: string;
  calories_density: string;
  nova_group: number;
}

export interface FOPNLWarning {
  type: 'HIGH_SUGAR' | 'HIGH_SALT' | 'HIGH_FAT' | string;
  badge: string;
  icon: string;
  color: string;
  title: string;
  description: string;
  threshold_exceeded: string;
}

export interface DamageControlStep {
  icon: string;
  action: string;
  rationale: string;
}

export interface DamageControlAdvice {
  headline: string;
  portion_limit: string;
  mitigation_steps: DamageControlStep[];
  disclaimer?: string;
}

export interface DisguisedIngredients {
  total_disguised_count: number;
  hidden_sugars: string[];
  hidden_salts: string[];
  hidden_fats: string[];
  summary: string;
}

export interface GlycemicResponse {
  tier: string;
  spike_score: number;
  curve_shape: 'sharp_spike' | 'moderate_rise' | 'flat_sustained' | string;
  buffering_quality: string;
  sugars_100g: number;
  fiber_100g: number;
  protein_100g: number;
  explanation: string;
}

export interface ProductAnalysisResult {
  product: ProductData;
  nutrition: NutritionBreakdown;
  ingredients: IngredientAnalysis[];
  processing_level: 'minimally_processed' | 'processed' | 'highly_processed' | 'ultra_processed' | string;
  verdict: string;
  additives_count: number;
  has_unknown_amount_count: number;
  processing_level_label: {
    key: string;
    label: string;
  };
  summary_info?: SummaryInfo;
  dna_breakdown?: Record<string, number>;
  health_warnings?: HealthWarning[];
  healthier_swaps?: HealthierSwap[];
  fopnl_warnings?: FOPNLWarning[];
  damage_control?: DamageControlAdvice;
  disguised_ingredients?: DisguisedIngredients;
  glycemic_response?: GlycemicResponse;
}

export interface AdditiveReferenceItem {
  id: number;
  code: string;
  common_name: string;
  category: string;
  fssai_ref: string;
  who_jecfa_ref: string;
  adi_mg_per_kg: number | null;
  food_limit_mg_per_kg: number | null;
  notes: string;
  calculated_user_exposure_mg_per_day?: number | null;
  explanation?: string;
}
