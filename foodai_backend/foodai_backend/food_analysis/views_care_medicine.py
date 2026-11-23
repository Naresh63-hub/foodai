from __future__ import annotations

import json
import logging
import os
import re
from rest_framework import status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from foodai_backend.food_analysis.views_ai import (
    AI_SOURCES,
    GEMINI_TEXT_SOURCE,
    GEMINI_VISION_SOURCE,
    call_gemini,
)

logger = logging.getLogger(__name__)

CARE_BASELINE_SOURCE = "clinical_care_synthesizer"
MEDICINE_BASELINE_SOURCE = "clinical_medicine_synthesizer"
SYMPTOM_BASELINE_SOURCE = "clinical_symptom_triage"

CARE_DISCLAIMER = (
    "Ingredient safety scores are for consumer awareness only and reflect published dermatological "
    "and cosmetic toxicity literature. Patch test new skincare products before widespread use."
)

MEDICINE_DISCLAIMER = (
    "Informational healthcare reference only — not medical diagnosis, treatment, or prescription. "
    "Never alter, start, or stop medication without the explicit direction of your licensed physician "
    "or registered medical practitioner."
)

SYMPTOM_DISCLAIMER = (
    "Symptom insights are intended solely for patient awareness and doctor visit preparation. "
    "FoodAI never diagnoses illness or prescribes pharmaceuticals. If experiencing severe symptoms, "
    "seek immediate emergency medical care."
)


# ============================================================================
# 1. CURATED BARCODE CATALOGS FOR CARE & MEDICINE
# ============================================================================

CARE_BARCODE_CATALOG = {
    "8901030382348": {
        "product_name": "Dove Cream Beauty Bathing Bar",
        "product_category": "soap",
        "ingredients_text": "Sodium Lauroyl Isethionate, Stearic Acid, Lauric Acid, Sodium Palmitate, Aqua, Sodium Isethionate, Sodium Stearate, Cocamidopropyl Betaine, Sodium Palm Kernelate, Glycerin, Parfum, Sodium Chloride, Zinc Oxide, Tetrasodium EDTA, Tetrasodium Etidronate, Alumina, CI 77891",
    },
    "4005900108990": {
        "product_name": "Nivea Soft Light Moisturiser",
        "product_category": "cream",
        "ingredients_text": "Aqua, Glycerin, Paraffinum Liquidum, Myristyl Alcohol, Butylene Glycol, Alcohol Denat, Stearic Acid, Myristyl Myristate, Cera Microcristallina, Glyceryl Stearate, Hydrogenated Coco-Glycerides, Simmondsia Chinensis Seed Oil, Tocopheryl Acetate, Lanolin Alcohol, Dimethicone, Sodium Carbomer, Phenoxyethanol, Linalool, Citronellol, Alpha-Isomethyl Ionone, Benzyl Alcohol, Limonene, Benzyl Salicylate, Parfum",
    },
    "8901030612148": {
        "product_name": "Pears Pure & Gentle Soap Bar",
        "product_category": "soap",
        "ingredients_text": "Sorbitol, Aqua, Sodium Palmate, Sodium Stearate, Sodium Palm Kernelate, Sodium Rosinate, Propylene Glycol, Sodium Lauryl Sulfate, PEG-4, Alcohol, Glycerin, Parfum, Sodium Chloride, Isopropyl Alcohol, Tocopheryl Acetate, Tetrasodium EDTA, Tetrasodium Etidronate, BHT",
    },
    "8901207010415": {
        "product_name": "Dettol Original Bathing Soap",
        "product_category": "soap",
        "ingredients_text": "Sodium Palmate, Sodium Palm Kernelate, Aqua, Talc, Glycerin, Parfum, Sodium Chloride, Chloroxylenol, Tetrasodium EDTA, Tetrasodium Etidronate, CI 11680, CI 12150",
    },
    "8901030383727": {
        "product_name": "Dove Daily Shine Hair Shampoo",
        "product_category": "shampoo",
        "ingredients_text": "Water, Sodium Laureth Sulfate, Dimethiconol, Cocamidopropyl Betaine, Sodium Chloride, Perfume, Glycol Distearate, Glycerin, Carbomer, Sodium Hydroxide, Guar Hydroxypropyltrimonium Chloride, Mica, Titanium Dioxide, Disodium EDTA, PEG-45M, DMDM Hydantoin, Methylchloroisothiazolinone, Methylisothiazolinone",
    },
}

MEDICINE_BARCODE_CATALOG = {
    "8901117002014": {
        "medicine_name": "Dolo 650 Tablet",
        "active_salt": "Paracetamol (Acetaminophen)",
        "strength": "650mg",
        "recent_food": "Tea, Coffee, Alcohol",
    },
    "8901043003001": {
        "medicine_name": "Pan 40 Tablet",
        "active_salt": "Pantoprazole Sodium",
        "strength": "40mg",
        "recent_food": "Breakfast, coffee",
    },
    "8901148211028": {
        "medicine_name": "Augmentin 625 Duo Tablet",
        "active_salt": "Amoxicillin and Potassium Clavulanate",
        "strength": "625mg",
        "recent_food": "Milk, Curd, Dairy",
    },
    "8901120014028": {
        "medicine_name": "Cetcip 10 (Cetirizine)",
        "active_salt": "Cetirizine Hydrochloride",
        "strength": "10mg",
        "recent_food": "Alcohol, sedative drinks",
    },
    "8901117180019": {
        "medicine_name": "Atorva 20 (Atorvastatin)",
        "active_salt": "Atorvastatin Calcium",
        "strength": "20mg",
        "recent_food": "Grapefruit, high-fat feast",
    },
}


# ============================================================================
# 2. INCI COSMETIC CHEMICAL DATABASE
# ============================================================================

