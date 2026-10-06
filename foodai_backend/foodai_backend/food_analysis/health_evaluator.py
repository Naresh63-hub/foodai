"""
Deterministic Health Condition Warning and Healthier Food Swaps Engine.
Evaluates products against individual health profiles (Diabetes, Hypertension, Heart Disease,
Child Mode, Celiac/Gluten, Lactose, Allergens, Kidney Health, Fatty Liver, Pregnancy)
strictly using nutritional thresholds and verified ingredient compositions without hallucination.
"""
from typing import Dict, List, Optional, Any
import re

from foodai_backend.food_analysis import thresholds as T


# Condition Display Metadata
CONDITION_META = {
    "diabetes": {
        "title": "Diabetes / Pre-diabetes",
        "icon": "🩸",
        "short_desc": "Blood glucose control & glycemic impact",
    },
    "hypertension": {
        "title": "Hypertension / High Blood Pressure",
        "icon": "🫀",
        "short_desc": "Sodium & cardiovascular tension control",
    },
    "heart_disease": {
        "title": "High Cholesterol / Heart Health",
        "icon": "🧈",
        "short_desc": "Saturated fats, trans fats & arterial health",
    },
    "child_mode": {
        "title": "Child Mode (Age < 12)",
        "icon": "👶",
        "short_desc": "Safe from synthetic dyes, caffeine & excess sugar",
    },
    "celiac": {
        "title": "Celiac Disease / Gluten Sensitivity",
        "icon": "🌾",
        "short_desc": "Strict gluten-free verification",
    },
    "lactose": {
        "title": "Lactose Intolerance / Dairy Sensitivity",
        "icon": "🥛",
        "short_desc": "Dairy & milk protein awareness",
    },
    "nut_allergy": {
        "title": "Nut & Peanut Allergy",
        "icon": "🥜",
        "short_desc": "Peanuts and tree nut allergen check",
    },
    "soy_allergy": {
        "title": "Soy Allergy",
        "icon": "🌱",
        "short_desc": "Soybean and soy lecithin check",
    },
    "kidney_disease": {
        "title": "Kidney / Renal Health",
        "icon": "🫘",
        "short_desc": "Phosphorus, potassium & sodium filtration load",
    },
    "fatty_liver": {
        "title": "Fatty Liver / NAFLD",
        "icon": "🩺",
        "short_desc": "High fructose & hepatic lipid accumulation",
    },
    "pcos": {
        "title": "PCOS / Hormonal Balance",
        "icon": "🌸",
        "short_desc": "Insulin resistance & endocrine-disrupting additives",
    },
    "pregnancy": {
        "title": "Pregnancy & Nursing Safe Mode",
        "icon": "🤰",
        "short_desc": "Raw dairy, artificial sweeteners & high caffeine safety",
    },
    "low_fodmap": {
        "title": "IBS / Low FODMAP & Gut Care",
        "icon": "🌿",
        "short_desc": "Fermentable polyols, sugar alcohols & gut irritants",
    },
}

# Ingredient Matching Sets
GLUTEN_KEYWORDS = [
    r"\bwheat\b", r"\bmaida\b", r"\batta\b", r"\bbarley\b", r"\brye\b",
    r"\bgluten\b", r"\bspelt\b", r"\bsemolina\b", r"\bsuji\b", r"\brava\b",
    r"\bmalt\b", r"\bmalted\b", r"\btriticale\b", r"\bflour\b"
]

DAIRY_KEYWORDS = [
    r"\bmilk\b", r"\bwhey\b", r"\blactose\b", r"\bcasein\b", r"\bcaseinate\b",
    r"\bbutter\b", r"\bcheese\b", r"\bcurd\b", r"\byogurt\b", r"\bcream\b",
    r"\bghee\b", r"\bdairy\b", r"\bmilk solids\b", r"\bskimmed milk\b"
]

NUT_KEYWORDS = [
    r"\bpeanut", r"\balmond", r"\bcashew", r"\bwalnut", r"\bpistachio",
    r"\bhazelnut", r"\bpecan", r"\bmacadamia", r"\btree nut", r"\bgroundnut"
]

SOY_KEYWORDS = [
    r"\bsoy\b", r"\bsoya\b", r"\bsoybean\b", r"\bsoy lecithin\b", r"\bsoya lecithin\b",
    r"\btremella\b", r"\btofu\b", r"\bedamame\b"
]

UNHEALTHY_FATS_KEYWORDS = [
    r"\bpalm oil\b", r"\bpalmolein\b", r"\bhydrogenated\b", r"\bpartially hydrogenated\b",
    r"\bvanaspati\b", r"\bmargarine\b", r"\binteresterified\b", r"\btrans fat\b"
]

CHILD_ALERT_ADDITIVES = [
    (r"\b(e\s*102|ins\s*102|tartrazine)\b", "Tartrazine (INS 102 / Yellow 5)"),
    (r"\b(e\s*110|ins\s*110|sunset yellow)\b", "Sunset Yellow (INS 110 / Yellow 6)"),
    (r"\b(e\s*122|ins\s*122|carmoisine|azorubine)\b", "Carmoisine (INS 122)"),
    (r"\b(e\s*124|ins\s*124|ponceau 4r)\b", "Ponceau 4R (INS 124)"),
    (r"\b(e\s*129|ins\s*129|allura red)\b", "Allura Red (INS 129 / Red 40)"),
    (r"\b(e\s*133|ins\s*133|brilliant blue)\b", "Brilliant Blue (INS 133 / Blue 1)"),
    (r"\b(caffeine|coffee extract|guarana|taurine)\b", "Caffeine / Stimulants"),
    (r"\b(aspartame|sucralose|acesulfame|saccharin)\b", "Synthetic Intense Sweeteners"),
]

