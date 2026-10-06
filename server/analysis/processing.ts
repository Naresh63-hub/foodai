import { Per100gNutrition } from './types';

export function classifyProcessingLevel(
  per100g: Per100gNutrition,
  ingredientsCategories: string[],
): 'minimally_processed' | 'processed' | 'highly_processed' | 'ultra_processed' {
  const additiveLike = new Set(['additive', 'preservative', 'colour', 'flavour_enhancer']);
  const additiveCount = ingredientsCategories.filter(c => additiveLike.has(c)).length;

  const categoryCounts: Record<string, number> = {};
  for (const c of ingredientsCategories) {
    categoryCounts[c] = (categoryCounts[c] || 0) + 1;
  }

  const sugarsG = per100g.sugars_g || 0;
  const fatG = per100g.fat_g || 0;

  const hasSugar = 'sugar' in categoryCounts;
  const hasOil = 'oil' in categoryCounts;
  const hasRefinedCarb = 'refined_carb' in categoryCounts;
  const hasWholeFood = 'whole_food' in categoryCounts;
  const hasSaltSodium = 'salt_sodium' in categoryCounts;
  const hasFlavourEnhancer = 'flavour_enhancer' in categoryCounts;

  let otherAdditives = additiveCount;
  if (hasFlavourEnhancer) {
    otherAdditives = Math.max(0, additiveCount - (categoryCounts['flavour_enhancer'] || 0));
  }

  let isUltra = false;
  if (additiveCount >= 5) {
    isUltra = true;
  } else if (sugarsG >= 25 && fatG >= 15 && additiveCount >= 2) {
    isUltra = true;
  } else if (hasFlavourEnhancer && otherAdditives >= 3) {
    isUltra = true;
  }

  if (isUltra) {
    return 'ultra_processed';
  }

  let isHighly = false;
  if (sugarsG >= 20) {
    isHighly = true;
  } else if (additiveCount >= 2 && additiveCount <= 4) {
    isHighly = true;
  } else if (hasRefinedCarb && hasOil && hasSugar) {
    isHighly = true;
  }

  if (isHighly) {
    return 'highly_processed';
  }

  let isProcessed = false;
  if (additiveCount <= 1 && (hasSaltSodium || hasSugar)) {
    isProcessed = true;
  } else if (additiveCount <= 1 && Object.keys(categoryCounts).length > 0) {
    let nonWhole = 0;
    for (const [k, v] of Object.entries(categoryCounts)) {
      if (k !== 'whole_food') nonWhole += v;
    }
    if (nonWhole > 0) {
      isProcessed = true;
    }
  }

  if (isProcessed) {
    return 'processed';
  }

  return 'minimally_processed';
}