INCI_CHEMICAL_DATABASE = {
    "water": {"name": "Purified Water (Aqua)", "rating": "safe", "function": "Solvent / Skin Hydration Base", "comedogenic": 0, "explanation": "Essential vehicle for delivering hydrophilic actives and maintaining emulsion integrity."},
    "aqua": {"name": "Purified Water (Aqua)", "rating": "safe", "function": "Solvent / Skin Hydration Base", "comedogenic": 0, "explanation": "Essential vehicle for delivering hydrophilic actives and maintaining emulsion integrity."},
    "glycerin": {"name": "Glycerin (Glycerol)", "rating": "safe", "function": "Humectant / Moisture Magnet", "comedogenic": 0, "explanation": "Gold-standard biocompatible humectant that draws water into the stratum corneum and strengthens barrier hydration."},
    "glycerol": {"name": "Glycerin (Glycerol)", "rating": "safe", "function": "Humectant / Moisture Magnet", "comedogenic": 0, "explanation": "Gold-standard biocompatible humectant that draws water into the stratum corneum and strengthens barrier hydration."},
    "sodium lauroyl isethionate": {"name": "Sodium Lauroyl Isethionate", "rating": "safe", "function": "Gentle Syndet Surfactant", "comedogenic": 0, "explanation": "Ultra-mild synthetic surfactant used in syndet beauty bars; cleanses without disrupting the acidic skin mantle."},
    "stearic acid": {"name": "Stearic Acid", "rating": "safe", "function": "Emollient / Fatty Acid Thickener", "comedogenic": 2, "explanation": "Natural saturated fatty acid that softens skin and stabilizes emulsions; mild pore clogging in acne-prone skin."},
    "lauric acid": {"name": "Lauric Acid", "rating": "safe", "function": "Antimicrobial Fatty Acid", "comedogenic": 4, "explanation": "Medium-chain fatty acid with antibacterial properties against C. acnes; moderate-high comedogenic risk on oily skin."},
    "sodium palmitate": {"name": "Sodium Palmitate", "rating": "caution", "function": "True Saponified Soap Salt", "comedogenic": 2, "explanation": "Alkaline salt of palmitic acid. In traditional soaps, high pH (9-10) can temporarily raise skin pH."},
    "sodium stearate": {"name": "Sodium Stearate", "rating": "caution", "function": "Soap Salt / Hardening Agent", "comedogenic": 2, "explanation": "Saponified fatty acid that gives structure to soap bars and deodorant sticks; alkaline pH."},
    "sodium isethionate": {"name": "Sodium Isethionate", "rating": "safe", "function": "Mild Syndet Cleanser Salt", "comedogenic": 0, "explanation": "Conditioning syndet ingredient that creates a creamy, low-irritancy foam profile."},
    "sodium palm kernelate": {"name": "Sodium Palm Kernelate", "rating": "caution", "function": "Saponified Cleanser", "comedogenic": 2, "explanation": "Saponified palm kernel oil providing hardness and quick lather in cleansing bars."},
    "cocamidopropyl betaine": {"name": "Cocamidopropyl Betaine (CAPB)", "rating": "safe", "function": "Secondary Amphoteric Cleanser", "comedogenic": 0, "explanation": "Mild coconut-derived surfactant that reduces irritancy of primary cleansers and creates rich lather."},
    "sodium chloride": {"name": "Sodium Chloride (Salt)", "rating": "safe", "function": "Viscosity Builder / Texture", "comedogenic": 1, "explanation": "Common mineral salt used to thicken surfactant solutions into gel textures."},
    "zinc oxide": {"name": "Zinc Oxide", "rating": "safe", "function": "Skin Protectant / Calming Mineral", "comedogenic": 1, "explanation": "Anti-inflammatory mineral that soothes diaper rash, calms redness, and offers physical UV protection."},
    "tetrasodium edta": {"name": "Tetrasodium EDTA", "rating": "caution", "function": "Chelating Agent / Stabilizer", "comedogenic": 0, "explanation": "Binds trace heavy metal ions in tap water to prevent formula rancidity; enhances penetration of other chemicals."},
    "disodium edta": {"name": "Disodium EDTA", "rating": "caution", "function": "Chelating Agent / Stabilizer", "comedogenic": 0, "explanation": "Binds metallic ions to preserve product clarity and fragrance stability over shelf life."},
    "tetrasodium etidronate": {"name": "Tetrasodium Etidronate", "rating": "caution", "function": "Chelating Agent / Preservative Booster", "comedogenic": 0, "explanation": "Chelates calcium and magnesium ions in hard water; prevents soap scum formation."},
    "alumina": {"name": "Alumina (Aluminum Oxide)", "rating": "safe", "function": "Opacifier / Viscosity Regulator", "comedogenic": 0, "explanation": "Inert mineral carrier often used to coat colorants and sunscreens; non-penetrating topically."},
    "ci 77891": {"name": "Titanium Dioxide (CI 77891)", "rating": "safe", "function": "White Pigment / Opacifier", "comedogenic": 0, "explanation": "Inert white mineral pigment used for brightness and physical opacity; non-irritating to skin."},
    "titanium dioxide": {"name": "Titanium Dioxide", "rating": "safe", "function": "Physical UV Shield / Opacifier", "comedogenic": 0, "explanation": "Inert mineral that reflects UV radiation and imparts opaque white color."},
    "parfum": {"name": "Parfum / Synthetic Fragrance", "rating": "hazardous", "function": "Aromatic Fragrance Blend", "comedogenic": 0, "explanation": "Proprietary mix of synthetic aroma chemicals; leading cause of allergic contact dermatitis and skin sensitization."},
    "perfume": {"name": "Parfum / Synthetic Fragrance", "rating": "hazardous", "function": "Aromatic Fragrance Blend", "comedogenic": 0, "explanation": "Proprietary mix of synthetic aroma chemicals; leading cause of allergic contact dermatitis and skin sensitization."},
    "fragrance": {"name": "Parfum / Synthetic Fragrance", "rating": "hazardous", "function": "Aromatic Fragrance Blend", "comedogenic": 0, "explanation": "Proprietary mix of synthetic aroma chemicals; leading cause of allergic contact dermatitis and skin sensitization."},
    "paraben": {"name": "Parabens (Preservative)", "rating": "hazardous", "function": "Synthetic Preservative", "comedogenic": 0, "explanation": "Endocrine disruptor with weak estrogenic mimicking activity; restricted in clean formulations."},
    "methylparaben": {"name": "Methylparaben", "rating": "hazardous", "function": "Synthetic Preservative", "comedogenic": 0, "explanation": "Common paraben preservative; suspected endocrine disruptor and allergen in sensitized individuals."},
    "propylparaben": {"name": "Propylparaben", "rating": "hazardous", "function": "Synthetic Preservative", "comedogenic": 0, "explanation": "High-potency paraben with higher lipophilic tissue persistence; restricted under EU cosmetic standards."},
    "butylparaben": {"name": "Butylparaben", "rating": "hazardous", "function": "Synthetic Preservative", "comedogenic": 0, "explanation": "Long-chain paraben strongly linked to estrogenic endocrine activity; banned in infant leave-on cosmetics in EU."},
    "sodium laureth sulfate": {"name": "Sodium Laureth Sulfate (SLES)", "rating": "caution", "function": "Anionic Cleansing Surfactant", "comedogenic": 0, "explanation": "Ethoxylated foaming agent. Milder than SLS, but can cause barrier dryness and may contain 1,4-dioxane traces."},
    "sodium lauryl sulfate": {"name": "Sodium Lauryl Sulfate (SLS)", "rating": "hazardous", "function": "Harsh Stripping Surfactant", "comedogenic": 0, "explanation": "Known skin irritant used as standard irritancy benchmark; strips skin intercellular lipids and breaks moisture barrier."},
    "dimethicone": {"name": "Dimethicone (Silicone)", "rating": "caution", "function": "Breathable Occlusive / Slip Agent", "comedogenic": 1, "explanation": "Synthetic silicone fluid that forms a velvety shield preventing water loss; may trap sweat/sebum on acne skin."},
    "dimethiconol": {"name": "Dimethiconol", "rating": "caution", "function": "Conditioning Silicone Gum", "comedogenic": 1, "explanation": "Heavy silicone polymer that smooths damaged hair cuticles and skin micro-fissures."},
    "paraffinum liquidum": {"name": "Mineral Oil (Paraffinum Liquidum)", "rating": "caution", "function": "Petroleum Occlusive Emollient", "comedogenic": 2, "explanation": "Highly refined petroleum hydrocarbon that traps moisture; can feel heavy and occlusive for oily skin."},
    "mineral oil": {"name": "Mineral Oil (Paraffinum Liquidum)", "rating": "caution", "function": "Petroleum Occlusive Emollient", "comedogenic": 2, "explanation": "Highly refined petroleum hydrocarbon that traps moisture; can feel heavy and occlusive for oily skin."},
    "myristyl alcohol": {"name": "Myristyl Alcohol", "rating": "caution", "function": "Fatty Alcohol Emollient", "comedogenic": 3, "explanation": "Fatty alcohol thickener providing luxurious body to lotions; moderate comedogenic risk for acne-prone pores."},
    "alcohol denat": {"name": "Denatured Alcohol (Alcohol Denat)", "rating": "caution", "function": "Penetration Enhancer / Solvent", "comedogenic": 0, "explanation": "Short-chain drying alcohol that delivers quick-drying matte finish but strips skin lipids if high in ingredient list."},
    "dmdm hydantoin": {"name": "DMDM Hydantoin", "rating": "hazardous", "function": "Formaldehyde-Releasing Preservative", "comedogenic": 0, "explanation": "Slowly releases formaldehyde over time to kill bacteria; potential allergen and carcinogen risk."},
    "methylchloroisothiazolinone": {"name": "Methylchloroisothiazolinone (MCI)", "rating": "hazardous", "function": "Strong Preservative Biocide", "comedogenic": 0, "explanation": "Potent sensitizer and contact allergen; banned in leave-on cosmetics in EU and restricted in rinse-off."},
    "methylisothiazolinone": {"name": "Methylisothiazolinone (MIT)", "rating": "hazardous", "function": "Strong Preservative Biocide", "comedogenic": 0, "explanation": "Severe skin allergen responsible for contact allergy epidemics; restricted exclusively to rinse-off formulas."},
    "bht": {"name": "BHT (Butylated Hydroxytoluene)", "rating": "hazardous", "function": "Synthetic Antioxidant / Preservative", "comedogenic": 0, "explanation": "Synthetic toluene derivative used to prevent lipid oxidation; suspected endocrine and liver toxicity concerns."},
    "phenoxyethanol": {"name": "Phenoxyethanol", "rating": "safe", "function": "Broad-Spectrum Preservative", "comedogenic": 0, "explanation": "Modern paraben-free preservative widely used under 1% concentration; safe and well-tolerated."},
    "niacinamide": {"name": "Niacinamide (Vitamin B3)", "rating": "safe", "function": "Barrier Restorative Active", "comedogenic": 0, "explanation": "Dermatologist-recommended active that boosts ceramide synthesis, reduces pore inflammation, and regulates sebum."},
    "hyaluronic acid": {"name": "Hyaluronic Acid (Sodium Hyaluronate)", "rating": "safe", "function": "Super-Humectant", "comedogenic": 0, "explanation": "Endogenous glycosaminoglycan holding up to 1000x its molecular weight in water, instantly plumping skin."},
    "ceramide np": {"name": "Ceramide NP (Ceramide 3)", "rating": "safe", "function": "Bio-Identical Barrier Lipid", "comedogenic": 0, "explanation": "Crucial structural lipid naturally occurring in the skin barrier; repairs eczema, redness, and damaged moisture barriers."},
    "tocopheryl acetate": {"name": "Vitamin E Acetate (Tocopheryl Acetate)", "rating": "safe", "function": "Lipophilic Antioxidant", "comedogenic": 1, "explanation": "Stable form of Vitamin E that scavenges free radicals generated by UV exposure and pollution."},
    "simmondsia chinensis seed oil": {"name": "Jojoba Seed Oil", "rating": "safe", "function": "Biomimetic Liquid Wax", "comedogenic": 2, "explanation": "Structurally mimics natural human sebum, dissolving hardened plugs while conditioning skin."},
    "chloroxylenol": {"name": "Chloroxylenol (PCMX)", "rating": "caution", "function": "Antibacterial Biocide", "comedogenic": 0, "explanation": "Broad-spectrum antiseptic chemical in antibacterial soaps; can disrupt healthy skin microbiome with daily use."},
    "talc": {"name": "Cosmetic Talc", "rating": "caution", "function": "Slip Agent / Oil Absorbent", "comedogenic": 1, "explanation": "Natural hydrous magnesium silicate used for dry velvety slip; must be verified asbestos-free."},
}


