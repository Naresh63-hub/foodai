import * as T from './thresholds';
import {
  NutritionBreakdown,
  HealthWarning,
  HealthierSwap,
  FOPNLWarning,
  DamageControlAdvice,
  DisguisedIngredients,
  GlycemicResponse,
} from './types';

const GLUTEN_KEYWORDS = [
  /\bwheat\b/i, /\bmaida\b/i, /\batta\b/i, /\bbarley\b/i, /\brye\b/i,
  /\bgluten\b/i, /\bspelt\b/i, /\bsemolina\b/i, /\bsuji\b/i, /\brava\b/i,
  /\bmalt\b/i, /\bmalted\b/i, /\btriticale\b/i, /\bflour\b/i
];

const DAIRY_KEYWORDS = [
  /\bmilk\b/i, /\bwhey\b/i, /\blactose\b/i, /\bcasein\b/i, /\bcaseinate\b/i,
  /\bbutter\b/i, /\bcheese\b/i, /\bcurd\b/i, /\byogurt\b/i, /\bcream\b/i,
  /\bghee\b/i, /\bdairy\b/i, /\bmilk solids\b/i, /\bskimmed milk\b/i
];

const UNHEALTHY_FATS_KEYWORDS = [
  /\bpalm oil\b/i, /\bpalmolein\b/i, /\bhydrogenated\b/i, /\bpartially hydrogenated\b/i,
  /\bvanaspati\b/i, /\bmargarine\b/i, /\binteresterified\b/i, /\btrans fat\b/i
];

const CHILD_ALERT_ADDITIVES: [RegExp, string][] = [
  [/\b(e\s*102|ins\s*102|tartrazine)\b/i, "Tartrazine (INS 102 / Yellow 5)"],
  [/\b(e\s*110|ins\s*110|sunset yellow)\b/i, "Sunset Yellow (INS 110 / Yellow 6)"],
  [/\b(e\s*122|ins\s*122|carmoisine|azorubine)\b/i, "Carmoisine (INS 122)"],
  [/\b(e\s*124|ins\s*124|ponceau 4r)\b/i, "Ponceau 4R (INS 124)"],
  [/\b(e\s*129|ins\s*129|allura red)\b/i, "Allura Red (INS 129 / Red 40)"],
  [/\b(e\s*133|ins\s*133|brilliant blue)\b/i, "Brilliant Blue (INS 133 / Blue 1)"],
  [/\b(caffeine|coffee extract|guarana|taurine)\b/i, "Caffeine / Stimulants"],
  [/\b(aspartame|sucralose|acesulfame|saccharin)\b/i, "Synthetic Intense Sweeteners"],
];

const SODIUM_ADDITIVES: [RegExp, string][] = [
  [/\b(e\s*621|ins\s*621|monosodium glutamate|msg)\b/i, "Monosodium Glutamate (MSG / INS 621)"],
  [/\b(e\s*211|ins\s*211|sodium benzoate)\b/i, "Sodium Benzoate (INS 211)"],
  [/\b(e\s*631|ins\s*631|disodium inosinate)\b/i, "Disodium Inosinate (INS 631)"],
  [/\b(e\s*627|ins\s*627|disodium guanylate)\b/i, "Disodium Guanylate (INS 627)"],
  [/\b(e\s*500ii|ins\s*500ii|sodium bicarbonate|baking soda)\b/i, "Sodium Bicarbonate (INS 500ii)"],
  [/\b(e\s*250|ins\s*250|sodium nitrite)\b/i, "Sodium Nitrite (INS 250)"],
];

const PHOSPHORUS_POTASSIUM_ADDITIVES: [RegExp, string][] = [
  [/\b(e\s*338|ins\s*338|phosphoric acid)\b/i, "Phosphoric Acid (INS 338)"],
  [/\b(e\s*452|ins\s*452|polyphosphate)\b/i, "Polyphosphates (INS 452)"],
  [/\b(e\s*450|ins\s*450|diphosphate)\b/i, "Diphosphates (INS 450)"],
  [/\b(e\s*202|ins\s*202|potassium sorbate)\b/i, "Potassium Sorbate (INS 202)"],
  [/\b(e\s*508|ins\s*508|potassium chloride)\b/i, "Potassium Chloride (INS 508)"],
];

