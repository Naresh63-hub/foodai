import { parseIngredientsText, matchAdditiveReference } from './classifier';
import { computeNutrition } from './nutrition';
import { classifyProcessingLevel } from './processing';
import {
  evaluateHealthConditions,
  generateHealthierSwaps,
  evaluateFssaiFopnl,
  generateDamageControlAdvice,
  evaluateDisguisedIngredients,
  estimateGlycemicResponse,
} from './healthEvaluator';
import { generateSummary } from './explainer';
import {
  ProductData,
  ProductAnalysisResult,
  IngredientAnalysis,
} from './types';

const PROCESSING_ADJECTIVES: Record<string, string> = {
  minimally_processed: 'Minimally processed',
  processed: 'Processed',
  highly_processed: 'Highly processed',
  ultra_processed: 'Ultra-processed',
};

const CATEGORY_DEFAULT_PURPOSES: Record<string, string> = {
  sugar: 'Sweetener providing quick carbohydrate energy, sweetness, and browning.',
  oil: 'Lipid source providing texture, mouthfeel, moisture, and shelf stability.',
  refined_carb: 'Refined cereal flour/starch serving as structural base and bulk energy.',
  whole_food: 'Minimally processed whole food providing dietary fiber, micronutrients, and satiety.',
  additive: 'Functional food additive used for emulsification, stabilization, or texture control.',
  preservative: 'Preservative inhibiting microbial spoilage and extending shelf-life.',
  colour: 'Coloring agent enhancing visual appearance and color uniformity.',
  flavour_enhancer: 'Flavor enhancer boosting savory taste profile and umami perception.',
  salt_sodium: 'Essential seasoning enhancing flavor balance and providing sodium electrolyte.',
  protein_source: 'Nutrient source providing essential amino acids for tissue maintenance.',
  fiber_source: 'Dietary fiber contributing to digestive wellness and satiety.',
  other: 'Food ingredient contributing to flavor, structure, or product formulation.',
};

const CATEGORY_DEFAULT_CONCERNS: Record<string, string> = {
  sugar: 'Excess free sugar consumption is linked to elevated dental caries, insulin resistance, and weight gain.',
  oil: 'High intake of refined vegetable fats may increase calorie density and saturated fat exposure.',
  refined_carb: 'Refined starches digest rapidly with a high glycemic response; lacks natural grain fiber.',
  whole_food: 'Nutrient-dense; generally recommended in daily dietary patterns.',
  additive: 'Safe within standard regulatory thresholds (ADI); excessive cumulative intake should be monitored.',
  preservative: 'Regulated by FSSAI and WHO/JECFA; some individuals may experience sensitivity.',
  colour: 'Certain artificial food colours require dosage compliance under regulatory food safety codes.',
  flavour_enhancer: 'Safe at standard culinary levels; excessive consumption may induce temporary sensitivity in susceptible individuals.',
  salt_sodium: 'Excess dietary sodium is associated with elevated blood pressure and cardiovascular risk.',
  protein_source: 'Nutrient-dense; check for relevant allergen declarations (milk, soy, gluten).',
  fiber_source: 'Nutrient-positive; gradual dietary increase with adequate fluid intake recommended.',
  other: 'No specific toxicity when consumed within standard dietary guidelines.',
};

const PRIMARY_CATEGORY_HINTS: [string[], string][] = [
  [['sugar', 'refined_carb', 'oil'], 'sweet biscuit'],
  [['sugar', 'refined_carb', 'fat'], 'sweet biscuit'],
  [['oil', 'refined_carb', 'salt_sodium'], 'savoury snack'],
  [['refined_carb', 'sugar'], 'sweet bakery product'],
  [['protein_source', 'fiber_source'], 'nutrition bar'],
  [['protein_source'], 'dairy or protein product'],
  [['sugar'], 'confectionery'],
  [['whole_food'], 'whole food product'],
];

function derivePrimaryCategory(ingredientsCategories: string[]): string {
  const catSet = new Set(ingredientsCategories);
  for (const [requiredCats, label] of PRIMARY_CATEGORY_HINTS) {
    if (requiredCats.every(c => catSet.has(c))) {
      return label;
    }
  }
  return 'food product';
}

function generateVerdict(
  processingLevel: string,
  categoriesTags: string[] = [],
  ingredientsCategories: string[] = [],
): string {
  const adjective = PROCESSING_ADJECTIVES[processingLevel] || 'Processed';

  let primaryCategory: string | null = null;
  const meaningfulTags = categoriesTags.filter(
    t => typeof t === 'string' && t.trim().length > 0 && !['en:', 'fr:', 'de:'].includes(t.trim().toLowerCase())
  );
  if (meaningfulTags.length > 0) {
    let firstTag = meaningfulTags[0].trim().toLowerCase();
    if (firstTag.startsWith('en:')) {
      firstTag = firstTag.slice(3);
    }
    firstTag = firstTag.replace(/[-_]/g, ' ');
    if (firstTag) {
      primaryCategory = firstTag;
    }
  }

  if (!primaryCategory) {
    primaryCategory = derivePrimaryCategory(ingredientsCategories);
  }

  return `${adjective} ${primaryCategory}`;
}

