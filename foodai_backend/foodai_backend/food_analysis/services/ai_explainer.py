from typing import Dict, Any, Optional

from foodai_backend.food_analysis import thresholds as T


class AIExplainerService:
    """Deterministic 'What Should I Know?' synthesiser.

    Turns already-computed nutrition/additive facts into plain-language prose using
    fixed thresholds. It never calls an LLM and never invents numbers, honouring the
    project's deterministic-core / no-fabrication rule (spec AC-10).
    """

    def generate_summary(
        self,
        product_name: str,
        verdict: str,
        processing_level: str,
        nutrition: Dict[str, Any],
        ingredients: list,
        additives_count: int,
        user_age: Optional[int] = None,
        user_weight_kg: Optional[float] = None,
    ) -> Dict[str, Any]:
        """
        Generates the structured 'What Should I Know?' summary and age-based guidance.
        Purely deterministic synthesis from verified numbers; no external model is
        involved, so nutrition values and regulatory references cannot drift or hallucinate.

        `user_weight_kg` is accepted for API compatibility and reserved for future
        weight-scaled personalisation; it is intentionally not used to invent figures now.
        """
        per_100g = nutrition.get("per_100g", {})
        sugars_g = per_100g.get("sugars_g")
        salt_g = per_100g.get("salt_g")
        fat_g = per_100g.get("fat_g")
        fiber_g = per_100g.get("fiber_g")
        protein_g = per_100g.get("proteins_g")

        # 1. Main ingredient summary
        main_ingredients = [ing.get("name") for ing in ingredients[:4]] if ingredients else []
        main_ing_str = ", ".join(main_ingredients) if main_ingredients else "standard food ingredients"

        summary_parts = []
        if ingredients:
            summary_parts.append(f"This product is primarily formulated from {main_ing_str.lower()}.")
        
        # High/moderate/low nutrient highlights
        key_highlights = []
        if sugars_g is not None:
            if sugars_g > T.DESC_SUGAR_VERY_HIGH:
                key_highlights.append(f"High sugar content ({sugars_g:.1f}% by weight)")
            elif sugars_g > T.DESC_SUGAR_MODERATE:
                key_highlights.append(f"Moderate sugar ({sugars_g:.1f}% by weight)")
            else:
                key_highlights.append(f"Low sugar ({sugars_g:.1f}g / 100g)")

        if salt_g is not None:
            if salt_g > T.DESC_SALT_HIGH:
                key_highlights.append(f"High sodium/salt ({salt_g:.1f}g / 100g)")
            elif salt_g > T.DESC_SALT_MODERATE:
                key_highlights.append(f"Moderate salt ({salt_g:.1f}g / 100g)")

        if fat_g is not None and fat_g > T.DESC_FAT_HIGH:
            key_highlights.append(f"High fat density ({fat_g:.1f}% by weight)")

        if fiber_g is not None and fiber_g >= T.DESC_FIBER_GOOD:
            key_highlights.append(f"Good source of dietary fiber ({fiber_g:.1f}g / 100g)")

        if protein_g is not None and protein_g >= T.DESC_PROTEIN_HIGH:
            key_highlights.append(f"High protein source ({protein_g:.1f}g / 100g)")

        # Additives statement
        if additives_count > 0:
            summary_parts.append(
                f"It contains {additives_count} detected functional additives/preservatives. "
                "The exact quantities of individual additives are not disclosed on the manufacturer label."
            )
        else:
            summary_parts.append("No common synthetic additives or chemical preservatives were detected.")

        what_should_i_know = " ".join(summary_parts)

        # 2. Age-specific advice
        age_insights = []
        if user_age is not None:
            if user_age < 12:
                age_insights.append("For Children: WHO recommends limiting free sugars to <10% (ideally <5%) of total daily energy. Portion control is advised.")
                if additives_count > 2:
                    age_insights.append("Growing children are more sensitive to artificial colours and high sodium concentrations.")
            elif user_age < 18:
                age_insights.append("For Teenagers: Balanced consumption is recommended to support active growth; pair with whole foods and hydration.")
            else:
                age_insights.append("For Adults: Daily intake should align with overall caloric and cardiovascular health goals.")
        else:
            age_insights.append("General Guidance: For children, limit high-sugar and high-sodium ultra-processed snacks. For adults, balance with whole fiber-rich foods.")

        # 3. Scientific distinction
        scientific_note = (
            "Safety limits (ADI in mg/kg body weight/day) are regulatory thresholds — intake at or "
            "below them over a lifetime is considered to pose no appreciable health risk, "
            "while dietary guidelines still recommend moderation for balanced long-term metabolic health. "
            "Chemical names denote standard food-grade compounds evaluated by FSSAI & WHO/JECFA."
        )

        return {
            "summary": what_should_i_know,
            "key_highlights": key_highlights,
            "age_insights": age_insights,
            "scientific_note": scientific_note,
            "disclaimer": "This analysis is for nutritional awareness and educational purposes only. It does not provide medical diagnosis or treatment advice.",
        }


_default_explainer = AIExplainerService()

def get_ai_explainer() -> AIExplainerService:
    return _default_explainer