SODIUM_ADDITIVES = [
    (r"\b(e\s*621|ins\s*621|monosodium glutamate|msg)\b", "Monosodium Glutamate (MSG / INS 621)"),
    (r"\b(e\s*211|ins\s*211|sodium benzoate)\b", "Sodium Benzoate (INS 211)"),
    (r"\b(e\s*631|ins\s*631|disodium inosinate)\b", "Disodium Inosinate (INS 631)"),
    (r"\b(e\s*627|ins\s*627|disodium guanylate)\b", "Disodium Guanylate (INS 627)"),
    (r"\b(e\s*500ii|ins\s*500ii|sodium bicarbonate|baking soda)\b", "Sodium Bicarbonate (INS 500ii)"),
    (r"\b(e\s*250|ins\s*250|sodium nitrite)\b", "Sodium Nitrite (INS 250)"),
]

PHOSPHORUS_POTASSIUM_ADDITIVES = [
    (r"\b(e\s*338|ins\s*338|phosphoric acid)\b", "Phosphoric Acid (INS 338)"),
    (r"\b(e\s*452|ins\s*452|polyphosphate)\b", "Polyphosphates (INS 452)"),
    (r"\b(e\s*450|ins\s*450|diphosphate)\b", "Diphosphates (INS 450)"),
    (r"\b(e\s*202|ins\s*202|potassium sorbate)\b", "Potassium Sorbate (INS 202)"),
    (r"\b(e\s*508|ins\s*508|potassium chloride)\b", "Potassium Chloride (INS 508)"),
]


def _has_keyword(text: str, regex_list: List[str]) -> bool:
    if not text:
        return False
    text_lower = text.lower()
    for pattern in regex_list:
        if re.search(pattern, text_lower):
            return True
    return False


def _find_matching_additives(text: str, additive_patterns: List[tuple]) -> List[str]:
    if not text:
        return []
    found = []
    text_lower = text.lower()
    for pattern, name in additive_patterns:
        if re.search(pattern, text_lower):
            found.append(name)
    return found


DISGUISED_SUGAR_PATTERNS = [
    (r"\b(maltodextrin|malto-dextrin)\b", "Maltodextrin (High Glycemic Hydrolysed Starch)"),
    (r"\b(invert sugar|invert syrup)\b", "Invert Sugar Syrup"),
    (r"\b(high fructose corn syrup|hfcs)\b", "High-Fructose Corn Syrup (HFCS)"),
    (r"\b(glucose syrup|liquid glucose|corn syrup solids)\b", "Glucose Syrup / Corn Syrup Solids"),
    (r"\b(dextrose|d-glucose)\b", "Dextrose / Pure D-Glucose"),
    (r"\b(agave nectar|agave syrup)\b", "Agave Nectar (Concentrated Fructose)"),
    (r"\b(malt extract|barley malt extract)\b", "Malt Extract (Maltose Rich)"),
    (r"\b(cane juice crystals|evaporated cane juice)\b", "Cane Juice Crystals"),
    (r"\b(trehalose|isomaltulose)\b", "Trehalose / Isomaltulose"),
    (r"\b(golden syrup|molasses|caramel sugar)\b", "Golden Syrup / Molasses"),
    (r"\b(fructose syrup|fruit sugar concentrate)\b", "Fruit Sugar Concentrate / Fructose"),
]

DISGUISED_SALT_PATTERNS = [
    (r"\b(e\s*621|ins\s*621|monosodium glutamate|msg)\b", "Monosodium Glutamate (MSG / INS 621)"),
    (r"\b(e\s*631|ins\s*631|disodium inosinate)\b", "Disodium Inosinate (INS 631)"),
    (r"\b(e\s*627|ins\s*627|disodium guanylate)\b", "Disodium Guanylate (INS 627)"),
    (r"\b(e\s*211|ins\s*211|sodium benzoate)\b", "Sodium Benzoate (INS 211)"),
    (r"\b(e\s*223|ins\s*223|sodium metabisulphite)\b", "Sodium Metabisulphite (INS 223)"),
    (r"\b(e\s*500ii|ins\s*500ii|sodium bicarbonate|baking soda)\b", "Sodium Bicarbonate (INS 500ii)"),
    (r"\b(e\s*331|ins\s*331|sodium citrate|trisodium citrate)\b", "Sodium Citrate (INS 331)"),
    (r"\b(e\s*452|ins\s*452|sodium polyphosphate)\b", "Sodium Polyphosphate (INS 452)"),
]

DISGUISED_FAT_PATTERNS = [
    (r"\b(palm oil|refined palm oil|palmolein|superolein)\b", "Refined Palm Oil / Palmolein"),
    (r"\b(hydrogenated vegetable oil|vanaspati)\b", "Hydrogenated Industrial Fat (Vanaspati)"),
    (r"\b(partially hydrogenated)\b", "Partially Hydrogenated Oil (Trans Fat Source)"),
    (r"\b(interesterified vegetable fat)\b", "Interesterified Vegetable Fat"),
    (r"\b(fractionated palm kernel oil)\b", "Fractionated Palm Kernel Oil"),
]

GUT_IRRITANT_POLYOLS = [
    (r"\b(maltitol|e\s*965|ins\s*965)\b", "Maltitol (High Fermentable Polyol)"),
    (r"\b(sorbitol|e\s*420|ins\s*420)\b", "Sorbitol (Osmotic Laxative Effect in Excess)"),
    (r"\b(isomalt|e\s*953|ins\s*953)\b", "Isomalt"),
    (r"\b(inulin|chicory root fiber|oligofructose)\b", "Isolated Inulin / Chicory Root (High FODMAP)"),
]