const DISGUISED_SUGAR_PATTERNS: [RegExp, string][] = [
  [/\b(maltodextrin|malto-dextrin)\b/i, "Maltodextrin (High Glycemic Hydrolysed Starch)"],
  [/\b(invert sugar|invert syrup)\b/i, "Invert Sugar Syrup"],
  [/\b(high fructose corn syrup|hfcs)\b/i, "High-Fructose Corn Syrup (HFCS)"],
  [/\b(glucose syrup|liquid glucose|corn syrup solids)\b/i, "Glucose Syrup / Corn Syrup Solids"],
  [/\b(dextrose|d-glucose)\b/i, "Dextrose / Pure D-Glucose"],
  [/\b(agave nectar|agave syrup)\b/i, "Agave Nectar (Concentrated Fructose)"],
  [/\b(malt extract|barley malt extract)\b/i, "Malt Extract (Maltose Rich)"],
  [/\b(cane juice crystals|evaporated cane juice)\b/i, "Cane Juice Crystals"],
  [/\b(trehalose|isomaltulose)\b/i, "Trehalose / Isomaltulose"],
  [/\b(golden syrup|molasses|caramel sugar)\b/i, "Golden Syrup / Molasses"],
  [/\b(fructose syrup|fruit sugar concentrate)\b/i, "Fruit Sugar Concentrate / Fructose"],
];

const DISGUISED_SALT_PATTERNS: [RegExp, string][] = [
  [/\b(e\s*621|ins\s*621|monosodium glutamate|msg)\b/i, "Monosodium Glutamate (MSG / INS 621)"],
  [/\b(e\s*631|ins\s*631|disodium inosinate)\b/i, "Disodium Inosinate (INS 631)"],
  [/\b(e\s*627|ins\s*627|disodium guanylate)\b/i, "Disodium Guanylate (INS 627)"],
  [/\b(e\s*211|ins\s*211|sodium benzoate)\b/i, "Sodium Benzoate (INS 211)"],
  [/\b(e\s*223|ins\s*223|sodium metabisulphite)\b/i, "Sodium Metabisulphite (INS 223)"],
  [/\b(e\s*500ii|ins\s*500ii|sodium bicarbonate|baking soda)\b/i, "Sodium Bicarbonate (INS 500ii)"],
  [/\b(e\s*331|ins\s*331|sodium citrate|trisodium citrate)\b/i, "Sodium Citrate (INS 331)"],
  [/\b(e\s*452|ins\s*452|sodium polyphosphate)\b/i, "Sodium Polyphosphate (INS 452)"],
];

const DISGUISED_FAT_PATTERNS: [RegExp, string][] = [
  [/\b(palm oil|refined palm oil|palmolein|superolein)\b/i, "Refined Palm Oil / Palmolein"],
  [/\b(hydrogenated vegetable oil|vanaspati)\b/i, "Hydrogenated Industrial Fat (Vanaspati)"],
  [/\b(partially hydrogenated)\b/i, "Partially Hydrogenated Oil (Trans Fat Source)"],
  [/\b(interesterified vegetable fat)\b/i, "Interesterified Vegetable Fat"],
  [/\b(fractionated palm kernel oil)\b/i, "Fractionated Palm Kernel Oil"],
];

function hasKeyword(text: string, regexList: RegExp[]): boolean {
  if (!text) return false;
  return regexList.some(r => r.test(text));
}

function findMatchingAdditives(text: string, patterns: [RegExp, string][]): string[] {
  if (!text) return [];
  const found: string[] = [];
  for (const [regex, name] of patterns) {
    if (regex.test(text)) {
      found.push(name);
    }
  }
  return found;
}

export function evaluateDisguisedIngredients(ingredientsText: string): DisguisedIngredients {
  if (!ingredientsText) {
    return {
      total_disguised_count: 0,
      hidden_sugars: [],
      hidden_salts: [],
      hidden_fats: [],
      summary: "No ingredients text available to analyze disguised additives.",
    };
  }

  const hiddenSugars = findMatchingAdditives(ingredientsText, DISGUISED_SUGAR_PATTERNS);
  const hiddenSalts = findMatchingAdditives(ingredientsText, DISGUISED_SALT_PATTERNS);
  const hiddenFats = findMatchingAdditives(ingredientsText, DISGUISED_FAT_PATTERNS);
  const totalCount = hiddenSugars.length + hiddenSalts.length + hiddenFats.length;

  const summaryParts: string[] = [];
  if (hiddenSugars.length) summaryParts.push(`${hiddenSugars.length} disguised added sugar(s)`);
  if (hiddenSalts.length) summaryParts.push(`${hiddenSalts.length} technical sodium additive(s)`);
  if (hiddenFats.length) summaryParts.push(`${hiddenFats.length} industrial refined fat(s)`);

  const summary = summaryParts.length
    ? `Detected ${summaryParts.join(', ')} in the formulation.`
    : "No common disguised industrial sugars, hidden sodium salts, or trans-fat sources detected.";

  return {
    total_disguised_count: totalCount,
    hidden_sugars: hiddenSugars,
    hidden_salts: hiddenSalts,
    hidden_fats: hiddenFats,
    summary,
  };
}

