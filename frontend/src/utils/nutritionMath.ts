/**
 * nutritionMath.ts
 *
 * Deterministic, clinical nutrition calculation engine for multi-item plates.
 * Guarantees zero numerical drift across repeated portion adjustments and
 * explicitly flags partial or missing nutrient indicators.
 */

export interface BasePer100g {
  calories_kcal: number
  proteins_g: number
  carbohydrates_g: number
  fat_g: number
  sugars_g: number | null
  fiber_g: number | null
  sodium_mg: number | null
}

export interface PlateFoodItem {
  id: string
  food_name: string
  description?: string
  portion_g: number
  portion_unit: string // 'g' | 'cup' | 'bowl' | 'piece' | 'tbsp' | 'oz' | 'ml'
  serving_quantity: number
  calories_kcal: number
  proteins_g: number
  carbohydrates_g: number
  fat_g: number
  sugars_g: number | null
  fiber_g: number | null
  sodium_mg: number | null
  confidence_score: number
  uncertainty_note?: string
  base_per_100g?: BasePer100g
  data_source?: string
}

export interface NutrientSummaryField {
  value: number
  isComplete: boolean
  missingCount: number
  hasMissing: boolean
  formatted: string
}

export interface MealNutritionSummary {
  total_portion_g: number
  calories_kcal: number
  proteins_g: number
  carbohydrates_g: number
  fat_g: number
  sugars_g: NutrientSummaryField
  fiber_g: NutrientSummaryField
  sodium_mg: NutrientSummaryField
  macro_ratios: {
    carbs_pct: number
    protein_pct: number
    fat_pct: number
  }
  item_count: number
  overall_confidence: number
}

export const PORTION_UNITS = [
  { value: 'g', label: 'grams (g)', gramEquivalent: 1 },
  { value: 'ml', label: 'milliliters (ml)', gramEquivalent: 1 },
  { value: 'cup', label: 'cup (~200g)', gramEquivalent: 200 },
  { value: 'bowl', label: 'bowl (~250g)', gramEquivalent: 250 },
  { value: 'piece', label: 'piece / item (~80g)', gramEquivalent: 80 },
  { value: 'tbsp', label: 'tablespoon (~15g)', gramEquivalent: 15 },
  { value: 'oz', label: 'ounce (~28.3g)', gramEquivalent: 28.35 },
] as const

export function getGramWeightForUnit(
  unit: string,
  quantity: number,
  existingItem?: PlateFoodItem,
): number {
  const q = Math.max(0.1, Number(quantity) || 1)
  const normUnit = (unit || 'g').toLowerCase().trim()

  // If item already has a custom single piece weight, preserve it
  if (
    normUnit === 'piece' &&
    existingItem &&
    existingItem.portion_unit === 'piece' &&
    existingItem.serving_quantity > 0
  ) {
    const singlePieceWeight = existingItem.portion_g / existingItem.serving_quantity
    if (singlePieceWeight > 5 && singlePieceWeight < 500) {
      return Math.round(q * singlePieceWeight * 10) / 10
    }
  }

  const found = PORTION_UNITS.find((u) => u.value === normUnit)
  const eq = found ? found.gramEquivalent : 1
  return Math.round(q * eq * 10) / 10
}

/**
 * Ensures an item has a well-formed BasePer100g reference.
 */
export function ensureBasePer100g(item: PlateFoodItem): BasePer100g {
  if (item.base_per_100g) {
    return item.base_per_100g
  }

  const portionG = Math.max(1, item.portion_g || 100)
  const factor = 100 / portionG

  return {
    calories_kcal: Math.round(item.calories_kcal * factor * 10) / 10,
    proteins_g: Math.round(item.proteins_g * factor * 10) / 10,
    carbohydrates_g: Math.round(item.carbohydrates_g * factor * 10) / 10,
    fat_g: Math.round(item.fat_g * factor * 10) / 10,
    sugars_g: item.sugars_g !== null && item.sugars_g !== undefined ? Math.round(item.sugars_g * factor * 10) / 10 : null,
    fiber_g: item.fiber_g !== null && item.fiber_g !== undefined ? Math.round(item.fiber_g * factor * 10) / 10 : null,
    sodium_mg: item.sodium_mg !== null && item.sodium_mg !== undefined ? Math.round(item.sodium_mg * factor * 10) / 10 : null,
  }
}

