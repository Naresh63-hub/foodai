import re
from typing import Optional, List
from rest_framework import serializers

from foodai_backend.food_analysis.classifier import parse_ingredients_text
from foodai_backend.food_analysis.models import AdditiveReference, Product
from foodai_backend.food_analysis.nutrition import compute_nutrition
from foodai_backend.food_analysis.processing import classify_processing_level
from foodai_backend.food_analysis.services.ai_explainer import get_ai_explainer
from foodai_backend.food_analysis.verdict import PROCESSING_ADJECTIVES, adi_reference_exposure, generate_verdict
from foodai_backend.food_analysis.health_evaluator import (
    evaluate_health_conditions,
    generate_healthier_swaps,
    evaluate_fssai_fopnl,
    generate_damage_control_advice,
)


CATEGORY_DEFAULT_PURPOSES = {
    'sugar': 'Sweetener providing quick carbohydrate energy, sweetness, and browning.',
    'oil': 'Lipid source providing texture, mouthfeel, moisture, and shelf stability.',
    'refined_carb': 'Refined cereal flour/starch serving as structural base and bulk energy.',
    'whole_food': 'Minimally processed whole food providing dietary fiber, micronutrients, and satiety.',
    'additive': 'Functional food additive used for emulsification, stabilization, or texture control.',
    'preservative': 'Preservative inhibiting microbial spoilage and extending shelf-life.',
    'colour': 'Coloring agent enhancing visual appearance and color uniformity.',
    'flavour_enhancer': 'Flavor enhancer boosting savory taste profile and umami perception.',
    'salt_sodium': 'Essential seasoning enhancing flavor balance and providing sodium electrolyte.',
    'protein_source': 'Nutrient source providing essential amino acids for tissue maintenance.',
    'fiber_source': 'Dietary fiber contributing to digestive wellness and satiety.',
    'other': 'Food ingredient contributing to flavor, structure, or product formulation.',
}

CATEGORY_DEFAULT_CONCERNS = {
    'sugar': 'Excess free sugar consumption is linked to elevated dental caries, insulin resistance, and weight gain.',
    'oil': 'High intake of refined vegetable fats may increase calorie density and saturated fat exposure.',
    'refined_carb': 'Refined starches digest rapidly with a high glycemic response; lacks natural grain fiber.',
    'whole_food': 'Nutrient-dense; generally recommended in daily dietary patterns.',
    'additive': 'Safe within standard regulatory thresholds (ADI); excessive cumulative intake should be monitored.',
    'preservative': 'Regulated by FSSAI and WHO/JECFA; some individuals may experience sensitivity.',
    'colour': 'Certain artificial food colours require dosage compliance under regulatory food safety codes.',
    'flavour_enhancer': 'Safe at standard culinary levels; excessive consumption may induce temporary sensitivity in susceptible individuals.',
    'salt_sodium': 'Excess dietary sodium is associated with elevated blood pressure and cardiovascular risk.',
    'protein_source': 'Nutrient-dense; check for relevant allergen declarations (milk, soy, gluten).',
    'fiber_source': 'Nutrient-positive; gradual dietary increase with adequate fluid intake recommended.',
    'other': 'No specific toxicity when consumed within standard dietary guidelines.',
}


class BarcodeScanRequestSerializer(serializers.Serializer):
    barcode = serializers.CharField(max_length=64, required=True, allow_null=False)


class ProcessingLabelSerializer(serializers.Serializer):
    key = serializers.CharField()
    label = serializers.CharField()


class _Per100gSerializer(serializers.Serializer):
    sugars_g = serializers.FloatField(allow_null=True)
    salt_g = serializers.FloatField(allow_null=True)
    fat_g = serializers.FloatField(allow_null=True)
    proteins_g = serializers.FloatField(allow_null=True)
    fiber_g = serializers.FloatField(allow_null=True)