def evaluate_disguised_ingredients(ingredients_text: str) -> Dict[str, Any]:
    """
    Detects hidden sugars, industrial sodium salts, and refined fats disguised under technical names.
    """
    if not ingredients_text:
        return {
            "total_disguised_count": 0,
            "hidden_sugars": [],
            "hidden_salts": [],
            "hidden_fats": [],
            "summary": "No ingredients text available to analyze disguised additives.",
        }

    hidden_sugars = _find_matching_additives(ingredients_text, DISGUISED_SUGAR_PATTERNS)
    hidden_salts = _find_matching_additives(ingredients_text, DISGUISED_SALT_PATTERNS)
    hidden_fats = _find_matching_additives(ingredients_text, DISGUISED_FAT_PATTERNS)
    total_count = len(hidden_sugars) + len(hidden_salts) + len(hidden_fats)

    summary_parts = []
    if hidden_sugars:
        summary_parts.append(f"{len(hidden_sugars)} disguised added sugar(s)")
    if hidden_salts:
        summary_parts.append(f"{len(hidden_salts)} technical sodium additive(s)")
    if hidden_fats:
        summary_parts.append(f"{len(hidden_fats)} industrial refined fat(s)")

    if summary_parts:
        summary = f"Detected {', '.join(summary_parts)} in the formulation."
    else:
        summary = "No common disguised industrial sugars, hidden sodium salts, or trans-fat sources detected."

    return {
        "total_disguised_count": total_count,
        "hidden_sugars": hidden_sugars,
        "hidden_salts": hidden_salts,
        "hidden_fats": hidden_fats,
        "summary": summary,
    }


def estimate_glycemic_response(
    nutrition: Dict[str, Any],
    ingredients_text: str = "",
) -> Dict[str, Any]:
    """
    Estimates blood glucose trajectory & glycemic impact based on carbohydrate, sugar, fiber, and protein ratios.
    """
    p100 = nutrition.get("per_100g", {}) if nutrition else {}
    sugars = p100.get("sugars_g") or 0.0
    fiber = p100.get("fiber_g") or 0.0
    protein = p100.get("proteins_g") or 0.0
    fat = p100.get("fat_g") or 0.0

    text_lower = (ingredients_text or "").lower()
    has_refined_flour = any(k in text_lower for k in ["maida", "refined wheat", "starch", "corn starch", "maltodextrin"])
    has_whole_grains = any(k in text_lower for k in ["whole wheat", "oats", "millet", "ragi", "quinoa", "brown rice", "chana"])

    # Calculate Spike Risk Score (1 to 10 scale)
    base_score = min(10.0, max(1.0, (sugars * 0.25) + (3.0 if has_refined_flour else 1.0)))
    
    # Buffering effect of fiber and protein
    buffer_reduction = (fiber * 0.4) + (protein * 0.15)
    if has_whole_grains:
        buffer_reduction += 1.5

    spike_score = round(max(1.0, min(10.0, base_score - buffer_reduction)), 1)

    if spike_score >= 7.0:
        tier = "High (Fast Glucose Surge)"
        curve_shape = "sharp_spike"
        buffering = "Poor"
        explanation = (
            f"High proportion of simple sugars ({sugars}g/100g) and refined carbohydrates with low protective dietary fiber ({fiber}g). "
            "Causes a rapid postprandial blood glucose elevation followed by a reactive insulin dip."
        )
    elif spike_score >= 4.0:
        tier = "Moderate (Gradual Rise)"
        curve_shape = "moderate_rise"
        buffering = "Moderate"
        explanation = (
            f"Moderate carbohydrate content with some buffering from protein ({protein}g) and fats ({fat}g), "
            "providing a manageable, steady blood glucose release."
        )
    else:
        tier = "Low (Sustained Energy)"
        curve_shape = "flat_sustained"
        buffering = "Strong"
        explanation = (
            f"Favorable nutrient balance with low free sugar ({sugars}g) and good dietary buffering ({fiber}g fiber, {protein}g protein). "
            "Supports sustained metabolic energy without sudden glycemic spikes."
        )

    return {
        "tier": tier,
        "spike_score": spike_score,
        "curve_shape": curve_shape,
        "buffering_quality": buffering,
        "sugars_100g": sugars,
        "fiber_100g": fiber,
        "protein_100g": protein,
        "explanation": explanation,
    }


def evaluate_fssai_fopnl(
    nutrition: Dict[str, Any],
    ingredients_text: str = "",
) -> List[Dict[str, Any]]:
    """
    Evaluates Front-of-Pack Nutritional Warning Labels (FOPNL) based on FSSAI draft norms & WHO benchmarks:
    - High in Added Sugar (Threshold: > 15g/100g in solids)
    - High in Sodium (Threshold: > 1.25g salt per 100g or > 500mg sodium per 100g)
    - High in Saturated Fats (Threshold: > 17.5g fat/100g or contains refined palm/hydrogenated fats with fat > 12g)
    """
    per_100g = nutrition.get("per_100g", {})
    sugars_100g = per_100g.get("sugars_g") or 0.0
    salt_100g = per_100g.get("salt_g") or 0.0
    fat_100g = per_100g.get("fat_g") or 0.0

    flags = []

    # 1. High in Added Sugar Warning
    if sugars_100g >= T.SUGAR_HIGH:
        flags.append({
            "type": "HIGH_SUGAR",
            "badge": "HIGH SUGAR",
            "icon": "🛑",
            "color": "rose",
            "title": f"High Sugar ({sugars_100g:.1f}g / 100g)",
            "description": "Exceeds FSSAI/WHO front-of-pack threshold (15g/100g). Supplies rapid empty calories.",
            "threshold_exceeded": f"{sugars_100g:.1f}g vs 15.0g limit",
        })

    # 2. High in Sodium / Salt Warning
    if salt_100g >= T.SALT_HIGH:
        sodium_mg = salt_100g * 400
        flags.append({
            "type": "HIGH_SALT",
            "badge": "HIGH SODIUM",
            "icon": "🛑",
            "color": "red",
            "title": f"High Salt ({salt_100g:.2f}g / 100g)",
            "description": f"Provides {sodium_mg:.0f}mg sodium per 100g, exceeding FSSAI threshold (1.25g salt).",
            "threshold_exceeded": f"{salt_100g:.2f}g vs 1.25g limit",
        })

    # 3. High in Saturated Fat Warning
    has_palm = _has_keyword(ingredients_text, UNHEALTHY_FATS_KEYWORDS)
    if fat_100g >= T.FAT_HIGH or (has_palm and fat_100g >= T.FAT_PALM_TRIGGER):
        flags.append({
            "type": "HIGH_FAT",
            "badge": "HIGH SAT FAT",
            "icon": "🛑",
            "color": "amber",
            "title": f"High Total / Saturated Fat ({fat_100g:.1f}g / 100g)",
            "description": "High lipid density formulated with refined palm or vegetable fats.",
            "threshold_exceeded": f"{fat_100g:.1f}g vs 12.0g-17.5g limit",
        })

    return flags