export function analyzeProduct(
  product: ProductData,
  userAge?: number | null,
  userWeightKg?: number | null,
  userHealthConditions: string[] = [],
): ProductAnalysisResult {
  const parsedIngredients = parseIngredientsText(product.ingredients_text || '');
  const nutrition = computeNutrition(
    product.nutriments || {},
    product.serving_size_g,
    product.product_weight_g,
  );

  const ingredientsCategories = parsedIngredients.map(i => i.category);
  const processingLevel = classifyProcessingLevel(nutrition.per_100g, ingredientsCategories);
  const verdict = generateVerdict(processingLevel, product.categories_tags, ingredientsCategories);

  const additiveLike = new Set(['additive', 'preservative', 'colour', 'flavour_enhancer']);
  const additivesCount = ingredientsCategories.filter(c => additiveLike.has(c)).length;

  const ingredientsPayload: IngredientAnalysis[] = [];
  let hasUnknownAmountCount = 0;
  const categoryCounts: Record<string, number> = {};

  for (let idx = 0; idx < parsedIngredients.length; idx++) {
    const ing = parsedIngredients[idx];
    const ingName = ing.name;
    const category = ing.category;
    categoryCounts[category] = (categoryCounts[category] || 0) + 1;

    const amountG: number | null = null;
    hasUnknownAmountCount++;

    const additiveRef = matchAdditiveReference(ingName);

    let purposeText: string;
    let concernText: string;
    let simpleExp: string;
    let regRefs: Record<string, any>;

    if (additiveRef) {
      purposeText = additiveRef.notes || CATEGORY_DEFAULT_PURPOSES[category] || '';
      concernText = "Evaluated safe by FSSAI & JECFA within acceptable daily exposure.";
      regRefs = {
        fssai: additiveRef.fssai_ref || "Permitted under FSSAI Food Safety Standards",
        who_jecfa: additiveRef.who_jecfa_ref || "JECFA ADI Established",
        adi_mg_per_kg: additiveRef.adi_mg_per_kg,
        food_limit_mg_per_kg: additiveRef.food_limit_mg_per_kg,
      };
      if (additiveRef.adi_mg_per_kg !== null && additiveRef.adi_mg_per_kg !== undefined && userWeightKg) {
        regRefs.user_daily_limit_mg = additiveRef.adi_mg_per_kg * userWeightKg;
      }
      simpleExp = `${additiveRef.common_name} is used in food processing for stability and consistency.`;
    } else {
      purposeText = CATEGORY_DEFAULT_PURPOSES[category] || "Common food constituent.";
      concernText = CATEGORY_DEFAULT_CONCERNS[category] || "No specific safety concern flagged for this food constituent.";
      regRefs = {
        regulatory_status: "Standard food ingredient governed by FSSAI general standards",
        adi_limit: "Not specified (Food component)",
      };
      simpleExp = `${ingName} is a standard culinary ingredient categorized as ${category.replace(/_/g, ' ')}.`;
    }

    ingredientsPayload.push({
      id: idx + 1,
      name: ingName,
      category: category,
      amount_g: amountG,
      amount_display: "Amount not disclosed",
      purpose_text: purposeText,
      concern_text: concernText,
      simple_explanation: simpleExp,
      regulatory_refs: regRefs,
    });
  }

  const totalIng = parsedIngredients.length || 1;
  const dnaBreakdown: Record<string, number> = {};
  for (const [cat, count] of Object.entries(categoryCounts)) {
    dnaBreakdown[cat] = parseFloat(((count / totalIng) * 100).toFixed(1));
  }

  const healthWarnings = evaluateHealthConditions(
    product.product_name,
    product.ingredients_text || '',
    nutrition,
    processingLevel,
    userHealthConditions,
    userAge,
  );

  const healthierSwaps = generateHealthierSwaps(
    product.product_name,
    product.categories_tags,
    product.ingredients_text || '',
    processingLevel,
    nutrition,
  );

  const summaryInfo = generateSummary(
    product.product_name,
    verdict,
    processingLevel,
    nutrition,
    ingredientsPayload,
    additivesCount,
    userAge,
    userWeightKg,
  );

  const fopnlWarnings = evaluateFssaiFopnl(
    nutrition,
    product.ingredients_text || '',
  );

  const damageControl = generateDamageControlAdvice(
    product.product_name,
    nutrition,
    processingLevel,
    healthWarnings,
  );

  const disguisedIngredients = evaluateDisguisedIngredients(
    product.ingredients_text || '',
  );

  const glycemicResponse = estimateGlycemicResponse(
    nutrition,
    product.ingredients_text || '',
  );

  return {
    product: {
      id: product.id || 0,
      barcode: product.barcode || null,
      product_name: product.product_name,
      brands: product.brands || '',
      ingredients_text: product.ingredients_text || '',
      serving_size: product.serving_size || '',
      product_weight_g: product.product_weight_g || null,
      source: product.source || 'manual',
      categories_tags: product.categories_tags || [],
    },
    nutrition,
    ingredients: ingredientsPayload,
    processing_level: processingLevel,
    verdict,
    additives_count: additivesCount,
    has_unknown_amount_count: hasUnknownAmountCount,
    processing_level_label: {
      key: processingLevel,
      label: PROCESSING_ADJECTIVES[processingLevel] || 'Processed',
    },
    summary_info: summaryInfo,
    dna_breakdown: dnaBreakdown,
    health_warnings: healthWarnings,
    healthier_swaps: healthierSwaps,
    fopnl_warnings: fopnlWarnings,
    damage_control: damageControl,
    disguised_ingredients: disguisedIngredients,
    glycemic_response: glycemicResponse,
  };
}