class _PerServingSerializer(serializers.Serializer):
    sugars_g = serializers.FloatField(allow_null=True)
    salt_g = serializers.FloatField(allow_null=True)
    fat_g = serializers.FloatField(allow_null=True)
    proteins_g = serializers.FloatField(allow_null=True)
    fiber_g = serializers.FloatField(allow_null=True)


class _PctByWeightSerializer(serializers.Serializer):
    sugars_pct = serializers.FloatField(allow_null=True)
    salt_pct = serializers.FloatField(allow_null=True)
    fat_pct = serializers.FloatField(allow_null=True)
    proteins_pct = serializers.FloatField(allow_null=True)
    fiber_pct = serializers.FloatField(allow_null=True)


class NutritionBreakdownSerializer(serializers.Serializer):
    per_100g = _Per100gSerializer()
    per_serving = _PerServingSerializer()
    pct_by_weight = _PctByWeightSerializer()


class IngredientAnalysisSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    name = serializers.CharField()
    category = serializers.CharField()
    amount_g = serializers.FloatField(allow_null=True)
    purpose_text = serializers.CharField(allow_blank=True)
    concern_text = serializers.CharField(allow_blank=True)
    simple_explanation = serializers.CharField(allow_blank=True, required=False)
    regulatory_refs = serializers.DictField()
    amount_display = serializers.SerializerMethodField()

    def get_amount_display(self, obj) -> str:
        amount_g = obj.get("amount_g") if isinstance(obj, dict) else getattr(obj, "amount_g", None)
        if amount_g is None:
            return "Amount not disclosed"
        return f"{amount_g:.1f} g"


class ProductSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    barcode = serializers.CharField(allow_null=True)
    product_name = serializers.CharField()
    brands = serializers.CharField(allow_blank=True)
    ingredients_text = serializers.CharField(allow_blank=True)
    serving_size = serializers.CharField(allow_blank=True)
    product_weight_g = serializers.FloatField(allow_null=True)
    source = serializers.CharField()
    categories_tags = serializers.ListField(child=serializers.CharField())
    nutrition = NutritionBreakdownSerializer(required=False)
    ingredients = IngredientAnalysisSerializer(many=True, required=False)


class SummaryInfoSerializer(serializers.Serializer):
    summary = serializers.CharField()
    key_highlights = serializers.ListField(child=serializers.CharField())
    age_insights = serializers.ListField(child=serializers.CharField())
    scientific_note = serializers.CharField()
    disclaimer = serializers.CharField()


class HealthWarningSerializer(serializers.Serializer):
    condition = serializers.CharField()
    condition_title = serializers.CharField()
    severity = serializers.CharField()
    badge = serializers.CharField()
    title = serializers.CharField()
    message = serializers.CharField()
    action = serializers.CharField()
    scientific_ref = serializers.CharField()


class HealthierSwapSerializer(serializers.Serializer):
    name = serializers.CharField()
    category = serializers.CharField()
    benefits = serializers.CharField()
    why_better = serializers.CharField()
    calories_density = serializers.CharField()
    nova_group = serializers.IntegerField()


class FOPNLWarningSerializer(serializers.Serializer):
    type = serializers.CharField()
    badge = serializers.CharField()
    icon = serializers.CharField()
    color = serializers.CharField()
    title = serializers.CharField()
    description = serializers.CharField()
    threshold_exceeded = serializers.CharField()


class DamageControlStepSerializer(serializers.Serializer):
    icon = serializers.CharField()
    action = serializers.CharField()
    rationale = serializers.CharField()


class DamageControlSerializer(serializers.Serializer):
    headline = serializers.CharField()
    portion_limit = serializers.CharField()
    mitigation_steps = DamageControlStepSerializer(many=True)