def generate_damage_control_advice(
    product_name: str,
    nutrition: Dict[str, Any],
    processing_level: str,
    health_warnings: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    """
    Generates science-backed damage control meal pairing and mitigation steps
    if the user decides to eat the processed food product.
    """
    per_100g = nutrition.get("per_100g", {})
    sugars_100g = per_100g.get("sugars_g") or 0.0
    salt_100g = per_100g.get("salt_g") or 0.0

    steps = []

    # High Sugar Damage Control
    if sugars_100g >= T.SUGAR_HIGH:
        steps.append({
            "icon": "🥜",
            "action": "Pair with Raw Nuts or Seeds (5-8 Almonds/Walnuts)",
            "rationale": "Healthy fats and intact fiber slow gastric emptying, blunting the postprandial glucose spike by up to 35%.",
        })
        steps.append({
            "icon": "🚶",
            "action": "Take a 10-15 Minute Light Walk After Eating",
            "rationale": "Active skeletal muscles take up circulating glucose via GLUT4 transporters independently of insulin.",
        })

    # High Salt Damage Control
    if salt_100g >= T.SALT_DAMAGE:
        steps.append({
            "icon": "💧",
            "action": "Drink a Glass of Water (300ml) with Potassium",
            "rationale": "Helps renal hydration and sodium-potassium balance, reducing blood pressure tension.",
        })
        steps.append({
            "icon": "🍌",
            "action": "Eat a Potassium-Rich Whole Food (Banana or Tender Coconut)",
            "rationale": "Potassium counteracts sodium vasoconstriction.",
        })

    # Ultra-processed / Additive Damage Control
    if processing_level in ("highly_processed", "ultra_processed"):
        steps.append({
            "icon": "🥗",
            "action": "Balance with High-Fiber Greens / Raw Salad Next Meal",
            "rationale": "Prebiotic fiber nourishes the gut microbiome to buffer industrial emulsifier exposure.",
        })

    # Portion limit rule
    portion_limit = "Limit portion to 1 standard serving (20-30g) rather than finishing the whole pack."
    if sugars_100g >= T.SUGAR_STRICT:
        portion_limit = "Strictly limit to 1-2 pieces (maximum 15g) and avoid on an empty stomach."

    return {
        "headline": "Science-Backed Damage Control",
        "portion_limit": portion_limit,
        "mitigation_steps": steps[:3] if steps else [
            {
                "icon": "💧",
                "action": "Stay Hydrated and Savor Mindfully",
                "rationale": "Eating slowly increases satiety peptide secretion.",
            }
        ],
        "disclaimer": (
            "General nutritional awareness only — not medical advice, diagnosis, or treatment. "
            "Consult a qualified physician or registered dietitian before changing your diet."
        ),
    }


def evaluate_health_conditions(
    product_name: str,
    ingredients_text: str,
    nutrition: Dict[str, Any],
    processing_level: str,
    user_health_conditions: List[str],
    user_age: Optional[int] = None,
) -> List[Dict[str, Any]]:
    """
    Evaluates product nutrition & ingredients against selected user health conditions.
    Returns a list of structured warning objects.
    """
    if not user_health_conditions:
        user_health_conditions = []

    # Auto-activate child mode if user_age is under 12
    active_conditions = set(user_health_conditions)
    if user_age is not None and user_age < 12:
        active_conditions.add("child_mode")

    if not active_conditions:
        return []

    per_100g = nutrition.get("per_100g", {})
    per_serving = nutrition.get("per_serving", {})
    sugars_100g = per_100g.get("sugars_g") or 0.0
    salt_100g = per_100g.get("salt_g") or 0.0
    fat_100g = per_100g.get("fat_g") or 0.0
    sugars_serving = per_serving.get("sugars_g") or 0.0
    salt_serving = per_serving.get("salt_g") or 0.0

    warnings = []

    # 1. DIABETES / PRE-DIABETES
    if "diabetes" in active_conditions or "prediabetes" in active_conditions:
        has_sugar_ing = _has_keyword(ingredients_text, [
            r"\bsugar\b", r"\binvert sugar\b", r"\bglucose\b", r"\bmaltodextrin\b",
            r"\bliquid glucose\b", r"\bcorn syrup\b", r"\bdextrose\b", r"\bsucrose\b"
        ])
        is_high_sugar = sugars_100g >= T.SUGAR_HIGH or sugars_serving >= T.SUGAR_HIGH_PER_SERVING
        is_mod_sugar = sugars_100g >= T.SUGAR_MODERATE

        if is_high_sugar:
            warnings.append({
                "condition": "diabetes",
                "condition_title": "Diabetes / Pre-diabetes",
                "severity": "danger",
                "badge": "High Blood Sugar Risk",
                "title": "High Simple Sugar Content",
                "message": f"Contains {sugars_100g:.1f}g sugar per 100g ({sugars_serving:.1f}g per serving). Free sugars are digested quickly and can raise blood glucose levels, which makes glucose management harder.",
                "action": "Avoid or strictly limit portion to less than 15g. Prefer low-glycemic, fiber-rich whole alternatives.",
                "scientific_ref": "WHO Guideline on Free Sugars Intake & ADA Standards of Medical Care in Diabetes."
            })
        elif is_mod_sugar or has_sugar_ing:
            warnings.append({
                "condition": "diabetes",
                "condition_title": "Diabetes / Pre-diabetes",
                "severity": "warning",
                "badge": "Moderate Glycemic Load",
                "title": "Moderate Added Sugar & Fast-Digesting Carbs",
                "message": f"Contains {sugars_100g:.1f}g sugar per 100g. Refined flours and sweeteners may elevate postprandial blood glucose.",
                "action": "Account for carbohydrates in your meal plan. Pair with dietary fiber or protein to slow absorption.",
                "scientific_ref": "ADA (American Diabetes Association) Glycemic Index Guidelines."
            })

    # 2. HYPERTENSION / HIGH BLOOD PRESSURE
    if "hypertension" in active_conditions or "high_bp" in active_conditions:
        matched_sodium_additives = _find_matching_additives(ingredients_text, SODIUM_ADDITIVES)
        is_high_salt = salt_100g >= T.SALT_HIGH or salt_serving >= T.SALT_HIGH_PER_SERVING
        is_mod_salt = salt_100g >= T.SALT_MODERATE or len(matched_sodium_additives) > 0

        if is_high_salt:
            warnings.append({
                "condition": "hypertension",
                "condition_title": "Hypertension / High BP",
                "severity": "danger",
                "badge": "High Sodium Hazard",
                "title": "High Salt & Sodium Load",
                "message": f"Contains {salt_100g:.2f}g salt ({salt_100g * 400:.0f}mg sodium) per 100g. High sodium expands blood volume and raises arterial pressure.",
                "action": "Not recommended for hypertensive individuals. WHO maximum daily salt limit is <5g (2,000mg sodium) across all meals.",
                "scientific_ref": "WHO Guideline: Sodium intake for adults and children (2012)."
            })
        elif is_mod_salt:
            add_note = f" Identified sodium sources: {', '.join(matched_sodium_additives)}." if matched_sodium_additives else ""
            warnings.append({
                "condition": "hypertension",
                "condition_title": "Hypertension / High BP",
                "severity": "warning",
                "badge": "Moderate Sodium",
                "title": "Moderate Salt / Sodium Additives",
                "message": f"Contains {salt_100g:.2f}g salt per 100g.{add_note}",
                "action": "Track your total cumulative daily sodium intake. Balance with potassium-rich whole foods.",
                "scientific_ref": "AHA (American Heart Association) Dietary Guidelines."
            })

    # 3. HEART DISEASE / CHOLESTEROL / HYPERLIPIDEMIA
    if "heart_disease" in active_conditions or "cholesterol" in active_conditions:
        has_bad_fats = _has_keyword(ingredients_text, UNHEALTHY_FATS_KEYWORDS)
        is_high_fat = fat_100g >= T.FAT_HIGH

        if has_bad_fats and is_high_fat:
            warnings.append({
                "condition": "heart_disease",
                "condition_title": "Heart Disease / Cholesterol",
                "severity": "danger",
                "badge": "High Saturated / Trans Fat Alert",
                "title": "Refined Palm / Hydrogenated Fats",
                "message": f"Contains high total fat ({fat_100g:.1f}g/100g) formulated with refined palm/hydrogenated vegetable oils. Saturated and industrial trans fatty acids contribute to LDL cholesterol oxidation and arterial plaque.",
                "action": "Restrict consumption. Choose heart-healthy unrefined monounsaturated fats (nuts, seeds, olive/mustard oil).",
                "scientific_ref": "WHO & FAO Guidelines on Saturated and Trans-Fatty Acids (2023)."
            })
        elif is_high_fat or has_bad_fats:
            warnings.append({
                "condition": "heart_disease",
                "condition_title": "Heart Disease / Cholesterol",
                "severity": "warning",
                "badge": "Lipid Profile Concern",
                "title": "Elevated Total Fat Content",
                "message": f"Total fat is {fat_100g:.1f}g per 100g. Frequent consumption may challenge cardiovascular lipid management.",
                "action": "Consume in strict moderation. Balance with soluble dietary fiber.",
                "scientific_ref": "ESC (European Society of Cardiology) Cardiovascular Prevention Guidelines."
            })

    # 4. CHILD MODE (Age < 12)
    if "child_mode" in active_conditions:
        matched_child_additives = _find_matching_additives(ingredients_text, CHILD_ALERT_ADDITIVES)
        is_ultra_sugary = sugars_100g >= T.CHILD_SUGAR_ULTRA

        if matched_child_additives:
            warnings.append({
                "condition": "child_mode",
                "condition_title": "Child Mode Advisory",
                "severity": "danger",
                "badge": "Child Health Warning",
                "title": f"Contains {len(matched_child_additives)} Pediatric Caution Additive(s)",
                "message": f"Detected: {', '.join(matched_child_additives)}. Synthetic azo dyes and intense sweeteners are subject to mandatory hyperactivity warning mandates in the EU/UK (Southampton Study) and pediatric caution advisories.",
                "action": "Avoid serving to children under 12. Offer naturally colored whole fruits, nuts, and dairy snacks.",
                "scientific_ref": "European Parliament Regulation (EC) No 1333/2008 & Lancet Southampton Study."
            })
        elif is_ultra_sugary or processing_level == "ultra_processed":
            warnings.append({
                "condition": "child_mode",
                "condition_title": "Child Mode Advisory",
                "severity": "warning",
                "badge": "High Sugar for Children",
                "title": "High Refined Sugar & Ultra-Processed Matrix",
                "message": f"Contains {sugars_100g:.1f}g sugar/100g. Children under 12 have smaller calorie allocations; excessive free sugar accelerates dental caries and childhood metabolic risk.",
                "action": "Limit frequency and portion size. Encourage fresh whole fruit snacks.",
                "scientific_ref": "AAP (American Academy of Pediatrics) Added Sugar Policy Statement."
            })

    # 5. CELIAC / GLUTEN SENSITIVITY
    if "celiac" in active_conditions or "gluten_free" in active_conditions:
        has_gluten = _has_keyword(ingredients_text, GLUTEN_KEYWORDS)
        if has_gluten:
            warnings.append({
                "condition": "celiac",
                "condition_title": "Celiac / Gluten Allergy",
                "severity": "danger",
                "badge": "Gluten Detected",
                "title": "Contains Gluten-Bearing Grains",
                "message": "Formulated with wheat, maida, barley, or malt derivatives containing gluten proteins (gliadin/glutenin).",
                "action": "STRICT AVOIDANCE for Celiac disease and Non-Celiac Gluten Sensitivity. Will trigger intestinal mucosal inflammation.",
                "scientific_ref": "Codex Alimentarius Standard for Foods for Special Dietary Use for Persons Intolerant to Gluten (CXS 118-1979)."
            })

    # 6. LACTOSE INTOLERANCE / DAIRY ALLERGY
    if "lactose" in active_conditions or "dairy_allergy" in active_conditions:
        has_dairy = _has_keyword(ingredients_text, DAIRY_KEYWORDS)
        if has_dairy:
            warnings.append({
                "condition": "lactose",
                "condition_title": "Lactose / Dairy Sensitivity",
                "severity": "danger",
                "badge": "Dairy / Lactose Present",
                "title": "Contains Milk Solids & Dairy Derivatives",
                "message": "Contains milk solids, whey, casein, or butterfat containing lactose and bovine milk proteins.",
                "action": "May cause gastrointestinal distress, bloating, cramps, or allergic reaction in lactose-intolerant individuals.",
                "scientific_ref": "FSSAI Food Safety and Standards (Packaging and Labelling) Regulations."
            })

    # 7. NUT ALLERGY
    if "nut_allergy" in active_conditions:
        has_nuts = _has_keyword(ingredients_text, NUT_KEYWORDS)
        if has_nuts:
            warnings.append({
                "condition": "nut_allergy",
                "condition_title": "Nut & Peanut Allergy",
                "severity": "danger",
                "badge": "Severe Allergen: Nuts",
                "title": "Contains Peanuts or Tree Nut Ingredients",
                "message": "Contains peanut or tree nut ingredients capable of triggering severe IgE-mediated anaphylactic reactions.",
                "action": "STRICT AVOIDANCE. High risk of severe allergic reaction.",
                "scientific_ref": "FSSAI Mandatory Allergen Declaration Norms."
            })

    # 8. SOY ALLERGY
    if "soy_allergy" in active_conditions:
        has_soy = _has_keyword(ingredients_text, SOY_KEYWORDS)
        if has_soy:
            warnings.append({
                "condition": "soy_allergy",
                "condition_title": "Soy Allergy",
                "severity": "warning",
                "badge": "Soy Detected",
                "title": "Contains Soy / Soya Derivatives",
                "message": "Contains soybean derivatives (such as soya lecithin INS 322 or soy protein).",
                "action": "Exercise caution if you have a verified soy protein allergy.",
                "scientific_ref": "Codex General Standard for the Labelling of Prepackaged Foods."
            })

    # 9. KIDNEY / RENAL HEALTH
    if "kidney_disease" in active_conditions or "renal" in active_conditions:
        matched_kidney_additives = _find_matching_additives(ingredients_text, PHOSPHORUS_POTASSIUM_ADDITIVES)
        if matched_kidney_additives or salt_100g >= T.SALT_KIDNEY:
            notes = f"Additives found: {', '.join(matched_kidney_additives)}." if matched_kidney_additives else ""
            warnings.append({
                "condition": "kidney_disease",
                "condition_title": "Kidney / Renal Health",
                "severity": "danger" if matched_kidney_additives else "warning",
                "badge": "Renal Filtration Load",
                "title": "High Phosphorus / Potassium / Sodium Additives",
                "message": f"Inorganic phosphate and potassium additives are absorbed almost 100% into the bloodstream, creating acute filtration strain on compromised kidneys. {notes}",
                "action": "Consult renal dietitian. Avoid products with inorganic phosphate and potassium salt preservatives.",
                "scientific_ref": "KDIGO (Kidney Disease: Improving Global Outcomes) Clinical Practice Guideline."
            })

    # 10. FATTY LIVER / NAFLD
    if "fatty_liver" in active_conditions or "nafld" in active_conditions:
        has_fructose = _has_keyword(ingredients_text, [r"\bfructose\b", r"\bcorn syrup\b", r"\binvert\b"])
        if has_fructose or sugars_100g >= T.SUGAR_HIGH or processing_level == "ultra_processed":
            warnings.append({
                "condition": "fatty_liver",
                "condition_title": "Fatty Liver / NAFLD",
                "severity": "warning",
                "badge": "Hepatic Fat Accumulation",
                "title": "Fructose & Rapid Sugar Delivery",
                "message": f"Free sugars and high fructose carbohydrates bypass insulin regulation and are directly metabolized in the liver into triglycerides (de novo lipogenesis).",
                "action": "Minimize ultra-processed sweet snacks. Replace with unrefined fiber-rich whole foods.",
                "scientific_ref": "EASL-EASD-EASO Clinical Practice Guidelines for the management of NAFLD."
            })

    # 11. PCOS / HORMONAL BALANCE
    if "pcos" in active_conditions:
        has_sugar = sugars_100g >= T.SUGAR_HIGH
        has_high_gi = _has_keyword(ingredients_text, [r"\bmaida\b", r"\bmaltodextrin\b", r"\binvert sugar\b", r"\bhfcs\b"])
        if has_sugar or has_high_gi:
            warnings.append({
                "condition": "pcos",
                "condition_title": "PCOS / Hormonal Balance",
                "severity": "warning",
                "badge": "Insulin Resistance Trigger",
                "title": "High Glycemic Load & Endocrine Strain",
                "message": "Elevated refined sugar and simple starch intake can stimulate androgen synthesis and worsen insulin sensitivity in PCOS.",
                "action": "Pair with fibrous seeds (chia/flax) and protein, or choose whole grain low-GI alternatives.",
                "scientific_ref": "Androgen Excess and PCOS Society Nutrition Recommendations."
            })

    # 12. PREGNANCY & NURSING SAFE MODE
    if "pregnancy" in active_conditions:
        has_caffeine = _has_keyword(ingredients_text, [r"\bcaffeine\b", r"\bcoffee\b", r"\bguarana\b", r"\benergy blend\b"])
        has_saccharin = _has_keyword(ingredients_text, [r"\bsaccharin\b", r"\be\s*954\b", r"\bins\s*954\b"])
        has_raw_unpasteurized = _has_keyword(ingredients_text, [r"\bunpasteurized\b", r"\braw milk\b"])
        if has_caffeine or has_saccharin or has_raw_unpasteurized:
            details = []
            if has_caffeine: details.append("caffeine/stimulants")
            if has_saccharin: details.append("saccharin sweetener")
            if has_raw_unpasteurized: details.append("unpasteurized dairy")
            warnings.append({
                "condition": "pregnancy",
                "condition_title": "Pregnancy & Nursing Safe Mode",
                "severity": "danger" if has_saccharin or has_raw_unpasteurized else "warning",
                "badge": "Pregnancy Caution Flag",
                "title": f"Contains {', '.join(details).capitalize()}",
                "message": "Certain intense sweeteners, unpasteurized components, and stimulants require strict intake moderation during pregnancy.",
                "action": "Check with your obstetrician or nutritionist before consuming.",
                "scientific_ref": "ACOG (American College of Obstetricians and Gynecologists) Guidelines."
            })

    # 13. IBS / LOW FODMAP & GUT HEALTH
    if "low_fodmap" in active_conditions or "ibs" in active_conditions:
        matched_polyols = _find_matching_additives(ingredients_text, GUT_IRRITANT_POLYOLS)
        has_high_fructose = _has_keyword(ingredients_text, [r"\bhfcs\b", r"\bhigh fructose\b", r"\bagave\b"])
        if matched_polyols or has_high_fructose:
            poly_names = ", ".join(matched_polyols) if matched_polyols else "high fructose"
            warnings.append({
                "condition": "low_fodmap",
                "condition_title": "IBS / Low FODMAP & Gut Care",
                "severity": "warning",
                "badge": "High Fermentable Polyol Load",
                "title": f"Contains Fermentable FODMAPs ({poly_names})",
                "message": "Sugar alcohols (polyols) and isolated fibers ferment rapidly in the colon, triggering gas, bloating, and gastrointestinal distress.",
                "action": "Limit portion size or choose gut-friendly, polyol-free whole food alternatives.",
                "scientific_ref": "Monash University FODMAP Diet Guidelines."
            })

    return warnings


def generate_healthier_swaps(
    product_name: str,
    categories_tags: List[str],
    ingredients_text: str,
    processing_level: str,
    nutrition: Dict[str, Any],
) -> List[Dict[str, Any]]:
    """
    Generates tailored, scientifically sound whole-food and minimally processed swaps.
    """
    text_lower = f"{product_name} {ingredients_text} {' '.join(categories_tags)}".lower()

    # Case A: Biscuits, Cookies, Cakes, Bakery
    if any(k in text_lower for k in ["biscuit", "cookie", "cake", "rusk", "wafer", "bakery", "glucose", "cream"]):
        return [
            {
                "name": "Roasted Almonds & Medjool Dates",
                "category": "Whole Food Snack",
                "benefits": "Zero added sugar or palm oil. Natural sweetness paired with healthy monounsaturated fats & magnesium for steady energy.",
                "why_better": "No ultra-processing, 100% bioavailable fiber, zero industrial emulsifiers.",
                "calories_density": "Moderate (Nutrient-Dense)",
                "nova_group": 1,
            },
            {
                "name": "Roasted Makhana (Fox Nuts) with Pink Salt",
                "category": "Minimally Processed",
                "benefits": "Light, crunchy, low glycemic index. High in plant protein and rich in antioxidants with zero trans fats.",
                "why_better": "90% less saturated fat, zero refined sugar, no synthetic leavening agents.",
                "calories_density": "Low",
                "nova_group": 1,
            },
            {
                "name": "100% Rolled Oats & Jaggery Homemade Cookies",
                "category": "Minimally Processed Alternative",
                "benefits": "Beta-glucan soluble fiber supports heart health and slow blood glucose release.",
                "why_better": "Zero refined white maida, zero palm oil or chemical preservatives.",
                "calories_density": "Moderate",
                "nova_group": 2,
            },
        ]

    # Case B: Savoury Chips, Namkeen, Crisps, Bhujia
    if any(k in text_lower for k in ["chips", "crisps", "namkeen", "bhujia", "kurkure", "snack", "fried"]):
        return [
            {
                "name": "Roasted Chana (Chickpeas)",
                "category": "Whole Food Staple",
                "benefits": "18g protein per 100g, 4x more dietary fiber than potato chips, virtually zero saturated fat.",
                "why_better": "Dry-roasted without deep-frying in palm oil; zero MSG or artificial flavor enhancers.",
                "calories_density": "Moderate",
                "nova_group": 1,
            },
            {
                "name": "Air-Popped Whole Corn with Spices",
                "category": "Whole Grain Snack",
                "benefits": "High volume, rich in polyphenols and dietary fiber, naturally low in calories and fat.",
                "why_better": "75% less fat than commercial fried potato crisps.",
                "calories_density": "Low",
                "nova_group": 1,
            },
            {
                "name": "Baked Beetroot & Sweet Potato Crisps",
                "category": "Minimally Processed",
                "benefits": "Preserves natural potassium, beta-carotene, and vegetable minerals with unrefined crunch.",
                "why_better": "No excessive industrial salt or INS 621 flavor enhancers.",
                "calories_density": "Moderate",
                "nova_group": 2,
            },
        ]

    # Case C: Instant Noodles, Pasta, Ready-to-eat
    if any(k in text_lower for k in ["noodle", "pasta", "maggi", "ramen", "soup"]):
        return [
            {
                "name": "Sprouted Foxtail / Little Millet Noodles with Veggies",
                "category": "Whole Grain Alternative",
                "benefits": "Rich in minerals, low glycemic index, 3x dietary fiber compared to refined maida noodles.",
                "why_better": "Not flash-fried in palm oil; free of hydrolysed vegetable protein and artificial flavour enhancers.",
                "calories_density": "Moderate",
                "nova_group": 2,
            },
            {
                "name": "Vegetable Upma / Semiya with Mustard & Curry Leaves",
                "category": "Traditional Whole Meal",
                "benefits": "Prepared fresh with vegetables and spices, providing sustained complex carbohydrates.",
                "why_better": "Zero TBHQ preservative, controlled fresh seasoning, 60% lower sodium.",
                "calories_density": "Moderate",
                "nova_group": 2,
            },
        ]

    # Case D: Soft Drinks, Colas, Sweetened Beverages, Juices
    if any(k in text_lower for k in ["beverage", "drink", "cola", "soda", "juice", "squash"]):
        return [
            {
                "name": "Fresh Tender Coconut Water",
                "category": "Natural Isotonic Drink",
                "benefits": "Natural bioavailable electrolytes (potassium, magnesium) with very low natural glycemic impact.",
                "why_better": "Zero synthetic color, zero phosphoric acid, 100% natural hydration.",
                "calories_density": "Low",
                "nova_group": 1,
            },
            {
                "name": "Chaas (Spiced Buttermilk with Cumin & Mint)",
                "category": "Probiotic Dairy",
                "benefits": "Promotes gut microbiome health, rich in calcium and natural lactic cultures.",
                "why_better": "Zero high-fructose corn syrup, no artificial sweeteners or sodium benzoate.",
                "calories_density": "Low",
                "nova_group": 1,
            },
            {
                "name": "Lemon & Fresh Mint Infused Water",
                "category": "Hydration",
                "benefits": "Refreshing natural flavor with vitamin C and zero caloric or glycemic load.",
                "why_better": "Eliminates all liquid sugars that bypass satiety signaling.",
                "calories_density": "Zero",
                "nova_group": 1,
            },
        ]

    # Case E: Chocolate, Candies, Sweet Confectionery
    if any(k in text_lower for k in ["chocolate", "candy", "sweet", "confectionery", "gems", "toffee"]):
        return [
            {
                "name": "70%+ Single-Origin Dark Chocolate (20g)",
                "category": "Antioxidant-Rich Sweet",
                "benefits": "High concentration of flavanols, copper, and iron. 60% less sugar than milk chocolate.",
                "why_better": "Contains pure cocoa butter instead of hydrogenated vegetable fats.",
                "calories_density": "High (Portion-Controlled)",
                "nova_group": 2,
            },
            {
                "name": "Raw Cacao & Walnut Energy Bites",
                "category": "Whole Food Confection",
                "benefits": "Naturally sweetened with dates, providing omega-3 fatty acids and natural satiety.",
                "why_better": "Zero synthetic vanillin, zero added refined sucrose or INS 476 emulsifiers.",
                "calories_density": "Moderate",
                "nova_group": 1,
            },
        ]

    # Default Fallback Swaps
    return [
        {
            "name": "Seasonal Fresh Fruit Bowl with Pumpkin Seeds",
            "category": "Whole Food Snack",
            "benefits": "Abundant active vitamins, bioflavonoids, natural enzymes, and protective dietary fiber.",
            "why_better": "Unprocessed, zero additives, natural water content promoting fullness.",
            "calories_density": "Low",
            "nova_group": 1,
        },
        {
            "name": "Mixed Sprouted Moong & Pomegranate Salad",
            "category": "Living Whole Food",
            "benefits": "High enzymatic activity, easily digestible plant protein, and natural antioxidant pigments.",
            "why_better": "Clean unadulterated whole food nutrition without chemical preservatives.",
            "calories_density": "Low-Moderate",
            "nova_group": 1,
        },
    ]