/**
 * Deterministically scales nutrition values when quantity or unit changes.
 */
export function updateItemPortion(
  item: PlateFoodItem,
  newQuantity: number,
  newUnit?: string,
): PlateFoodItem {
  const targetUnit = newUnit || item.portion_unit || 'g'
  const validQuantity = Math.max(0.1, Number(newQuantity) || 1)
  const newPortionG = getGramWeightForUnit(targetUnit, validQuantity, item)

  const base = ensureBasePer100g(item)
  const scale = newPortionG / 100

  return {
    ...item,
    portion_unit: targetUnit,
    serving_quantity: validQuantity,
    portion_g: Math.round(newPortionG * 10) / 10,
    base_per_100g: base,
    calories_kcal: Math.round(base.calories_kcal * scale * 10) / 10,
    proteins_g: Math.round(base.proteins_g * scale * 10) / 10,
    carbohydrates_g: Math.round(base.carbohydrates_g * scale * 10) / 10,
    fat_g: Math.round(base.fat_g * scale * 10) / 10,
    sugars_g: base.sugars_g !== null ? Math.round(base.sugars_g * scale * 10) / 10 : null,
    fiber_g: base.fiber_g !== null ? Math.round(base.fiber_g * scale * 10) / 10 : null,
    sodium_mg: base.sodium_mg !== null ? Math.round(base.sodium_mg * scale * 10) / 10 : null,
  }
}

/**
 * Calculates combined meal nutrition totals from current items.
 * Non-zero missing indicators are enforced for sugars, fiber, and sodium.
 */
export function calculateMealNutritionSummary(items: PlateFoodItem[]): MealNutritionSummary {
  let totalPortion = 0
  let totalCalories = 0
  let totalProtein = 0
  let totalCarbs = 0
  let totalFat = 0

  let totalSugars = 0
  let missingSugarsCount = 0

  let totalFiber = 0
  let missingFiberCount = 0

  let totalSodium = 0
  let missingSodiumCount = 0

  let confidenceSum = 0

  for (const item of items) {
    totalPortion += Number(item.portion_g) || 0
    totalCalories += Number(item.calories_kcal) || 0
    totalProtein += Number(item.proteins_g) || 0
    totalCarbs += Number(item.carbohydrates_g) || 0
    totalFat += Number(item.fat_g) || 0

    if (item.sugars_g !== null && item.sugars_g !== undefined) {
      totalSugars += Number(item.sugars_g)
    } else {
      missingSugarsCount++
    }

    if (item.fiber_g !== null && item.fiber_g !== undefined) {
      totalFiber += Number(item.fiber_g)
    } else {
      missingFiberCount++
    }

    if (item.sodium_mg !== null && item.sodium_mg !== undefined) {
      totalSodium += Number(item.sodium_mg)
    } else {
      missingSodiumCount++
    }

    confidenceSum += Number(item.confidence_score) || 0.85
  }

  const itemCount = items.length
  const avgConfidence = itemCount > 0 ? Math.round((confidenceSum / itemCount) * 100) / 100 : 0.9

  const totalMacroCal = totalCarbs * 4 + totalProtein * 4 + totalFat * 9
  const carbsPct = totalMacroCal > 0 ? Math.round(((totalCarbs * 4) / totalMacroCal) * 100) : 0
  const proteinPct = totalMacroCal > 0 ? Math.round(((totalProtein * 4) / totalMacroCal) * 100) : 0
  const fatPct = totalMacroCal > 0 ? Math.max(0, 100 - carbsPct - proteinPct) : 0

  return {
    total_portion_g: Math.round(totalPortion * 10) / 10,
    calories_kcal: Math.round(totalCalories),
    proteins_g: Math.round(totalProtein * 10) / 10,
    carbohydrates_g: Math.round(totalCarbs * 10) / 10,
    fat_g: Math.round(totalFat * 10) / 10,
    sugars_g: {
      value: Math.round(totalSugars * 10) / 10,
      isComplete: missingSugarsCount === 0,
      missingCount: missingSugarsCount,
      hasMissing: missingSugarsCount > 0,
      formatted:
        missingSugarsCount > 0
          ? `${(Math.round(totalSugars * 10) / 10).toFixed(1)}g*`
          : `${(Math.round(totalSugars * 10) / 10).toFixed(1)}g`,
    },
    fiber_g: {
      value: Math.round(totalFiber * 10) / 10,
      isComplete: missingFiberCount === 0,
      missingCount: missingFiberCount,
      hasMissing: missingFiberCount > 0,
      formatted:
        missingFiberCount > 0
          ? `${(Math.round(totalFiber * 10) / 10).toFixed(1)}g*`
          : `${(Math.round(totalFiber * 10) / 10).toFixed(1)}g`,
    },
    sodium_mg: {
      value: Math.round(totalSodium),
      isComplete: missingSodiumCount === 0,
      missingCount: missingSodiumCount,
      hasMissing: missingSodiumCount > 0,
      formatted:
        missingSodiumCount > 0
          ? `${Math.round(totalSodium)}mg*`
          : `${Math.round(totalSodium)}mg`,
    },
    macro_ratios: {
      carbs_pct: carbsPct,
      protein_pct: proteinPct,
      fat_pct: fatPct,
    },
    item_count: itemCount,
    overall_confidence: avgConfidence,
  }
}