export function estimateGlycemicResponse(
  nutrition: NutritionBreakdown,
  ingredientsText: string = '',
): GlycemicResponse {
  const p100 = nutrition?.per_100g || ({} as any);
  const sugars = p100.sugars_g || 0.0;
  const fiber = p100.fiber_g || 0.0;
  const protein = p100.proteins_g || 0.0;
  const fat = p100.fat_g || 0.0;

  const textLower = (ingredientsText || '').toLowerCase();
  const hasRefinedFlour = ['maida', 'refined wheat', 'starch', 'corn starch', 'maltodextrin'].some(k => textLower.includes(k));
  const hasWholeGrains = ['whole wheat', 'oats', 'millet', 'ragi', 'quinoa', 'brown rice', 'chana'].some(k => textLower.includes(k));

  const baseScore = Math.min(10.0, Math.max(1.0, (sugars * 0.25) + (hasRefinedFlour ? 3.0 : 1.0)));
  let bufferReduction = (fiber * 0.4) + (protein * 0.15);
  if (hasWholeGrains) bufferReduction += 1.5;

  const spikeScore = parseFloat(Math.max(1.0, Math.min(10.0, baseScore - bufferReduction)).toFixed(1));

  let tier: string;
  let curveShape: string;
  let buffering: string;
  let explanation: string;

  if (spikeScore >= 7.0) {
    tier = "High (Fast Glucose Surge)";
    curveShape = "sharp_spike";
    buffering = "Poor";
    explanation = `High proportion of simple sugars (${sugars}g/100g) and refined carbohydrates with low protective dietary fiber (${fiber}g). Causes a rapid postprandial blood glucose elevation followed by a reactive insulin dip.`;
  } else if (spikeScore >= 4.0) {
    tier = "Moderate (Gradual Rise)";
    curveShape = "moderate_rise";
    buffering = "Moderate";
    explanation = `Moderate carbohydrate content with some buffering from protein (${protein}g) and fats (${fat}g), providing a manageable, steady blood glucose release.`;
  } else {
    tier = "Low (Sustained Energy)";
    curveShape = "flat_sustained";
    buffering = "Strong";
    explanation = `Favorable nutrient balance with low free sugar (${sugars}g) and good dietary buffering (${fiber}g fiber, ${protein}g protein). Supports sustained metabolic energy without sudden glycemic spikes.`;
  }

  return {
    tier,
    spike_score: spikeScore,
    curve_shape: curveShape,
    buffering_quality: buffering,
    sugars_100g: sugars,
    fiber_100g: fiber,
    protein_100g: protein,
    explanation,
  };
}

export function evaluateFssaiFopnl(
  nutrition: NutritionBreakdown,
  ingredientsText: string = '',
): FOPNLWarning[] {
  const p100 = nutrition?.per_100g || ({} as any);
  const sugars100g = p100.sugars_g || 0.0;
  const salt100g = p100.salt_g || 0.0;
  const fat100g = p100.fat_g || 0.0;

  const flags: FOPNLWarning[] = [];

  if (sugars100g >= T.SUGAR_HIGH) {
    flags.push({
      type: "HIGH_SUGAR",
      badge: "HIGH SUGAR",
      icon: "🛑",
      color: "rose",
      title: `High Sugar (${sugars100g.toFixed(1)}g / 100g)`,
      description: "Exceeds FSSAI/WHO front-of-pack threshold (15g/100g). Supplies rapid empty calories.",
      threshold_exceeded: `${sugars100g.toFixed(1)}g vs 15.0g limit`,
    });
  }

  if (salt100g >= T.SALT_HIGH) {
    const sodiumMg = salt100g * 400;
    flags.push({
      type: "HIGH_SALT",
      badge: "HIGH SODIUM",
      icon: "🛑",
      color: "red",
      title: `High Salt (${salt100g.toFixed(2)}g / 100g)`,
      description: `Provides ${sodiumMg.toFixed(0)}mg sodium per 100g, exceeding FSSAI threshold (1.25g salt).`,
      threshold_exceeded: `${salt100g.toFixed(2)}g vs 1.25g limit`,
    });
  }

  const hasPalm = hasKeyword(ingredientsText, UNHEALTHY_FATS_KEYWORDS);
  if (fat100g >= T.FAT_HIGH || (hasPalm && fat100g >= T.FAT_PALM_TRIGGER)) {
    flags.push({
      type: "HIGH_FAT",
      badge: "HIGH SAT FAT",
      icon: "🛑",
      color: "amber",
      title: `High Total / Saturated Fat (${fat100g.toFixed(1)}g / 100g)`,
      description: "High lipid density formulated with refined palm or vegetable fats.",
      threshold_exceeded: `${fat100g.toFixed(1)}g vs 12.0g-17.5g limit`,
    });
  }

  return flags;
}