class ProductAnalysisSerializer(serializers.Serializer):
    product = ProductSerializer()
    nutrition = NutritionBreakdownSerializer()
    ingredients = IngredientAnalysisSerializer(many=True)
    processing_level = serializers.CharField()
    verdict = serializers.CharField()
    additives_count = serializers.IntegerField()
    has_unknown_amount_count = serializers.IntegerField()
    processing_level_label = ProcessingLabelSerializer()
    summary_info = SummaryInfoSerializer(required=False)
    dna_breakdown = serializers.DictField(required=False)
    health_warnings = HealthWarningSerializer(many=True, required=False)
    healthier_swaps = HealthierSwapSerializer(many=True, required=False)
    fopnl_warnings = FOPNLWarningSerializer(many=True, required=False)
    damage_control = DamageControlSerializer(required=False)


def _build_processing_label_dict(processing_level: str) -> dict:
    return {
        "key": processing_level,
        "label": PROCESSING_ADJECTIVES.get(processing_level, "Processed"),
    }


def _match_additive_reference(name: str):
    name_clean = name.strip()
    name_lower = name_clean.lower()

    # Search by E-code or INS code
    e_code_match = re.search(r'\b(e\s*\d{3,4}[a-z]?|ins\s*\d{3,4}[a-z]?)\b', name_lower)
    if e_code_match:
        code_str = e_code_match.group(1).upper().replace(' ', '')
        ref = AdditiveReference.objects.filter(code__iexact=code_str).first()
        if ref:
            return ref

    # Search by direct code or common name
    ref = AdditiveReference.objects.filter(code__iexact=name_clean).first()
    if ref:
        return ref

    ref = AdditiveReference.objects.filter(common_name__iexact=name_clean).first()
    if ref:
        return ref

    # Substring search on common names
    for additive in AdditiveReference.objects.all()[:150]:
        if additive.common_name.lower() in name_lower or name_lower in additive.common_name.lower():
            return additive

    return None