/**
 * Creates a brand new custom food item with sensible clinical baseline defaults.
 */
export function createCustomFoodItem(
  name: string,
  quantity = 1,
  unit = 'bowl',
  presetCategory: 'grain' | 'protein' | 'vegetable' | 'curry' | 'dairy' | 'fruit' | 'custom' = 'custom',
): PlateFoodItem {
  const normName = (name || 'Custom Food Item').trim()
  const portionG = getGramWeightForUnit(unit, quantity)

  // Clinical reference baselines per 100g
  let base: BasePer100g = {
    calories_kcal: 140,
    proteins_g: 6,
    carbohydrates_g: 18,
    fat_g: 4.5,
    sugars_g: 2,
    fiber_g: 2.5,
    sodium_mg: 180,
  }

  if (presetCategory === 'grain') {
    base = { calories_kcal: 130, proteins_g: 2.7, carbohydrates_g: 28, fat_g: 0.3, sugars_g: 0.1, fiber_g: 0.4, sodium_mg: 2 }
  } else if (presetCategory === 'protein') {
    base = { calories_kcal: 195, proteins_g: 24, carbohydrates_g: 1, fat_g: 11, sugars_g: 0, fiber_g: 0, sodium_mg: 90 }
  } else if (presetCategory === 'vegetable') {
    base = { calories_kcal: 35, proteins_g: 1.8, carbohydrates_g: 6.5, fat_g: 0.4, sugars_g: 3, fiber_g: 2.8, sodium_mg: 25 }
  } else if (presetCategory === 'curry') {
    base = { calories_kcal: 155, proteins_g: 6.5, carbohydrates_g: 12, fat_g: 9, sugars_g: 2.8, fiber_g: 2.2, sodium_mg: 320 }
  } else if (presetCategory === 'dairy') {
    base = { calories_kcal: 98, proteins_g: 5.5, carbohydrates_g: 6, fat_g: 6, sugars_g: 5.5, fiber_g: 0, sodium_mg: 65 }
  } else if (presetCategory === 'fruit') {
    base = { calories_kcal: 58, proteins_g: 0.8, carbohydrates_g: 14, fat_g: 0.2, sugars_g: 11, fiber_g: 2.4, sodium_mg: 1 }
  }

  const scale = portionG / 100

  return {
    id: `custom-item-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    food_name: normName,
    description: `User-added ${unit} portion`,
    portion_g: portionG,
    portion_unit: unit,
    serving_quantity: quantity,
    calories_kcal: Math.round(base.calories_kcal * scale * 10) / 10,
    proteins_g: Math.round(base.proteins_g * scale * 10) / 10,
    carbohydrates_g: Math.round(base.carbohydrates_g * scale * 10) / 10,
    fat_g: Math.round(base.fat_g * scale * 10) / 10,
    sugars_g: base.sugars_g !== null ? Math.round(base.sugars_g * scale * 10) / 10 : null,
    fiber_g: base.fiber_g !== null ? Math.round(base.fiber_g * scale * 10) / 10 : null,
    sodium_mg: base.sodium_mg !== null ? Math.round(base.sodium_mg * scale * 10) / 10 : null,
    confidence_score: 1.0,
    uncertainty_note: 'Manually logged by user.',
    base_per_100g: base,
    data_source: 'manual_entry',
  }
}