export function generateDamageControlAdvice(
  productName: string,
  nutrition: NutritionBreakdown,
  processingLevel: string,
  healthWarnings?: HealthWarning[],
): DamageControlAdvice {
  const p100 = nutrition?.per_100g || ({} as any);
  const sugars100g = p100.sugars_g || 0.0;
  const salt100g = p100.salt_g || 0.0;

  const steps = [];

  if (sugars100g >= T.SUGAR_HIGH) {
    steps.push({
      icon: "🥜",
      action: "Pair with Raw Nuts or Seeds (5-8 Almonds/Walnuts)",
      rationale: "Healthy fats and intact fiber slow gastric emptying, blunting the postprandial glucose spike by up to 35%.",
    });
    steps.push({
      icon: "🚶",
      action: "Take a 10-15 Minute Light Walk After Eating",
      rationale: "Active skeletal muscles take up circulating glucose via GLUT4 transporters independently of insulin.",
    });
  }

  if (salt100g >= T.SALT_DAMAGE) {
    steps.push({
      icon: "💧",
      action: "Drink a Glass of Water (300ml) with Potassium",
      rationale: "Helps renal hydration and sodium-potassium balance, reducing blood pressure tension.",
    });
    steps.push({
      icon: "🍌",
      action: "Eat a Potassium-Rich Whole Food (Banana or Tender Coconut)",
      rationale: "Potassium counteracts sodium vasoconstriction.",
    });
  }

  if (processingLevel === "highly_processed" || processingLevel === "ultra_processed") {
    steps.push({
      icon: "🥗",
      action: "Balance with High-Fiber Greens / Raw Salad Next Meal",
      rationale: "Prebiotic fiber nourishes the gut microbiome to buffer industrial emulsifier exposure.",
    });
  }

  let portionLimit = "Limit portion to 1 standard serving (20-30g) rather than finishing the whole pack.";
  if (sugars100g >= T.SUGAR_STRICT) {
    portionLimit = "Strictly limit to 1-2 pieces (maximum 15g) and avoid on an empty stomach.";
  }

  return {
    headline: "Science-Backed Damage Control",
    portion_limit: portionLimit,
    mitigation_steps: steps.length ? steps.slice(0, 3) : [
      {
        icon: "💧",
        action: "Stay Hydrated and Savor Mindfully",
        rationale: "Eating slowly increases satiety peptide secretion.",
      }
    ],
    disclaimer: "General nutritional awareness only — not medical advice, diagnosis, or treatment. Consult a qualified physician or registered dietitian before changing your diet.",
  };
}

