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
# 1. PERSONAL CARE & COSMETICS EVALUATOR (CREAMS, SOAPS, SHAMPOOS, LOTIONS)
# ============================================================================

def evaluate_care_product_fallback(
    query: str,
    ingredients_text: str = "",
    skin_type: str = "all",
) -> dict:
    """Deterministic, clinical rule-based evaluator for skincare, soaps, and cosmetics."""
    full_text = f"{query} {ingredients_text}".lower()

    # Default clean baseline
    clean_score = 82
    hazard_level = "Clean / Low Risk"
    product_category = "Skincare & Personal Care"
    comedogenic_rating = 1  # 0 to 5

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

    harmful_ingredients = []
    beneficial_ingredients = []

    # Check for Harsh Surfactants (SLS / SLES)
    if any(k in full_text for k in ["sodium lauryl sulfate", "sodium laureth sulfate", "sls", "sles"]):
        clean_score -= 18
        harmful_ingredients.append({
            "name": "Sodium Lauryl/Laureth Sulfate (SLS/SLES)",
            "hazard_severity": "Moderate",
            "category": "Harsh Surfactant",
            "concern": "Can strip natural epidermal lipid barrier, leading to transepidermal water loss and irritation.",
        })

    # Check for Parabens (Endocrine disruptors)
    if any(k in full_text for k in ["paraben", "methylparaben", "propylparaben", "butylparaben"]):
        clean_score -= 25
        harmful_ingredients.append({
            "name": "Parabens (Preservative)",
            "hazard_severity": "High",
            "category": "Endocrine Disruptor",
            "concern": "Synthetic preservative with documented estrogenic activity and hormonal disruption concerns.",
        })

    # Check for Synthetic Fragrance / Parfum
    if any(k in full_text for k in ["fragrance", "parfum", "synthetic scent"]):
        clean_score -= 10
        harmful_ingredients.append({
            "name": "Artificial Fragrance / Parfum",
            "hazard_severity": "Low-Moderate",
            "category": "Allergen & Sensitizer",
            "concern": "Common trigger for contact dermatitis, skin redness, and allergic sensitivities.",
        })

    # Check for Phthalates
    if "phthalate" in full_text or "dep" in full_text:
        clean_score -= 20
        harmful_ingredients.append({
            "name": "Phthalates",
            "hazard_severity": "High",
            "category": "Plasticizer / Endocrine Disruptor",
            "concern": "Linked to endocrine and reproductive interference; restricted in clean cosmetics.",
        })

    # Check for Silicones / Microplastics
    if any(k in full_text for k in ["dimethicone", "cyclopentasiloxane", "silicone"]):
        clean_score -= 8
        harmful_ingredients.append({
            "name": "Silicones (Dimethicone / Cyclopentasiloxane)",
            "hazard_severity": "Low",
            "category": "Occlusive / Non-Biodegradable",
            "concern": "Creates a temporary synthetic barrier on skin; can trap sebum in acne-prone skin.",
        })

    # Comedogenic Pore Clogging
    if any(k in full_text for k in ["coconut oil", "isopropyl myristate", "wheat germ oil"]):
        comedogenic_rating = 4
    elif any(k in full_text for k in ["shea butter", "mineral oil", "petrolatum"]):
        comedogenic_rating = 2
    else:
        comedogenic_rating = 1

    # Beneficial Ingredients
    if any(k in full_text for k in ["hyaluronic acid", "sodium hyaluronate"]):
        beneficial_ingredients.append({
            "name": "Hyaluronic Acid",
            "benefit": "Powerful humectant capable of holding 1,000x its weight in water, plumping skin cells.",
        })
    if any(k in full_text for k in ["niacinamide", "vitamin b3"]):
        beneficial_ingredients.append({
            "name": "Niacinamide (Vitamin B3)",
            "benefit": "Strengthens ceramide lipid barrier, calms inflammation, and regulates sebum production.",
        })
    if any(k in full_text for k in ["ceramide", "ceramides"]):
        beneficial_ingredients.append({
            "name": "Ceramides",
            "benefit": "Bio-identical lipids that rebuild damaged skin barriers and lock in hydration.",
        })
    if any(k in full_text for k in ["aloe", "aloe vera"]):
        beneficial_ingredients.append({
            "name": "Aloe Vera Extract",
            "benefit": "Soothing phytocompounds that relieve erythema and hydrate sensitive skin.",
        })
    if any(k in full_text for k in ["glycerin", "glycerol"]):
        beneficial_ingredients.append({
            "name": "Glycerin",
            "benefit": "Gold-standard gentle humectant that restores natural hydration without clogging pores.",
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

    return {
        "product_name": query.title() if query else "Personal Care Product",
        "product_category": product_category,
        "clean_score": clean_score,
        "hazard_level": hazard_level,
        "comedogenic_rating": comedogenic_rating,
        "harmful_ingredients": harmful_ingredients,
        "beneficial_ingredients": beneficial_ingredients,
        "skin_compatibility": skin_compatibility,
        "clean_swaps": clean_swaps,
        "data_source": CARE_BASELINE_SOURCE,
        "disclaimer": CARE_DISCLAIMER,
    }


class CareProductAnalyzeView(APIView):
    """
    Evaluates personal care products, creams, soaps, lotions, shampoos, and cosmetics.
    Identifies clean score, endocrine disruptors, parabens, sulfates, comedogenic ratings,
    and toxin-free clean swaps.
    """
    permission_classes = [AllowAny]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def post(self, request):
        product_name = (request.data.get("product_name") or "").strip()
        ingredients_text = (request.data.get("ingredients_text") or "").strip()
        skin_type = (request.data.get("skin_type") or "all").strip().lower()
        image_base64 = (request.data.get("image_base64") or "").strip()

        combined_query = f"{product_name} {ingredients_text}".strip()
        if not combined_query and not image_base64:
            return Response(
                {"error": "Please provide a product name, ingredients text, or label photo."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        prompt = (
            "You are a clinical cosmetic chemist and dermatologist. Analyze this personal care / cosmetic product "
            "(soap, cream, lotion, shampoo, serum, or sunscreen). Evaluate its safety, ingredients, and toxicity.\n"
            f"Product: {product_name or 'Unspecified'}\n"
            f"Ingredients Text: {ingredients_text or 'Infer from label photo or product name'}\n"
            f"Target Skin Type: {skin_type}\n\n"
            "Return ONLY valid JSON matching this exact structure:\n"
            "{\n"
            '  "product_name": "string",\n'
            '  "product_category": "string (e.g. Bathing Soap, Moisturizing Cream, Hair Shampoo)",\n'
            '  "clean_score": integer (0 to 100, where 100 is completely non-toxic and natural),\n'
            '  "hazard_level": "Clean / Low Hazard" | "Moderate / Caution" | "High Hazard / Contains Toxins",\n'
            '  "comedogenic_rating": integer (0 to 5 pore-clogging scale),\n'
            '  "harmful_ingredients": [\n'
            '    {\n'
            '      "name": "string (e.g. Propylparaben)",\n'
            '      "hazard_severity": "Low" | "Moderate" | "High",\n'
            '      "category": "string (e.g. Endocrine Disruptor, Harsh Surfactant)",\n'
            '      "concern": "string explaining biological impact"\n'
            '    }\n'
            "  ],\n"
            '  "beneficial_ingredients": [\n'
            '    {\n'
            '      "name": "string (e.g. Niacinamide)",\n'
            '      "benefit": "string explaining dermal benefits"\n'
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
            "generationConfig": {"temperature": 0.1, "maxOutputTokens": 1024},
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
# 2. MEDICINE & SYRUP INFORMATION WITH FOOD-DRUG INTERACTIONS
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
                "food_or_beverage": "Alcohol",
                "severity": "Dangerous / Avoid",
                "interaction": "Concurrent alcohol consumption significantly accelerates hepatotoxicity and liver strain.",
            },
            {
                "food_or_beverage": "High-Pectin / High-Fiber Foods (Pears, Apples)",
                "severity": "Minor / Safe",
                "interaction": "Extremely high dietary pectin can slightly slow drug absorption without reducing overall efficacy.",
            },
        ],
        "alcohol_contraindicated": True,
        "generic_salt_name": "Paracetamol 650mg Tablets (Jan Aushadhi ~₹10/strip)",
        "common_side_effects": ["Rare allergic rash", "Nausea if taken in excess", "Hepatotoxicity in overdose"],
        "key_safety_warning": "Do not exceed 4,000 mg in 24 hours. Check other cold syrups to avoid double-dosing paracetamol.",
    },
    "dolo": {
        "active_salt": "Paracetamol (Acetaminophen)",
        "strength": "650mg",
        "therapeutic_category": "Analgesic & Antipyretic",
        "common_uses": "High fever, viral body aches, toothache, and muscular pains.",
        "meal_timing": "Take with water. Taking with or after light food is gentler on sensitive stomachs.",
        "food_drug_interactions": [
            {
                "food_or_beverage": "Alcoholic Beverages",
                "severity": "Dangerous / Strictly Avoid",
                "interaction": "Depletes hepatic glutathione stores, elevating risk of paracetamol-induced liver injury.",
            },
        ],
        "alcohol_contraindicated": True,
        "generic_salt_name": "Paracetamol 650mg IP (Pradhan Mantri Jan Aushadhi generic equivalent)",
        "common_side_effects": ["Drowsiness if combined with antihistamines", "Mild nausea"],
        "key_safety_warning": "Maintain at least 4 to 6 hours between successive doses. Consult physician if fever persists > 3 days.",
    },
    "pantoprazole": {
        "active_salt": "Pantoprazole Sodium Gastro-resistant",
        "strength": "40mg",
        "therapeutic_category": "Proton Pump Inhibitor (PPI / Gastric Acid Reducer)",
        "common_uses": "Gastroesophageal reflux disease (GERD), heartburn, peptic ulcers, and NSAID-induced gastritis prevention.",
        "meal_timing": "Strictly 30 to 60 minutes BEFORE breakfast on an empty stomach with a glass of water.",
        "food_drug_interactions": [
            {
                "food_or_beverage": "Caffeine, Citrus & Fried/Spicy Meals",
                "severity": "Moderate / Avoid",
                "interaction": "Directly triggers acid oversecretion, counteracting the healing purpose of the antacid.",
            },
        ],
        "alcohol_contraindicated": True,
        "generic_salt_name": "Pantoprazole 40mg Gastro-resistant Tablets",
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
        "generic_salt_name": "Cetirizine 10mg Tablets",
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
                "food_or_beverage": "High-Calcium Milk & Dairy (if taking with Tetracyclines/Fluoroquinolones)",
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
        "generic_salt_name": "Amoxicillin and Potassium Clavulanate 625mg Tablets",
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
        "generic_salt_name": "Atorvastatin 10mg / 20mg Tablets",
        "common_side_effects": ["Muscle soreness (myalgia)", "Joint pain", "Mild digestive disturbance"],
        "key_safety_warning": "Report unexplained muscle pain, tenderness, or dark brown urine immediately to your physician.",
    },
}


def evaluate_medicine_fallback(query: str, recent_food: str = "") -> dict:
    """Clinical rule-based pharmaceutical evaluator with food-drug interaction check."""
    q = (query or "").lower().strip()
    match = None

    for key, data in MEDICINE_KNOWLEDGE_BASE.items():
        if key in q:
            match = data
            break

    if not match:
        # Generic safe clinical synthesis
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

    return {
        "medicine_name": query.title() if query else "Prescribed Medicine",
        **match,
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
        medicine_name = (request.data.get("medicine_name") or "").strip()
        label_text = (request.data.get("label_text") or "").strip()
        recent_food = (request.data.get("recent_food") or "").strip()
        image_base64 = (request.data.get("image_base64") or "").strip()

        combined = f"{medicine_name} {label_text}".strip()
        if not combined and not image_base64:
            return Response(
                {"error": "Please provide a medicine name, blister strip text, or label photo."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        prompt = (
            "You are a clinical pharmacologist and healthcare educator. Analyze this pharmaceutical medication "
            "(tablet, capsule, syrup, or drops). Provide active salt details, meal timing instructions, "
            "food-drug interactions, and generic Jan Aushadhi alternatives.\n"
            f"Medicine Input: {medicine_name or 'Unspecified'}\n"
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
            '  "food_drug_interactions": [\n'
            '    {\n'
            '      "food_or_beverage": "string (e.g. Alcohol, Grapefruit Juice, Dairy/Calcium)",\n'
            '      "severity": "Minor" | "Moderate" | "Severe / Dangerous",\n'
            '      "interaction": "string explaining biochemical conflict"\n'
            '    }\n'
            "  ],\n"
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
            "generationConfig": {"temperature": 0.1, "maxOutputTokens": 1024},
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
# 3. SYMPTOM GUIDE & DOCTOR PREPARATION ASSISTANT (SAFE CLINICAL TRIAGE)
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