def analyze_product(
    product: Product,
    user=None,
    user_age: Optional[int] = None,
    user_weight_kg: Optional[float] = None,
    user_health_conditions: Optional[List[str]] = None,
) -> dict:
    additive_qs = AdditiveReference.objects.all()
    parsed_ingredients = parse_ingredients_text(product.ingredients_text, additive_queryset=additive_qs)

    nutrition = compute_nutrition(
        product.nutriments or {},
        product.serving_size_g,
        product.product_weight_g,
    )

    ingredients_categories = [ing["category"] for ing in parsed_ingredients]
    processing_level = classify_processing_level(nutrition["per_100g"], ingredients_categories)
    verdict = generate_verdict(processing_level, product.categories_tags or [], ingredients_categories)

    additive_like = {"additive", "preservative", "colour", "flavour_enhancer"}
    additives_count = sum(1 for cat in ingredients_categories if cat in additive_like)

    # Resolve user profile details if authenticated and not explicitly passed
    if user and hasattr(user, 'profile'):
        if user_age is None:
            user_age = user.profile.age
        if user_weight_kg is None:
            user_weight_kg = user.profile.body_weight_kg
        if user_health_conditions is None:
            user_health_conditions = user.profile.health_conditions or []

    if user_health_conditions is None:
        user_health_conditions = []

    ingredients_payload = []
    has_unknown_amount_count = 0
    category_counts = {}

    for idx, ing in enumerate(parsed_ingredients):
        ing_name = ing["name"]
        category = ing["category"]
        category_counts[category] = category_counts.get(category, 0) + 1

        amount_g = None
        if amount_g is None:
            has_unknown_amount_count += 1

        additive_ref = _match_additive_reference(ing_name)

        if additive_ref:
            purpose_text = additive_ref.notes or CATEGORY_DEFAULT_PURPOSES.get(category, "")
            concern_text = "Evaluated safe by FSSAI & JECFA within acceptable daily exposure."
            reg_refs = {
                "fssai": additive_ref.fssai_ref or "Permitted under FSSAI Food Safety Standards",
                "who_jecfa": additive_ref.who_jecfa_ref or "JECFA ADI Established",
                "adi_mg_per_kg": additive_ref.adi_mg_per_kg,
                "food_limit_mg_per_kg": additive_ref.food_limit_mg_per_kg,
            }
            if additive_ref.adi_mg_per_kg is not None and user_weight_kg:
                reg_refs["user_daily_limit_mg"] = adi_reference_exposure(additive_ref.adi_mg_per_kg, user_weight_kg)
            simple_exp = f"{additive_ref.common_name} is used in food processing for stability and consistency."
        else:
            purpose_text = CATEGORY_DEFAULT_PURPOSES.get(category, "Common food constituent.")
            concern_text = CATEGORY_DEFAULT_CONCERNS.get(category, "Non-toxic food constituent.")
            reg_refs = {
                "regulatory_status": "Standard food ingredient governed by FSSAI general standards",
                "adi_limit": "Not specified (Food component)",
            }
            simple_exp = f"{ing_name} is a standard culinary ingredient categorized as {category.replace('_', ' ')}."

        ingredients_payload.append({
            "id": idx + 1,
            "name": ing_name,
            "category": category,
            "amount_g": amount_g,
            "purpose_text": purpose_text,
            "concern_text": concern_text,
            "simple_explanation": simple_exp,
            "regulatory_refs": reg_refs,
        })

    total_ing = len(parsed_ingredients) or 1
    dna_breakdown = {
        cat: round((count / total_ing) * 100, 1)
        for cat, count in category_counts.items()
    }

    # Pre-eating Health Warnings
    health_warnings = evaluate_health_conditions(
        product_name=product.product_name,
        ingredients_text=product.ingredients_text,
        nutrition=nutrition,
        processing_level=processing_level,
        user_health_conditions=user_health_conditions,
        user_age=user_age,
    )

    # Healthier Alternative Swaps
    healthier_swaps = generate_healthier_swaps(
        product_name=product.product_name,
        categories_tags=product.categories_tags or [],
        ingredients_text=product.ingredients_text,
        processing_level=processing_level,
        nutrition=nutrition,
    )

    explainer = get_ai_explainer()
    summary_info = explainer.generate_summary(
        product_name=product.product_name,
        verdict=verdict,
        processing_level=processing_level,
        nutrition=nutrition,
        ingredients=ingredients_payload,
        additives_count=additives_count,
        user_age=user_age,
        user_weight_kg=user_weight_kg,
    )

    product_dict = {
        "id": product.id if product.pk else 0,
        "barcode": product.barcode,
        "product_name": product.product_name,
        "brands": product.brands,
        "ingredients_text": product.ingredients_text,
        "serving_size": product.serving_size,
        "product_weight_g": product.product_weight_g,
        "source": product.source,
        "categories_tags": product.categories_tags or [],
    }

    # Front-of-Pack Nutritional Warning Labels (FSSAI FOPNL)
    fopnl_warnings = evaluate_fssai_fopnl(
        nutrition=nutrition,
        ingredients_text=product.ingredients_text,
    )

    # Science-Backed Damage Control & Meal Pairing Advice
    damage_control = generate_damage_control_advice(
        product_name=product.product_name,
        nutrition=nutrition,
        processing_level=processing_level,
        health_warnings=health_warnings,
    )

    return {
        "product": product_dict,
        "nutrition": nutrition,
        "ingredients": ingredients_payload,
        "processing_level": processing_level,
        "verdict": verdict,
        "additives_count": additives_count,
        "has_unknown_amount_count": has_unknown_amount_count,
        "processing_level_label": _build_processing_label_dict(processing_level),
        "summary_info": summary_info,
        "dna_breakdown": dna_breakdown,
        "health_warnings": health_warnings,
        "healthier_swaps": healthier_swaps,
        "fopnl_warnings": fopnl_warnings,
        "damage_control": damage_control,
    }