# ============================================================================
# 3. PERSONAL CARE & COSMETICS EVALUATOR
# ============================================================================

def evaluate_care_product_fallback(
    query: str,
    ingredients_text: str = "",
    skin_type: str = "all",
) -> dict:
    """Deterministic, clinical rule-based evaluator for skincare, soaps, and cosmetics."""
    full_text = f"{query} {ingredients_text}".lower()

    clean_score = 82
    hazard_level = "Clean / Low Hazard"
    product_category = "Skincare & Personal Care"
    comedogenic_rating = 1

    if any(k in full_text for k in ["soap", "bar", "bath"]):
        product_category = "Bathing Soap / Cleansing Bar"
    elif any(k in full_text for k in ["shampoo", "hair wash", "scalp"]):
        product_category = "Hair Care / Shampoo"
    elif any(k in full_text for k in ["cream", "moisturiz", "lotion"]):
        product_category = "Moisturizing Cream / Lotion"
    elif any(k in full_text for k in ["sunscreen", "spf", "sun"]):
        product_category = "Sun Protection / SPF"
    elif any(k in full_text for k in ["serum", "oil", "face"]):
        product_category = "Facial Treatment / Serum"

    # Split ingredients by comma, semicolon, or newline
    raw_tokens = re.split(r"[,;\n•]+", ingredients_text or query)
    cleaned_tokens = [t.strip() for t in raw_tokens if len(t.strip()) > 1]

    all_ingredients_breakdown = []
    harmful_ingredients = []
    beneficial_ingredients = []

    for token in cleaned_tokens:
        tok_clean = token.lower().strip()
        matched_info = None

        # Exact or partial match in INCI chemical database
        for key, data in INCI_CHEMICAL_DATABASE.items():
            if key == tok_clean or key in tok_clean:
                matched_info = data
                break

        if matched_info:
            item_name = matched_info["name"]
            item_rating = matched_info["rating"]
            item_func = matched_info["function"]
            item_comedogenic = matched_info["comedogenic"]
            item_explanation = matched_info["explanation"]
        else:
            # Heuristic classification for unlisted ingredients
            item_name = token.title()
            if any(h in tok_clean for h in ["paraben", "sulfate", "phthalate", "dmdm", "formaldehyde", "bht", "bha"]):
                item_rating = "hazardous"
                item_func = "Synthetic Preservative / Chemical Additive"
                item_comedogenic = 0
                item_explanation = "Flagged chemical compound associated with dermatological irritation or systemic health concerns."
            elif any(c in tok_clean for c in ["fragrance", "parfum", "alcohol", "silicone", "dimethicone", "oil", "ci ", "edta"]):
                item_rating = "caution"
                item_func = "Processing Additive / Texture Modifier"
                item_comedogenic = 2
                item_explanation = "Cosmetic formulation ingredient requiring caution for sensitive or acne-prone skin types."
            else:
                item_rating = "safe"
                item_func = "Cosmetic Emollient / Skin Conditioning"
                item_comedogenic = 0
                item_explanation = "Standard cosmetic ingredient with documented low topical hazard profile."

        # Assign regulatory flag tags
        reg_flags = []
        if item_rating == "hazardous":
            reg_flags.append("Toxic Concern")
            clean_score -= 15
        elif item_rating == "caution":
            reg_flags.append("Use with Caution")
            clean_score -= 5
        else:
            reg_flags.append("Safe Formulation")

        if item_comedogenic >= 3:
            reg_flags.append(f"Pore Clogging (Rating {item_comedogenic}/5)")
            if item_comedogenic > comedogenic_rating:
                comedogenic_rating = item_comedogenic

        ingredient_entry = {
            "name": item_name,
            "safety_rating": item_rating,
            "function": item_func,
            "comedogenic_score": item_comedogenic,
            "explanation": item_explanation,
            "regulatory_flags": reg_flags,
        }
        all_ingredients_breakdown.append(ingredient_entry)

        if item_rating == "hazardous":
            harmful_ingredients.append({
                "name": item_name,
                "hazard_severity": "High",
                "category": item_func,
                "concern": item_explanation,
            })
        elif item_rating == "caution" and any(k in tok_clean for k in ["edta", "alcohol", "fragrance", "parfum", "sulfate"]):
            harmful_ingredients.append({
                "name": item_name,
                "hazard_severity": "Moderate",
                "category": item_func,
                "concern": item_explanation,
            })
        elif item_rating == "safe" and any(b in tok_clean for b in ["glycerin", "ceramide", "niacinamide", "hyaluron", "zinc", "aloe", "tocopherol"]):
            beneficial_ingredients.append({
                "name": item_name,
                "benefit": item_explanation,
            })

    # If no beneficial ingredients found, add standard moisturizing actives
    if not beneficial_ingredients:
        beneficial_ingredients.append({
            "name": "Purified Water & Emollients",
            "benefit": "Provides baseline topical hydration and spreadability for daily skincare.",
        })

    clean_score = max(15, min(98, clean_score))
    if clean_score >= 80:
        hazard_level = "Clean / Low Hazard"
    elif clean_score >= 55:
        hazard_level = "Moderate / Caution"
    else:
        hazard_level = "High Hazard / Contains Toxins"

    skin_compatibility = {
        "dry_skin": clean_score >= 60 and not any("sulfate" in h["name"].lower() for h in harmful_ingredients),
        "oily_acne_prone": comedogenic_rating <= 2,
        "sensitive_skin": not any(h["hazard_severity"] in ["Moderate", "High"] for h in harmful_ingredients),
        "normal_skin": True,
    }

    clean_swaps = [
        {
            "name": "Cold-Pressed Plant Squalane & Ceramide Barrier Cream",
            "category": "Clean Moisturizer",
            "why_better": "Zero synthetic parabens, fragrance-free, non-comedogenic (rating 0), 100% bio-compatible.",
        },
        {
            "name": "Gentle Amino Acid & Oat Cleansing Bar",
            "category": "Sulfate-Free Soap Alternative",
            "why_better": "Sulfate-free pH 5.5 syndet bar formulated with colloidal oatmeal and coconut amino acids.",
        },
    ]

    safe_count = sum(1 for i in all_ingredients_breakdown if i["safety_rating"] == "safe")
    caution_count = sum(1 for i in all_ingredients_breakdown if i["safety_rating"] == "caution")
    hazardous_count = sum(1 for i in all_ingredients_breakdown if i["safety_rating"] == "hazardous")

    hazard_summary = {
        "total_ingredients": len(all_ingredients_breakdown),
        "safe_count": safe_count,
        "moderate_hazard_count": caution_count,
        "high_hazard_count": hazardous_count,
    }

    return {
        "product_name": query.title() if query else "Personal Care Product",
        "product_category": product_category,
        "clean_score": clean_score,
        "hazard_level": hazard_level,
        "comedogenic_rating": comedogenic_rating,
        "harmful_ingredients": harmful_ingredients,
        "beneficial_ingredients": beneficial_ingredients,
        "all_ingredients_breakdown": all_ingredients_breakdown,
        "hazard_summary": hazard_summary,
        "skin_compatibility": skin_compatibility,
        "clean_swaps": clean_swaps,
        "data_source": CARE_BASELINE_SOURCE,
        "disclaimer": CARE_DISCLAIMER,
    }