export function evaluateHealthConditions(
  productName: string,
  ingredientsText: string,
  nutrition: NutritionBreakdown,
  processingLevel: string,
  userHealthConditions: string[],
  userAge?: number | null,
): HealthWarning[] {
  const activeConditions = new Set(userHealthConditions || []);
  if (userAge !== null && userAge !== undefined && userAge < 12) {
    activeConditions.add("child_mode");
  }

  if (activeConditions.size === 0) return [];

  const p100 = nutrition?.per_100g || ({} as any);
  const pServ = nutrition?.per_serving || ({} as any);
  const sugars100g = p100.sugars_g || 0.0;
  const salt100g = p100.salt_g || 0.0;
  const fat100g = p100.fat_g || 0.0;
  const sugarsServing = pServ.sugars_g || 0.0;
  const saltServing = pServ.salt_g || 0.0;

  const warnings: HealthWarning[] = [];

  // Diabetes
  if (activeConditions.has("diabetes") || activeConditions.has("prediabetes")) {
    const hasSugarIng = hasKeyword(ingredientsText, [
      /\bsugar\b/i, /\binvert sugar\b/i, /\bglucose\b/i, /\bmaltodextrin\b/i,
      /\bliquid glucose\b/i, /\bcorn syrup\b/i, /\bdextrose\b/i, /\bsucrose\b/i
    ]);
    const isHighSugar = sugars100g >= T.SUGAR_HIGH || sugarsServing >= T.SUGAR_HIGH_PER_SERVING;
    const isModSugar = sugars100g >= T.SUGAR_MODERATE;

    if (isHighSugar) {
      warnings.push({
        condition: "diabetes",
        condition_title: "Diabetes / Pre-diabetes",
        severity: "danger",
        badge: "High Blood Sugar Risk",
        title: "High Simple Sugar Content",
        message: `Contains ${sugars100g.toFixed(1)}g sugar per 100g (${sugarsServing.toFixed(1)}g per serving). Free sugars are digested quickly and can raise blood glucose levels, which makes glucose management harder.`,
        action: "Avoid or strictly limit portion to less than 15g. Prefer low-glycemic, fiber-rich whole alternatives.",
        scientific_ref: "WHO Guideline on Free Sugars Intake & ADA Standards of Medical Care in Diabetes."
      });
    } else if (isModSugar || hasSugarIng) {
      warnings.push({
        condition: "diabetes",
        condition_title: "Diabetes / Pre-diabetes",
        severity: "warning",
        badge: "Moderate Glycemic Load",
        title: "Moderate Added Sugar & Fast-Digesting Carbs",
        message: `Contains ${sugars100g.toFixed(1)}g sugar per 100g. Refined flours and sweeteners may elevate postprandial blood glucose.`,
        action: "Account for carbohydrates in your meal plan. Pair with dietary fiber or protein to slow absorption.",
        scientific_ref: "ADA (American Diabetes Association) Glycemic Index Guidelines."
      });
    }
  }

  // Hypertension
  if (activeConditions.has("hypertension") || activeConditions.has("high_bp")) {
    const matchedSodiumAdditives = findMatchingAdditives(ingredientsText, SODIUM_ADDITIVES);
    const isHighSalt = salt100g >= T.SALT_HIGH || saltServing >= T.SALT_HIGH_PER_SERVING;
    const isModSalt = salt100g >= T.SALT_MODERATE || matchedSodiumAdditives.length > 0;

    if (isHighSalt) {
      warnings.push({
        condition: "hypertension",
        condition_title: "Hypertension / High BP",
        severity: "danger",
        badge: "High Sodium Hazard",
        title: "High Salt & Sodium Load",
        message: `Contains ${salt100g.toFixed(2)}g salt (${(salt100g * 400).toFixed(0)}mg sodium) per 100g. High sodium expands blood volume and raises arterial pressure.`,
        action: "Not recommended for hypertensive individuals. WHO maximum daily salt limit is <5g (2,000mg sodium) across all meals.",
        scientific_ref: "WHO Guideline: Sodium intake for adults and children (2012)."
      });
    } else if (isModSalt) {
      const addNote = matchedSodiumAdditives.length ? ` Identified sodium sources: ${matchedSodiumAdditives.join(', ')}.` : '';
      warnings.push({
        condition: "hypertension",
        condition_title: "Hypertension / High BP",
        severity: "warning",
        badge: "Moderate Sodium",
        title: "Moderate Salt / Sodium Additives",
        message: `Contains ${salt100g.toFixed(2)}g salt per 100g.${addNote}`,
        action: "Track your total cumulative daily sodium intake. Balance with potassium-rich whole foods.",
        scientific_ref: "AHA (American Heart Association) Dietary Guidelines."
      });
    }
  }

  // Heart disease / Cholesterol
  if (activeConditions.has("heart_disease") || activeConditions.has("cholesterol")) {
    const hasBadFats = hasKeyword(ingredientsText, UNHEALTHY_FATS_KEYWORDS);
    const isHighFat = fat100g >= T.FAT_HIGH;

    if (hasBadFats && isHighFat) {
      warnings.push({
        condition: "heart_disease",
        condition_title: "Heart Disease / Cholesterol",
        severity: "danger",
        badge: "High Saturated / Trans Fat Alert",
        title: "Refined Palm / Hydrogenated Fats",
        message: `Contains high total fat (${fat100g.toFixed(1)}g/100g) formulated with refined palm/hydrogenated vegetable oils. Saturated and industrial trans fatty acids contribute to LDL cholesterol oxidation and arterial plaque.`,
        action: "Restrict consumption. Choose heart-healthy unrefined monounsaturated fats (nuts, seeds, olive/mustard oil).",
        scientific_ref: "WHO & FAO Guidelines on Saturated and Trans-Fatty Acids (2023)."
      });
    } else if (isHighFat || hasBadFats) {
      warnings.push({
        condition: "heart_disease",
        condition_title: "Heart Disease / Cholesterol",
        severity: "warning",
        badge: "Elevated Lipid Density",
        title: "Moderate Fat / Vegetable Oil Content",
        message: `Contains ${fat100g.toFixed(1)}g fat per 100g. Regular consumption contributes to daily saturated fat budget.`,
        action: "Moderate your intake and prioritize antioxidant-rich foods.",
        scientific_ref: "ESC (European Society of Cardiology) Cardiovascular Prevention Guidelines."
      });
    }
  }

  // Child mode (<12)
  if (activeConditions.has("child_mode")) {
    const matchedChildAdditives = findMatchingAdditives(ingredientsText, CHILD_ALERT_ADDITIVES);
    const isUltraSweet = sugars100g >= T.CHILD_SUGAR_ULTRA;

    if (matchedChildAdditives.length > 0) {
      warnings.push({
        condition: "child_mode",
        condition_title: "Child Mode (Age < 12)",
        severity: "danger",
        badge: "Child Alert: Synthetic Additives",
        title: "Synthetic Food Additives Detected",
        message: `Contains additives flagged for pediatric caution: ${matchedChildAdditives.join(', ')}. Synthetic azo dyes and intense sweeteners are linked to hyperactivity and altered gut microbiota in children.`,
        action: "Choose whole fruit or minimally processed snacks without artificial food colors.",
        scientific_ref: "EFSA (European Food Safety Authority) Southampton Study & AAP Pediatric Policy."
      });
    } else if (isUltraSweet) {
      warnings.push({
        condition: "child_mode",
        condition_title: "Child Mode (Age < 12)",
        severity: "warning",
        badge: "High Sugar for Kids",
        title: "Excess Sugar for Growing Children",
        message: `Supplies ${sugars100g.toFixed(1)}g sugar per 100g. A single serving can consume over 50% of a child's recommended daily maximum free sugar allowance (25g).`,
        action: "Limit treats and encourage fresh whole fruit snacks.",
        scientific_ref: "American Academy of Pediatrics (AAP) Added Sugar Recommendations."
      });
    }
  }

  // Celiac / Gluten
  if (activeConditions.has("celiac") || activeConditions.has("gluten")) {
    const hasGluten = hasKeyword(ingredientsText, GLUTEN_KEYWORDS);
    if (hasGluten) {
      warnings.push({
        condition: "celiac",
        condition_title: "Celiac Disease / Gluten Sensitivity",
        severity: "danger",
        badge: "Contains Gluten",
        title: "Wheat / Gluten Derivative Detected",
        message: "Formulation includes wheat flour, barley, malt, or cereal grains containing gluten proteins. Ingestion triggers intestinal mucosal inflammation and villous atrophy in celiac disease.",
        action: "DO NOT CONSUME if you have celiac disease or diagnosed gluten ataxia. Choose certified gluten-free foods.",
        scientific_ref: "Codex Standard for Foods for Special Dietary Use for Persons Intolerant to Gluten (CODEX STAN 118-1979)."
      });
    }
  }

  // Lactose Intolerance
  if (activeConditions.has("lactose") || activeConditions.has("dairy")) {
    const hasDairy = hasKeyword(ingredientsText, DAIRY_KEYWORDS);
    if (hasDairy) {
      warnings.push({
        condition: "lactose",
        condition_title: "Lactose Intolerance / Dairy Sensitivity",
        severity: "warning",
        badge: "Contains Dairy / Milk Solids",
        title: "Milk Solids or Dairy Derivatives Present",
        message: "Formulation contains milk solids, whey, butter, or dairy proteins. May induce abdominal bloating, cramping, and gastrointestinal distress in lactase-deficient individuals.",
        action: "Consume with lactase enzyme supplements or switch to certified plant-based alternatives.",
        scientific_ref: "NIH National Institute of Diabetes and Digestive and Kidney Diseases (NIDDK)."
      });
    }
  }

  // Kidney Disease
  if (activeConditions.has("kidney_disease") || activeConditions.has("renal")) {
    const matchedKidneyAdditives = findMatchingAdditives(ingredientsText, PHOSPHORUS_POTASSIUM_ADDITIVES);
    if (salt100g >= T.SALT_KIDNEY || matchedKidneyAdditives.length > 0) {
      warnings.push({
        condition: "kidney_disease",
        condition_title: "Kidney / Renal Health",
        severity: "danger",
        badge: "Renal Filtration Load",
        title: "High Sodium / Phosphate Additives",
        message: `Contains elevated salt (${salt100g.toFixed(2)}g/100g) or inorganic phosphate/potassium preservatives (${matchedKidneyAdditives.join(', ') || 'inorganic processing salts'}) which impose direct filtration strain on impaired nephrons.`,
        action: "Restrict intake as advised by your nephrologist or renal dietitian.",
        scientific_ref: "KDIGO Clinical Practice Guideline for the Management of CKD."
      });
    }
  }

  // Fatty Liver
  if (activeConditions.has("fatty_liver") || activeConditions.has("nafld")) {
    const hasHfcsOrFructose = hasKeyword(ingredientsText, [
      /\bhigh fructose\b/i, /\bhfcs\b/i, /\bliquid glucose\b/i, /\binvert sugar\b/i, /\bfructose\b/i
    ]);
    if (hasHfcsOrFructose || sugars100g >= T.SUGAR_HIGH) {
      warnings.push({
        condition: "fatty_liver",
        condition_title: "Fatty Liver / NAFLD",
        severity: "danger",
        badge: "Hepatic Lipid Trigger",
        title: "Concentrated Fructose / Simple Sugars",
        message: `Contains high simple sugars (${sugars100g.toFixed(1)}g/100g) or liquid industrial syrups. Unlike glucose, hepatic metabolism converts excess free fructose directly into triglycerides, accelerating steatosis.`,
        action: "Strictly avoid high-sugar processed foods and sugary beverages.",
        scientific_ref: "EASL-EASD-EASO Clinical Practice Guidelines for NAFLD Management."
      });
    }
  }

  return warnings;
}

