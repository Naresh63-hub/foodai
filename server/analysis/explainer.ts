import * as T from './thresholds';
import { NutritionBreakdown, IngredientAnalysis, SummaryInfo } from './types';

export function generateSummary(
  productName: string,
  verdict: string,
  processingLevel: string,
  nutrition: NutritionBreakdown,
  ingredients: IngredientAnalysis[],
  additivesCount: number,
  userAge?: number | null,
  userWeightKg?: number | null,
): SummaryInfo {
  const p100 = nutrition?.per_100g || ({} as any);
  const sugarsG = p100.sugars_g;
  const saltG = p100.salt_g;
  const fatG = p100.fat_g;
  const fiberG = p100.fiber_g;
  const proteinG = p100.proteins_g;

  // 1. Main ingredient summary
  const mainIngredients = ingredients.slice(0, 4).map(i => i.name);
  const mainIngStr = mainIngredients.length ? mainIngredients.join(', ') : 'standard food ingredients';

  const summaryParts: string[] = [];
  if (ingredients.length) {
    summaryParts.push(`This product is primarily formulated from ${mainIngStr.toLowerCase()}.`);
  }

  // Highlights
  const keyHighlights: string[] = [];
  if (sugarsG !== null && sugarsG !== undefined) {
    if (sugarsG > T.DESC_SUGAR_VERY_HIGH) {
      keyHighlights.push(`High sugar content (${sugarsG.toFixed(1)}% by weight)`);
    } else if (sugarsG > T.DESC_SUGAR_MODERATE) {
      keyHighlights.push(`Moderate sugar (${sugarsG.toFixed(1)}% by weight)`);
    } else {
      keyHighlights.push(`Low sugar (${sugarsG.toFixed(1)}g / 100g)`);
    }
  }

  if (saltG !== null && saltG !== undefined) {
    if (saltG > T.DESC_SALT_HIGH) {
      keyHighlights.push(`High sodium/salt (${saltG.toFixed(1)}g / 100g)`);
    } else if (saltG > T.DESC_SALT_MODERATE) {
      keyHighlights.push(`Moderate salt (${saltG.toFixed(1)}g / 100g)`);
    }
  }

  if (fatG !== null && fatG !== undefined && fatG > T.DESC_FAT_HIGH) {
    keyHighlights.push(`High fat density (${fatG.toFixed(1)}% by weight)`);
  }

  if (fiberG !== null && fiberG !== undefined && fiberG >= T.DESC_FIBER_GOOD) {
    keyHighlights.push(`Good source of dietary fiber (${fiberG.toFixed(1)}g / 100g)`);
  }

  if (proteinG !== null && proteinG !== undefined && proteinG >= T.DESC_PROTEIN_HIGH) {
    keyHighlights.push(`High protein source (${proteinG.toFixed(1)}g / 100g)`);
  }

  if (additivesCount > 0) {
    summaryParts.push(
      `It contains ${additivesCount} detected functional additives/preservatives. The exact quantities of individual additives are not disclosed on the manufacturer label.`
    );
  } else {
    summaryParts.push("No common synthetic additives or chemical preservatives were detected.");
  }

  const whatShouldIKnow = summaryParts.join(' ');

  // 2. Age-specific advice
  const ageInsights: string[] = [];
  if (userAge !== null && userAge !== undefined) {
    if (userAge < 12) {
      ageInsights.push("For Children: WHO recommends limiting free sugars to <10% (ideally <5%) of total daily energy. Portion control is advised.");
      if (additivesCount > 2) {
        ageInsights.push("Growing children are more sensitive to artificial colours and high sodium concentrations.");
      }
    } else if (userAge < 18) {
      ageInsights.push("For Teenagers: Balanced consumption is recommended to support active growth; pair with whole foods and hydration.");
    } else {
      ageInsights.push("For Adults: Daily intake should align with overall caloric and cardiovascular health goals.");
    }
  } else {
    ageInsights.push("General Guidance: For children, limit high-sugar and high-sodium ultra-processed snacks. For adults, balance with whole fiber-rich foods.");
  }

  // 3. Scientific distinction
  const scientificNote = "Safety limits (ADI in mg/kg body weight/day) are regulatory thresholds — intake at or below the ADI is safe according to JECFA/FSSAI, but ultra-processed formulations should be eaten mindfully.";

  // 4. Medical disclaimer
  const disclaimer = "General food transparency and nutritional analysis only — not medical diagnosis or treatment advice.";

  return {
    summary: whatShouldIKnow,
    key_highlights: keyHighlights,
    age_insights: ageInsights,
    scientific_note: scientificNote,
    disclaimer: disclaimer,
  };
}