class CareProductAnalyzeView(APIView):
    """
    Evaluates personal care products, creams, soaps, lotions, shampoos, and cosmetics.
    Identifies clean score, full chemical ingredients breakdown, endocrine disruptors,
    comedogenic pore clogging, and toxin-free clean swaps.
    """
    permission_classes = [AllowAny]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def post(self, request):
        barcode = (request.data.get("barcode") or "").strip()
        product_name = (request.data.get("product_name") or "").strip()
        ingredients_text = (request.data.get("ingredients_text") or "").strip()
        skin_type = (request.data.get("skin_type") or "all").strip().lower()
        image_base64 = (request.data.get("image_base64") or "").strip()

        # Check barcode in curated care catalog
        if barcode and barcode in CARE_BARCODE_CATALOG:
            cat_entry = CARE_BARCODE_CATALOG[barcode]
            if not product_name:
                product_name = cat_entry["product_name"]
            if not ingredients_text:
                ingredients_text = cat_entry["ingredients_text"]

        combined_query = f"{product_name} {ingredients_text}".strip()
        if not combined_query and not image_base64:
            return Response(
                {"error": "Please provide a barcode, product name, ingredients text, or label photo."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        prompt = (
            "You are a clinical cosmetic chemist and dermatologist. Analyze this personal care / cosmetic product "
            "(soap, cream, lotion, shampoo, serum, or sunscreen). Provide a complete chemical analysis of all ingredients.\n"
            f"Product: {product_name or 'Unspecified'}\n"
            f"Barcode: {barcode or 'N/A'}\n"
            f"Ingredients Text: {ingredients_text or 'Infer from label photo or product name'}\n"
            f"Target Skin Type: {skin_type}\n\n"
            "Return ONLY valid JSON matching this exact structure:\n"
            "{\n"
            '  "product_name": "string",\n'
            '  "product_category": "string (e.g. Bathing Soap, Moisturizing Cream, Hair Shampoo)",\n'
            '  "clean_score": integer (0 to 100, where 100 is completely non-toxic and natural),\n'
            '  "hazard_level": "Clean / Low Hazard" | "Moderate / Caution" | "High Hazard / Contains Toxins",\n'
            '  "comedogenic_rating": integer (0 to 5 pore-clogging scale),\n'
            '  "all_ingredients_breakdown": [\n'
            '    {\n'
            '      "name": "string (chemical name)",\n'
            '      "safety_rating": "safe" | "caution" | "hazardous",\n'
            '      "function": "string (e.g. Humectant, Surfactant, Preservative, Emollient, Chelating Agent)",\n'
            '      "comedogenic_score": integer (0 to 5),\n'
            '      "explanation": "string explaining biological impact on skin",\n'
            '      "regulatory_flags": ["string", "string"]\n'
            '    }\n'
            "  ],\n"
            '  "hazard_summary": {\n'
            '    "total_ingredients": integer,\n'
            '    "safe_count": integer,\n'
            '    "moderate_hazard_count": integer,\n'
            '    "high_hazard_count": integer\n'
            "  },\n"
            '  "harmful_ingredients": [\n'
            '    {\n'
            '      "name": "string",\n'
            '      "hazard_severity": "Low" | "Moderate" | "High",\n'
            '      "category": "string",\n'
            '      "concern": "string"\n'
            '    }\n'
            "  ],\n"
            '  "beneficial_ingredients": [\n'
            '    {\n'
            '      "name": "string",\n'
            '      "benefit": "string"\n'
            '    }\n'
            "  ],\n"
            '  "skin_compatibility": {\n'
            '    "dry_skin": boolean,\n'
            '    "oily_acne_prone": boolean,\n'
            '    "sensitive_skin": boolean,\n'
            '    "normal_skin": boolean\n'
            "  },\n"
            '  "clean_swaps": [\n'
            '    {\n'
            '      "name": "string",\n'
            '      "category": "string",\n'
            '      "why_better": "string"\n'
            '    }\n'
            "  ]\n"
            "}"
        )

        parts = []
        if image_base64:
            clean_b64 = re.sub(r"^data:image\/[a-zA-Z]+;base64,", "", image_base64)
            parts.append({"inline_data": {"mime_type": "image/jpeg", "data": clean_b64}})
        parts.append({"text": prompt})

        payload = {
            "contents": [{"parts": parts}],
            "generationConfig": {"temperature": 0.1, "maxOutputTokens": 1500},
        }

        raw_text, error_reason = call_gemini(payload, timeout=20)
        if raw_text:
            try:
                clean_json_str = re.sub(r"^```json\s*", "", raw_text.strip(), flags=re.MULTILINE)
                clean_json_str = re.sub(r"^```\s*", "", clean_json_str, flags=re.MULTILINE)
                clean_json_str = re.sub(r"```$", "", clean_json_str.strip())
                parsed = json.loads(clean_json_str)
                parsed["data_source"] = GEMINI_VISION_SOURCE if image_base64 else GEMINI_TEXT_SOURCE
                parsed["disclaimer"] = CARE_DISCLAIMER
                return Response(parsed)
            except Exception as e:
                logger.warning("Care analysis JSON parsing failed: %s", e)

        # Seamless deterministic fallback
        fallback = evaluate_care_product_fallback(
            query=combined_query or "Personal Care Item",
            ingredients_text=ingredients_text,
            skin_type=skin_type,
        )
        return Response(fallback)


# ============================================================================
# 4. MEDICINE & PHARMACOLOGICAL EVALUATOR
# ============================================================================

MEDICINE_KNOWLEDGE_BASE = {
    "paracetamol": {
        "active_salt": "Paracetamol (Acetaminophen)",
        "strength": "500mg / 650mg",
        "therapeutic_category": "Analgesic & Antipyretic (Pain & Fever Relief)",
        "common_uses": "Headache, body aches, postoperative pain, and reducing fever.",
        "meal_timing": "Can be taken with or without food. With water.",
        "food_drug_interactions": [
            {
                "food_or_beverage": "Alcohol & Ethanol",
                "severity": "Severe / Dangerous",
                "interaction": "Alcohol induces CYP2E1 enzymes, significantly increasing toxic NAPQI metabolites and liver necrosis risk.",
            },
            {
                "food_or_beverage": "High-Carbohydrate Meals",
                "severity": "Minor / Delayed",
                "interaction": "Very high pectin or carbohydrate content may slightly slow rate of absorption, but does not reduce overall effectiveness.",
            },
        ],
        "alcohol_contraindicated": True,
        "generic_salt_name": "Jan Aushadhi Paracetamol 650mg Tablets",
        "common_side_effects": ["Nausea (rare)", "Allergic skin rash (rare)", "Liver toxicity with overdose (>4,000mg/day)"],
        "key_safety_warning": "Do not exceed 4,000mg in 24 hours. Check other cold remedies to prevent accidental paracetamol overdose.",
    },
    "dolo": {
        "active_salt": "Paracetamol (Acetaminophen)",
        "strength": "650mg",
        "therapeutic_category": "Analgesic & Antipyretic",
        "common_uses": "High fever, viral body aches, toothache, and muscular pains.",
        "meal_timing": "Take with water. Taking with or after light food is gentler on sensitive stomachs.",
        "food_drug_interactions": [
            {
                "food_or_beverage": "Alcohol & Alcoholic Beverages",
                "severity": "Severe / Dangerous",
                "interaction": "Concurrent alcohol consumption dramatically accelerates toxic metabolite conversion in the liver.",
            },
        ],
        "alcohol_contraindicated": True,
        "generic_salt_name": "Jan Aushadhi Paracetamol 650mg Tablets",
        "common_side_effects": ["Rare skin reaction", "Mild gastric heaviness"],
        "key_safety_warning": "Maintain a minimum 4 to 6-hour gap between doses. Maximum 4 tablets in 24 hours.",
    },
    "pantoprazole": {
        "active_salt": "Pantoprazole Sodium (Enteric Coated)",
        "strength": "40mg",
        "therapeutic_category": "Proton Pump Inhibitor (PPI / Antacid)",
        "common_uses": "Gastroesophageal reflux disease (GERD), acid peptic disease, stomach ulcers, and heartburn.",
        "meal_timing": "Strictly take 30 to 45 minutes before morning breakfast on an empty stomach with a full glass of plain water.",
        "food_drug_interactions": [
            {
                "food_or_beverage": "Heavy Fatty Foods & Coffee at time of dose",
                "severity": "Moderate / Ineffective",
                "interaction": "Food in the stomach delays PPI gastric emptying and blunts proton pump inhibition. Take on an empty stomach.",
            },
        ],
        "alcohol_contraindicated": False,
        "generic_salt_name": "Jan Aushadhi Pantoprazole 40mg Gastro-Resistant Tablets",
        "common_side_effects": ["Mild headache", "Diarrhea", "Long-term use may impair B12 & Calcium absorption"],
        "key_safety_warning": "Swallow tablet whole; do not crush or chew gastro-resistant enteric coating.",
    },
    "pan": {
        "active_salt": "Pantoprazole Sodium (Enteric Coated)",
        "strength": "40mg",
        "therapeutic_category": "Proton Pump Inhibitor (PPI / Antacid)",
        "common_uses": "Gastroesophageal reflux disease (GERD), acid peptic disease, stomach ulcers, and heartburn.",
        "meal_timing": "Strictly take 30 to 45 minutes before morning breakfast on an empty stomach with a full glass of plain water.",
        "food_drug_interactions": [
            {
                "food_or_beverage": "Heavy Breakfast & Coffee at time of dose",
                "severity": "Moderate / Ineffective",
                "interaction": "PPI must reach peak plasma levels when gastric parietal proton pumps activate with food. Always take 30 mins before eating.",
            },
        ],
        "alcohol_contraindicated": False,
        "generic_salt_name": "Jan Aushadhi Pantoprazole 40mg Tablets",
        "common_side_effects": ["Mild headache", "Diarrhea", "Long-term use may impair B12 & Calcium absorption"],
        "key_safety_warning": "Swallow tablet whole; do not crush or chew gastro-resistant enteric coating.",
    },
    "cetirizine": {
        "active_salt": "Cetirizine Dihydrochloride",
        "strength": "10mg",
        "therapeutic_category": "Second-Generation Antihistamine",
        "common_uses": "Allergic rhinitis, sneezing, runny nose, watery eyes, hives, and pruritus (itching).",
        "meal_timing": "Preferably taken in the evening after dinner, with or without food.",
        "food_drug_interactions": [
            {
                "food_or_beverage": "Alcohol & Sedative Drinks",
                "severity": "Severe / Avoid",
                "interaction": "Compounds CNS depression, causing severe drowsiness and impaired psychomotor coordination.",
            },
        ],
        "alcohol_contraindicated": True,
        "generic_salt_name": "Jan Aushadhi Cetirizine 10mg Tablets",
        "common_side_effects": ["Mild sedation / drowsiness", "Dry mouth", "Fatigue"],
        "key_safety_warning": "May cause drowsiness; avoid driving or operating heavy machinery until your response is known.",
    },
    "amoxicillin": {
        "active_salt": "Amoxicillin + Clavulanic Acid (Co-Amoxiclav)",
        "strength": "625mg",
        "therapeutic_category": "Broad-Spectrum Beta-Lactam Antibiotic",
        "common_uses": "Bacterial respiratory tract infections, sinus infections, ear infections, and urinary tract infections.",
        "meal_timing": "Take at the start of a meal or immediately after food to minimize stomach upset and optimize absorption.",
        "food_drug_interactions": [
            {
                "food_or_beverage": "High-Calcium Milk & Dairy",
                "severity": "Moderate / Space out by 2 hours",
                "interaction": "Heavy calcium binding can inhibit intestinal absorption. Space out dairy by 2 hours.",
            },
            {
                "food_or_beverage": "Fermented Probiotic Foods (Curd / Yogurt)",
                "severity": "Beneficial / Space out",
                "interaction": "Yogurt helps restore gut flora disrupted by antibiotics; consume 2 hours apart from dose.",
            },
        ],
        "alcohol_contraindicated": True,
        "generic_salt_name": "Jan Aushadhi Amoxicillin and Potassium Clavulanate 625mg Tablets",
        "common_side_effects": ["Mild diarrhea", "Nausea", "Yeast overgrowth (candidiasis)"],
        "key_safety_warning": "Always complete the full prescribed antibiotic course even if feeling better, to avoid antimicrobial resistance.",
    },
    "atorvastatin": {
        "active_salt": "Atorvastatin Calcium",
        "strength": "10mg / 20mg",
        "therapeutic_category": "HMG-CoA Reductase Inhibitor (Lipid-Lowering Statin)",
        "common_uses": "Lowering LDL cholesterol and triglycerides, reducing cardiovascular and stroke risk.",
        "meal_timing": "Take once daily in the evening or bedtime, with or without meals.",
        "food_drug_interactions": [
            {
                "food_or_beverage": "Grapefruit / Grapefruit Juice",
                "severity": "Critical / Strictly Avoid",
                "interaction": "Inactivates CYP3A4 enzymes, raising atorvastatin blood levels dramatically and increasing risk of severe muscle toxicity (rhabdomyolysis).",
            },
        ],
        "alcohol_contraindicated": True,
        "generic_salt_name": "Jan Aushadhi Atorvastatin 10mg / 20mg Tablets",
        "common_side_effects": ["Muscle soreness (myalgia)", "Joint pain", "Mild digestive disturbance"],
        "key_safety_warning": "Report unexplained muscle pain, tenderness, or dark brown urine immediately to your physician.",
    },
}

MEDICINE_PHARMA_PROFILES = {
    "dolo": {
        "mechanism": "Selectively inhibits prostaglandin synthesis via central COX-2 pathway, elevating the pain threshold and acting on the hypothalamic heat-regulating center to lower fever.",
        "liver": "90-95% metabolized in the liver via glucuronidation and sulfation. 5% metabolized by CYP2E1 into toxic NAPQI, which is neutralized by glutathione. Concurrent alcohol drains glutathione, causing hepatotoxicity.",
        "kidneys": "Less than 5% excreted unchanged by the kidneys; metabolite conjugates are excreted in urine.",
        "stomach": "Lacks peripheral COX-1 inhibition; does not erode gastric mucosal barrier unlike Aspirin or Ibuprofen.",
    },
    "pan": {
        "mechanism": "Irreversibly binds to H+/K+ ATPase enzyme systems (proton pumps) on the secretory surface of gastric parietal cells, shutting down both basal and stimulated gastric acid secretion.",
        "liver": "Extensively metabolized by cytochrome P450 isoenzymes (primarily CYP2C19 and CYP3A4) into inactive sulfone and desmethyl metabolites.",
        "kidneys": "Approx. 80% of metabolites eliminated via renal urine excretion, 20% in feces.",
        "stomach": "Target organ: Raises intragastric pH above 4.0, healing peptic ulcers and preventing acid reflux into the esophagus.",
    },
    "amoxicillin": {
        "mechanism": "Amoxicillin inhibits bacterial cell wall synthesis during active replication; Potassium Clavulanate acts as a suicide inhibitor of bacterial beta-lactamase enzymes, preventing antibiotic breakdown.",
        "liver": "Low hepatic metabolism (approx. 10%). Clavulanic acid can occasionally cause cholestatic jaundice in rare susceptible patients.",
        "kidneys": "50-70% excreted unchanged in urine via glomerular filtration and tubular secretion within 6 hours. Stay well hydrated.",
        "stomach": "Can cause local irritation, nausea, or altered gut flora diarrhea. Must be taken at the start of a meal.",
    },
    "cetirizine": {
        "mechanism": "Potent and selective competitive antagonist of peripheral H1-histamine receptors, preventing allergic mediator cascade without crossing the blood-brain barrier at low doses.",
        "liver": "Minimal hepatic metabolism; not dependent on CYP450 enzymes.",
        "kidneys": "70% excreted unchanged via urine. Dose adjustment needed in patients with impaired renal clearance.",
        "stomach": "Well tolerated; non-irritating to gastric mucosa.",
    },
    "atorvastatin": {
        "mechanism": "Competitively inhibits HMG-CoA reductase, the rate-limiting enzyme in hepatic cholesterol synthesis, upregulating LDL receptors on hepatocytes and clearing LDL from circulation.",
        "liver": "Extensively metabolized by hepatic CYP3A4. Grapefruit juice blocks CYP3A4, causing dangerous 300% blood spikes and muscle toxicity.",
        "kidneys": "Less than 2% eliminated by kidneys; primarily cleared via biliary and fecal excretion.",
        "stomach": "Take with or without food. High-fat meals do not alter total statin absorption.",
    },
}

MEDICINE_EXCIPIENTS_DATABASE = {
    "dolo": [
        {"name": "Microcrystalline Cellulose (MCC)", "category": "Binder & Bulking Agent", "concern": "Inert plant cellulose fiber that ensures the tablet holds shape and dissolves rapidly in the stomach. Completely non-toxic."},
        {"name": "Sodium Starch Glycolate", "category": "Superdisintegrant", "concern": "Promotes rapid water uptake to break the tablet apart within 3-5 minutes for prompt analgesia."},
        {"name": "Magnesium Stearate", "category": "Tableting Lubricant", "concern": "Vegetable-derived fatty acid salt that prevents powder from sticking to pharmaceutical tablet presses."},
        {"name": "Colloidal Silicon Dioxide", "category": "Glidant", "concern": "Prevents clumping during powder mixing and tablet compression."},
    ],
    "pan": [
        {"name": "Methacrylic Acid Copolymer", "category": "Enteric Coating Polymer", "concern": "Crucial acid-resistant shield that prevents gastric stomach acid from destroying pantoprazole, releasing it in the small intestine."},
        {"name": "Titanium Dioxide (E171)", "category": "Opacifying Coating Pigment", "concern": "Provides crisp white film coating; banned in EU food in 2022 due to nano-particle genotoxicity debate, still permitted in pharmaceuticals."},
        {"name": "Triethyl Citrate", "category": "Film Plasticizer", "concern": "Gives elasticity to the enteric film coating to prevent cracking during swallowing."},
        {"name": "Iron Oxide Yellow (E172)", "category": "Tableting Colorant", "concern": "Pharma-grade mineral colorant for distinctive yellow tablet identification."},
    ],
    "amoxicillin": [
        {"name": "Microcrystalline Cellulose", "category": "Binder / Bulking Filler", "concern": "Bulking excipient to achieve optimal tablet dosage volume."},
        {"name": "Colloidal Anhydrous Silica", "category": "Desiccant & Anti-Caking", "concern": "Protects moisture-sensitive clavulanic acid from hydrolytic breakdown."},
        {"name": "Hypromellose (HPMC)", "category": "Film Coating Agent", "concern": "Smooth polymer film coat enabling easy swallowing and masking bitter antibiotic taste."},
        {"name": "Titanium Dioxide (E171)", "category": "Film Opacifier", "concern": "Coating opacifier for moisture and light protection."},
    ],
    "cetirizine": [
        {"name": "Lactose Monohydrate", "category": "Bulking Filler", "concern": "Common pharmaceutical filler; individuals with severe lactose intolerance may experience mild bloating."},
        {"name": "Hypromellose", "category": "Film Coat", "concern": "Protective moisture-barrier coating."},
        {"name": "Polyethylene Glycol (PEG 400)", "category": "Coating Plasticizer", "concern": "Water-soluble polymer for smooth tablet finish."},
    ],
    "atorvastatin": [
        {"name": "Calcium Carbonate", "category": "Stabilizing Antacid Buffer", "concern": "Creates an alkaline micro-environment to prevent acid degradation of atorvastatin calcium."},
        {"name": "Candelilla Wax", "category": "Polishing Agent", "concern": "Natural plant wax applied to give a smooth glossy finish for frictionless swallowing."},
        {"name": "Hydroxypropyl Cellulose", "category": "Disintegrant", "concern": "Expands in digestive fluids to ensure prompt systemic absorption."},
    ],
}


def evaluate_medicine_fallback(query: str, recent_food: str = "") -> dict:
    """Clinical rule-based pharmaceutical evaluator with food-drug interaction check."""
    q = (query or "").lower().strip()
    match = None
    matched_key = "dolo"

    for key, data in MEDICINE_KNOWLEDGE_BASE.items():
        if key in q:
            match = data
            matched_key = key
            break

    if not match:
        match = {
            "active_salt": query.title() if query else "Pharmaceutical Compound",
            "strength": "Standard clinical strength",
            "therapeutic_category": "Therapeutic Medication",
            "common_uses": "Symptomatic relief as prescribed by registered medical practitioner.",
            "meal_timing": "Take strictly as indicated on prescription label. Generally with a full glass of water.",
            "food_drug_interactions": [
                {
                    "food_or_beverage": "Alcoholic Beverages",
                    "severity": "Moderate / Avoid",
                    "interaction": "Alcohol can disrupt medication absorption, augment side effects, and burden liver metabolism.",
                },
                {
                    "food_or_beverage": "Grapefruit Juice",
                    "severity": "Caution",
                    "interaction": "Inhibits liver cytochrome enzymes (CYP3A4) for multiple drug classes.",
                },
            ],
            "alcohol_contraindicated": True,
            "generic_salt_name": "Consult Jan Aushadhi generic catalog for chemical salt equivalent",
            "common_side_effects": ["Mild gastric upset", "Drowsiness (verify product type)"],
            "key_safety_warning": "Keep out of reach of children. Store in a cool, dry place away from direct sunlight.",
        }

    # Fetch pharmacological profile
    pharma_data = None
    for k, p in MEDICINE_PHARMA_PROFILES.items():
        if k in q or k in matched_key:
            pharma_data = p
            break

    if not pharma_data:
        pharma_data = {
            "mechanism": "Binds specific biological receptors and enzymes to modulate metabolic and cellular signaling pathways.",
            "liver": "Metabolized primarily through hepatic pathways. Avoid excessive alcohol to prevent enzyme saturation.",
            "kidneys": "Renal clearance via glomerular filtration. Ensure consistent daily hydration.",
            "stomach": "Swallow with water. Can be taken with meals if gastric sensitivity occurs.",
        }

    pharmacological_profile = {
        "mechanism_of_action": pharma_data["mechanism"],
        "organ_impact": {
            "liver": pharma_data["liver"],
            "kidneys": pharma_data["kidneys"],
            "stomach": pharma_data["stomach"],
        },
    }

    # Fetch inactive excipients & chemical additives
    excipients_list = None
    for k, ex in MEDICINE_EXCIPIENTS_DATABASE.items():
        if k in q or k in matched_key:
            excipients_list = ex
            break

    if not excipients_list:
        excipients_list = [
            {"name": "Microcrystalline Cellulose", "category": "Bulking Binder", "concern": "Inert plant cellulose providing tablet volume. Non-toxic."},
            {"name": "Magnesium Stearate", "category": "Tableting Lubricant", "concern": "Common pharmaceutical processing aid."},
            {"name": "Titanium Dioxide (E171)", "category": "Film Coating Pigment", "concern": "Provides moisture barrier and white opacity."},
        ]

    return {
        "medicine_name": query.title() if query else "Prescribed Medicine",
        **match,
        "pharmacological_profile": pharmacological_profile,
        "excipients_and_additives": excipients_list,
        "data_source": MEDICINE_BASELINE_SOURCE,
        "disclaimer": MEDICINE_DISCLAIMER,
    }


class MedicineAnalyzeView(APIView):
    """
    Evaluates tablets, syrups, drops, and pharmaceutical blister strips.
    Extracts active chemical salts, meal timing rules (before vs after food),
    critical food-drug interactions, generic Jan Aushadhi alternatives, and safety warnings.
    """
    permission_classes = [AllowAny]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def post(self, request):
        barcode = (request.data.get("barcode") or "").strip()
        medicine_name = (request.data.get("medicine_name") or "").strip()
        label_text = (request.data.get("label_text") or "").strip()
        recent_food = (request.data.get("recent_food") or request.data.get("recent_food_eaten") or "").strip()
        image_base64 = (request.data.get("image_base64") or "").strip()

        # Check barcode in curated medicine catalog
        if barcode and barcode in MEDICINE_BARCODE_CATALOG:
            med_entry = MEDICINE_BARCODE_CATALOG[barcode]
            if not medicine_name:
                medicine_name = med_entry["medicine_name"]
            if not recent_food and "food" in med_entry:
                recent_food = med_entry["food"]

        combined = f"{medicine_name} {label_text}".strip()
        if not combined and not image_base64:
            return Response(
                {"error": "Please provide a barcode, medicine name, blister strip text, or label photo."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        prompt = (
            "You are a clinical pharmacologist and healthcare educator. Analyze this pharmaceutical medication "
            "(tablet, capsule, syrup, or drops). Provide active salt details, meal timing instructions, "
            "food-drug interactions, pharmacological organ pathways, inactive chemical excipients, and Jan Aushadhi generic alternatives.\n"
            f"Medicine Input: {medicine_name or 'Unspecified'}\n"
            f"Barcode: {barcode or 'N/A'}\n"
            f"Label Text: {label_text or 'Infer from blister photo or name'}\n"
            f"User's Recent Food Context: {recent_food or 'None specified'}\n\n"
            "Return ONLY valid JSON matching this exact structure:\n"
            "{\n"
            '  "medicine_name": "string",\n'
            '  "active_salt": "string (chemical generic salt name and strength, e.g. Paracetamol 650mg)",\n'
            '  "strength": "string",\n'
            '  "therapeutic_category": "string (e.g. Analgesic & Antipyretic, Antibiotic, Antacid PPI)",\n'
            '  "common_uses": "string summarizing medical indications",\n'
            '  "meal_timing": "string (e.g. Strictly 30 mins before breakfast on empty stomach OR Take after meals)",\n'
            '  "pharmacological_profile": {\n'
            '    "mechanism_of_action": "string describing how the drug works biologically",\n'
            '    "organ_impact": {\n'
            '      "liver": "string describing hepatic metabolism and safety",\n'
            '      "kidneys": "string describing renal clearance",\n'
            '      "stomach": "string describing gastric mucosal effects"\n'
            '    }\n'
            '  },\n'
            '  "excipients_and_additives": [\n'
            '    {\n'
            '      "name": "string (e.g. Titanium Dioxide E171, Sodium Benzoate, Sorbitol)",\n'
            '      "category": "string (e.g. Tablet Coating Opacifier, Preservative, Sweetener)",\n'
            '      "concern": "string explaining excipient purpose and potential concerns"\n'
            '    }\n'
            '  ],\n'
            '  "food_drug_interactions": [\n'
            '    {\n'
            '      "food_or_beverage": "string (e.g. Alcohol, Grapefruit Juice, Dairy/Calcium)",\n'
            '      "severity": "Minor" | "Moderate" | "Severe / Dangerous",\n'
            '      "interaction": "string explaining biochemical conflict"\n'
            '    }\n'
            '  ],\n'
            '  "alcohol_contraindicated": boolean,\n'
            '  "generic_salt_name": "string (Jan Aushadhi affordable salt name)",\n'
            '  "common_side_effects": ["string", "string"],\n'
            '  "key_safety_warning": "string"\n'
            "}"
        )

        parts = []
        if image_base64:
            clean_b64 = re.sub(r"^data:image\/[a-zA-Z]+;base64,", "", image_base64)
            parts.append({"inline_data": {"mime_type": "image/jpeg", "data": clean_b64}})
        parts.append({"text": prompt})

        payload = {
            "contents": [{"parts": parts}],
            "generationConfig": {"temperature": 0.1, "maxOutputTokens": 1500},
        }

        raw_text, error_reason = call_gemini(payload, timeout=20)
        if raw_text:
            try:
                clean_json_str = re.sub(r"^```json\s*", "", raw_text.strip(), flags=re.MULTILINE)
                clean_json_str = re.sub(r"^```\s*", "", clean_json_str, flags=re.MULTILINE)
                clean_json_str = re.sub(r"```$", "", clean_json_str.strip())
                parsed = json.loads(clean_json_str)
                parsed["data_source"] = GEMINI_VISION_SOURCE if image_base64 else GEMINI_TEXT_SOURCE
                parsed["disclaimer"] = MEDICINE_DISCLAIMER
                return Response(parsed)
            except Exception as e:
                logger.warning("Medicine analysis JSON parsing failed: %s", e)

        fallback = evaluate_medicine_fallback(combined, recent_food)
        return Response(fallback)


# ============================================================================
# 5. SYMPTOM GUIDE & DOCTOR PREPARATION ASSISTANT (SAFE CLINICAL TRIAGE)
# ============================================================================

class SymptomGuideView(APIView):
    """
    Assists users in understanding symptoms, preparing questions for their physician consultation,
    identifying red flag emergency symptoms, and safe hydration/comfort measures.
    Zero automated diagnosis to comply with medical regulatory standards.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        symptoms_text = (request.data.get("symptoms_text") or "").strip()
        duration_days = request.data.get("duration_days") or "1-2"
        age = request.data.get("age") or None

        if not symptoms_text:
            return Response(
                {"error": "Please describe your symptoms to receive doctor preparation insights."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        prompt = (
            "You are a clinical triage educator and physician visit preparation assistant. "
            "A patient is describing their symptoms to prepare for an appointment with their doctor.\n"
            "CRITICAL: Do NOT definitively diagnose disease or prescribe specific pharmaceuticals. "
            "Focus on triage risk tier, structured questions the patient should ask their doctor, "
            "safe home comfort measures (hydration, rest), and emergency red flags.\n\n"
            f"Symptoms: {symptoms_text}\n"
            f"Duration: {duration_days} days\n"
            f"Age: {age or 'Adult'}\n\n"
            "Return ONLY valid JSON matching this exact structure:\n"
            "{\n"
            '  "triage_level": "Mild (Self-Monitor)" | "Moderate (Schedule Clinic Visit)" | "Urgent (See Doctor Today)" | "Emergency (Seek Immediate Hospital Care)",\n'
            '  "overview": "string providing educational physiological context",\n'
            '  "questions_for_doctor": [\n'
            '    "string question 1",\n'
            '    "string question 2",\n'
            '    "string question 3"\n'
            '  ],\n'
            '  "home_comfort_measures": [\n'
            '    "string (e.g. Oral rehydration with electrolytes, steam inhalation)",\n'
            '    "string"\n'
            '  ],\n'
            '  "red_flag_warnings": [\n'
            '    "string emergency warning sign (e.g. shortness of breath, chest pain, fever > 103 F)"\n'
            '  ]\n'
            "}"
        )

        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": 0.2, "maxOutputTokens": 1024},
        }

        raw_text, error_reason = call_gemini(payload, timeout=20)
        if raw_text:
            try:
                clean_json_str = re.sub(r"^```json\s*", "", raw_text.strip(), flags=re.MULTILINE)
                clean_json_str = re.sub(r"^```\s*", "", clean_json_str, flags=re.MULTILINE)
                clean_json_str = re.sub(r"```$", "", clean_json_str.strip())
                parsed = json.loads(clean_json_str)
                parsed["data_source"] = GEMINI_TEXT_SOURCE
                parsed["disclaimer"] = SYMPTOM_DISCLAIMER
                return Response(parsed)
            except Exception as e:
                logger.warning("Symptom guide JSON parsing failed: %s", e)

        # High-quality deterministic fallback
        is_fever_respiratory = any(k in symptoms_text.lower() for k in ["fever", "cough", "cold", "throat"])
        is_digestive = any(k in symptoms_text.lower() for k in ["stomach", "vomit", "nausea", "diarrhea", "acidity"])

        if is_fever_respiratory:
            triage_level = "Moderate (Schedule Clinic Visit)"
            overview = "Symptoms reflect upper respiratory tract involvement or common viral etiology."
            questions = [
                "Could this be viral versus bacterial requiring targeted therapy?",
                "What fever thresholds warrant immediate in-person reassessment?",
                "Are there specific over-the-counter nasal or throat rinses you recommend?",
            ]
            home_care = [
                "Stay well-hydrated with warm water, herbal soups, and electrolytes.",
                "Steam inhalation for 5-10 minutes twice daily to relieve mucosal congestion.",
                "Prioritize 8+ hours of restful sleep to assist immunological recovery.",
            ]
        elif is_digestive:
            triage_level = "Moderate (Schedule Clinic Visit)"
            overview = "Symptoms suggest gastrointestinal irritation, acid reflux, or acute gastroenteritis."
            questions = [
                "Is this related to food sensitivity, gastritis, or an acute gastrointestinal infection?",
                "Should I temporarily follow a bland BRAT diet (bananas, rice, applesauce, toast)?",
                "Are antacids or oral rehydration salts indicated for my case?",
            ]
            home_care = [
                "Sip oral rehydration salts (ORS) or coconut water slowly to prevent dehydration.",
                "Avoid oily, spicy, acidic, and caffeinated foods for 48 hours.",
                "Eat small, easily digestible meals (khichdi, curd rice).",
            ]
        else:
            triage_level = "Mild to Moderate (Schedule Clinic Visit)"
            overview = "General symptomatic presentation. Clinical evaluation helps clarify etiology."
            questions = [
                "What diagnostic tests (CBC, metabolic panel) would help clarify this?",
                "Are my current daily supplements or foods influencing these symptoms?",
            ]
            home_care = [
                "Maintain consistent hydration and note symptom frequency in a log.",
                "Avoid strenuous physical exertion until cleared by your doctor.",
            ]

        red_flags = [
            "High fever exceeding 103°F (39.4°C) unresponsive to standard antipyretics",
            "Shortness of breath, wheezing, or chest tightness",
            "Persistent vomiting preventing fluid retention for over 12 hours",
            "Severe localized abdominal pain or blood in stool/vomit",
        ]

        return Response({
            "triage_level": triage_level,
            "overview": overview,
            "questions_for_doctor": questions,
            "home_comfort_measures": home_care,
            "red_flag_warnings": red_flags,
            "data_source": SYMPTOM_BASELINE_SOURCE,
            "disclaimer": SYMPTOM_DISCLAIMER,
        })