export function generateHealthierSwaps(
  productName: string,
  categoriesTags: string[] = [],
  ingredientsText: string = '',
  processingLevel: string = '',
  nutrition?: NutritionBreakdown,
): HealthierSwap[] {
  const textLower = `${productName} ${(categoriesTags || []).join(' ')} ${ingredientsText}`.toLowerCase();

  // Biscuits, Cookies, Bakery
  if (['biscuit', 'cookie', 'bakery', 'rusk', 'cake', 'wafer', 'glucose'].some(k => textLower.includes(k))) {
    return [
      {
        name: "Roasted Almonds & Medjool Dates",
        category: "Whole Food Snack",
        benefits: "Zero added sugar or palm oil. Natural sweetness paired with healthy monounsaturated fats & magnesium for steady energy.",
        why_better: "No ultra-processing, 100% bioavailable fiber, zero industrial emulsifiers.",
        calories_density: "Moderate (Nutrient-Dense)",
        nova_group: 1,
      },
      {
        name: "Roasted Makhana (Fox Nuts) with Pink Salt",
        category: "Minimally Processed",
        benefits: "Light, crunchy, low glycemic index. High in plant protein and rich in antioxidants with zero trans fats.",
        why_better: "90% less saturated fat, zero refined sugar, no synthetic leavening agents.",
        calories_density: "Low",
        nova_group: 1,
      },
      {
        name: "100% Rolled Oats & Jaggery Homemade Cookies",
        category: "Minimally Processed Alternative",
        benefits: "Beta-glucan soluble fiber supports heart health and slow blood glucose release.",
        why_better: "Zero refined white maida, zero palm oil or chemical preservatives.",
        calories_density: "Moderate",
        nova_group: 2,
      },
    ];
  }

  // Chips, Namkeen, Snacks
  if (['chips', 'crisps', 'namkeen', 'bhujia', 'kurkure', 'snack', 'fried'].some(k => textLower.includes(k))) {
    return [
      {
        name: "Roasted Chana (Chickpeas)",
        category: "Whole Food Staple",
        benefits: "18g protein per 100g, 4x more dietary fiber than potato chips, virtually zero saturated fat.",
        why_better: "Dry-roasted without deep-frying in palm oil; zero MSG or artificial flavor enhancers.",
        calories_density: "Moderate",
        nova_group: 1,
      },
      {
        name: "Air-Popped Whole Corn with Spices",
        category: "Whole Grain Snack",
        benefits: "High volume, rich in polyphenols and dietary fiber, naturally low in calories and fat.",
        why_better: "75% less fat than commercial fried potato crisps.",
        calories_density: "Low",
        nova_group: 1,
      },
      {
        name: "Baked Beetroot & Sweet Potato Crisps",
        category: "Minimally Processed",
        benefits: "Preserves natural potassium, beta-carotene, and vegetable minerals with unrefined crunch.",
        why_better: "No excessive industrial salt or INS 621 flavor enhancers.",
        calories_density: "Moderate",
        nova_group: 2,
      },
    ];
  }

  // Instant Noodles, Pasta
  if (['noodle', 'pasta', 'maggi', 'ramen', 'soup'].some(k => textLower.includes(k))) {
    return [
      {
        name: "Sprouted Foxtail / Little Millet Noodles with Veggies",
        category: "Whole Grain Alternative",
        benefits: "Rich in minerals, low glycemic index, 3x dietary fiber compared to refined maida noodles.",
        why_better: "Not flash-fried in palm oil; free of hydrolysed vegetable protein and artificial flavour enhancers.",
        calories_density: "Moderate",
        nova_group: 2,
      },
      {
        name: "Vegetable Upma / Semiya with Mustard & Curry Leaves",
        category: "Traditional Whole Meal",
        benefits: "Prepared fresh with vegetables and spices, providing sustained complex carbohydrates.",
        why_better: "Zero TBHQ preservative, controlled fresh seasoning, 60% lower sodium.",
        calories_density: "Moderate",
        nova_group: 2,
      },
    ];
  }

  // Beverages, Colas, Sodas
  if (['beverage', 'drink', 'cola', 'soda', 'juice', 'squash'].some(k => textLower.includes(k))) {
    return [
      {
        name: "Fresh Tender Coconut Water",
        category: "Natural Isotonic Drink",
        benefits: "Natural bioavailable electrolytes (potassium, magnesium) with very low natural glycemic impact.",
        why_better: "Zero synthetic color, zero phosphoric acid, 100% natural hydration.",
        calories_density: "Low",
        nova_group: 1,
      },
      {
        name: "Chaas (Spiced Buttermilk with Cumin & Mint)",
        category: "Probiotic Dairy",
        benefits: "Promotes gut microbiome health, rich in calcium and natural lactic cultures.",
        why_better: "Zero high-fructose corn syrup, no artificial sweeteners or sodium benzoate.",
        calories_density: "Low",
        nova_group: 1,
      },
      {
        name: "Lemon & Fresh Mint Infused Water",
        category: "Hydration",
        benefits: "Refreshing natural flavor with vitamin C and zero caloric or glycemic load.",
        why_better: "Eliminates all liquid sugars that bypass satiety signaling.",
        calories_density: "Zero",
        nova_group: 1,
      },
    ];
  }

  // Chocolates, Candies
  if (['chocolate', 'candy', 'sweet', 'confectionery', 'gems', 'toffee'].some(k => textLower.includes(k))) {
    return [
      {
        name: "70%+ Single-Origin Dark Chocolate (20g)",
        category: "Antioxidant-Rich Sweet",
        benefits: "High concentration of flavanols, copper, and iron. 60% less sugar than milk chocolate.",
        why_better: "Contains pure cocoa butter instead of hydrogenated vegetable fats.",
        calories_density: "High (Portion-Controlled)",
        nova_group: 2,
      },
      {
        name: "Raw Cacao & Walnut Energy Bites",
        category: "Whole Food Confection",
        benefits: "Naturally sweetened with dates, providing omega-3 fatty acids and natural satiety.",
        why_better: "Zero synthetic vanillin, zero added refined sucrose or INS 476 emulsifiers.",
        calories_density: "Moderate",
        nova_group: 1,
      },
    ];
  }

  // Default fallback swaps
  return [
    {
      name: "Seasonal Fresh Fruit Bowl with Pumpkin Seeds",
      category: "Whole Food Snack",
      benefits: "Abundant active vitamins, bioflavonoids, natural enzymes, and protective dietary fiber.",
      why_better: "Unprocessed, zero additives, natural water content promoting fullness.",
      calories_density: "Low",
      nova_group: 1,
    },
    {
      name: "Mixed Sprouted Moong & Pomegranate Salad",
      category: "Living Whole Food",
      benefits: "High enzymatic activity, easily digestible plant protein, and natural antioxidant pigments.",
      why_better: "Clean unadulterated whole food nutrition without chemical preservatives.",
      calories_density: "Low-Moderate",
      nova_group: 1,
    },
  ];
}
