import { NutritionBreakdown, Per100gNutrition, PerServingNutrition, PctByWeightNutrition } from './types';

function extractValue(nutriments: Record<string, any>, baseKey: string): number | null {
  const suffixes = ['_100g', '_value_g', '_value', ''];
  for (const suffix of suffixes) {
    const key = baseKey + suffix;
    if (nutriments && key in nutriments && nutriments[key] !== null && nutriments[key] !== undefined) {
      const val = parseFloat(nutriments[key]);
      if (!isNaN(val)) return val;
    }
  }
  return null;
}

export function computeNutrition(
  nutriments: Record<string, any> = {},
  servingSizeG: number | null = null,
  productWeightG: number | null = null,
): NutritionBreakdown {
  const per100g: Per100gNutrition = {
    sugars_g: extractValue(nutriments, 'sugars'),
    salt_g: extractValue(nutriments, 'salt'),
    fat_g: extractValue(nutriments, 'fat'),
    proteins_g: extractValue(nutriments, 'proteins'),
    fiber_g: extractValue(nutriments, 'fiber'),
    carbohydrates_g: extractValue(nutriments, 'carbohydrates'),
    saturated_fat_g: extractValue(nutriments, 'saturated-fat') ?? extractValue(nutriments, 'saturated_fat'),
    energy_kcal_100g: extractValue(nutriments, 'energy-kcal') ?? extractValue(nutriments, 'energy_kcal'),
  };

  const perServing: PerServingNutrition = {
    sugars_g: per100g.sugars_g !== null && servingSizeG !== null ? (per100g.sugars_g * servingSizeG) / 100.0 : null,
    salt_g: per100g.salt_g !== null && servingSizeG !== null ? (per100g.salt_g * servingSizeG) / 100.0 : null,
    fat_g: per100g.fat_g !== null && servingSizeG !== null ? (per100g.fat_g * servingSizeG) / 100.0 : null,
    proteins_g: per100g.proteins_g !== null && servingSizeG !== null ? (per100g.proteins_g * servingSizeG) / 100.0 : null,
    fiber_g: per100g.fiber_g !== null && servingSizeG !== null ? (per100g.fiber_g * servingSizeG) / 100.0 : null,
  };

  const pctByWeight: PctByWeightNutrition = {
    sugars_pct: per100g.sugars_g,
    salt_pct: per100g.salt_g,
    fat_pct: per100g.fat_g,
    proteins_pct: per100g.proteins_g,
    fiber_pct: per100g.fiber_g,
  };

  return {
    per_100g: per100g,
    per_serving: perServing,
    pct_by_weight: pctByWeight,
  };
}
