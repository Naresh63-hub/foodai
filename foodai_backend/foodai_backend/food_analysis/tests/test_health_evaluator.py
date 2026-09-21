import pytest
from foodai_backend.food_analysis.health_evaluator import (
    evaluate_health_conditions,
    generate_healthier_swaps,
    CONDITION_META,
)
from foodai_backend.food_analysis.serializers import analyze_product
from foodai_backend.food_analysis.models import Product


def test_condition_metadata():
    assert "diabetes" in CONDITION_META
    assert "hypertension" in CONDITION_META
    assert "heart_disease" in CONDITION_META
    assert "child_mode" in CONDITION_META
    assert "celiac" in CONDITION_META
    assert "lactose" in CONDITION_META


def test_diabetes_warning_high_sugar():
    nutrition = {
        "per_100g": {"sugars_g": 28.5, "salt_g": 0.5, "fat_g": 12.0},
        "per_serving": {"sugars_g": 10.0},
    }
    warnings = evaluate_health_conditions(
        product_name="Sweet Biscuit",
        ingredients_text="Refined Wheat Flour, Sugar, Palm Oil, Invert Sugar Syrup.",
        nutrition=nutrition,
        processing_level="ultra_processed",
        user_health_conditions=["diabetes"],
    )
    assert len(warnings) >= 1
    diab_warn = next(w for w in warnings if w["condition"] == "diabetes")
    assert diab_warn["severity"] == "danger"
    assert "sugar" in diab_warn["message"].lower()


def test_hypertension_warning_high_salt_and_msg():
    nutrition = {
        "per_100g": {"sugars_g": 2.0, "salt_g": 1.8, "fat_g": 15.0},
        "per_serving": {"sugars_g": 1.0, "salt_g": 0.9},
    }
    warnings = evaluate_health_conditions(
        product_name="Spicy Snack",
        ingredients_text="Potato, Palm Oil, Salt, Flavour Enhancer (INS 621 MSG).",
        nutrition=nutrition,
        processing_level="ultra_processed",
        user_health_conditions=["hypertension"],
    )
    assert len(warnings) >= 1
    hyp_warn = next(w for w in warnings if w["condition"] == "hypertension")
    assert hyp_warn["severity"] == "danger"
    assert "sodium" in hyp_warn["message"].lower() or "salt" in hyp_warn["message"].lower()


def test_child_mode_azo_dyes_and_auto_activation():
    nutrition = {
        "per_100g": {"sugars_g": 22.0, "salt_g": 0.2, "fat_g": 5.0},
        "per_serving": {"sugars_g": 5.5},
    }
    # Auto activates if user_age < 12
    warnings = evaluate_health_conditions(
        product_name="Rainbow Candy",
        ingredients_text="Sugar, Glucose, Tartrazine (INS 102), Sunset Yellow (INS 110).",
        nutrition=nutrition,
        processing_level="ultra_processed",
        user_health_conditions=[],
        user_age=8,
    )
    assert len(warnings) >= 1
    child_warn = next(w for w in warnings if w["condition"] == "child_mode")
    assert child_warn["severity"] == "danger"
    assert "Tartrazine" in child_warn["message"]


def test_celiac_and_lactose_allergen_warnings():
    nutrition = {
        "per_100g": {"sugars_g": 15.0, "salt_g": 0.3, "fat_g": 8.0},
    }
    warnings = evaluate_health_conditions(
        product_name="Wheat & Cream Biscuit",
        ingredients_text="Refined Wheat Flour (Maida), Milk Solids, Whey, Butter.",
        nutrition=nutrition,
        processing_level="processed",
        user_health_conditions=["celiac", "lactose"],
    )
    conditions = [w["condition"] for w in warnings]
    assert "celiac" in conditions
    assert "lactose" in conditions


def test_healthier_swaps_generation():
    swaps = generate_healthier_swaps(
        product_name="Britannia Tiger Biscuit",
        categories_tags=["en:biscuits"],
        ingredients_text="Wheat Flour, Sugar, Palm Oil",
        processing_level="ultra_processed",
        nutrition={"per_100g": {"sugars_g": 26.5}},
    )
    assert len(swaps) >= 2
    assert any("Almonds" in s["name"] or "Makhana" in s["name"] or "Oats" in s["name"] for s in swaps)


@pytest.mark.django_db
def test_analyze_product_includes_warnings_and_swaps():
    prod = Product(
        product_name="Test Sweet Biscuit",
        ingredients_text="Refined Wheat Flour, Sugar, Palm Oil, Milk Solids.",
        nutriments={"sugars_100g": 26.0, "salt_100g": 0.7, "fat_100g": 14.0},
        categories_tags=["en:biscuits"],
    )
    result = analyze_product(
        prod,
        user_age=10,
        user_weight_kg=35.0,
        user_health_conditions=["diabetes", "celiac"],
    )
    assert "health_warnings" in result
    assert "healthier_swaps" in result
    assert "fopnl_warnings" in result
    assert "damage_control" in result
    assert len(result["health_warnings"]) >= 2
    assert len(result["healthier_swaps"]) >= 2
    assert len(result["fopnl_warnings"]) >= 1
    assert result["fopnl_warnings"][0]["type"] == "HIGH_SUGAR"
    assert len(result["damage_control"]["mitigation_steps"]) >= 1


def test_fssai_fopnl_high_sugar_salt_and_fat():
    from foodai_backend.food_analysis.health_evaluator import evaluate_fssai_fopnl
    nutrition = {
        "per_100g": {"sugars_g": 28.0, "salt_g": 1.5, "fat_g": 22.0},
    }
    flags = evaluate_fssai_fopnl(nutrition, ingredients_text="Palm oil, Sugar, Salt")
    types = [f["type"] for f in flags]
    assert "HIGH_SUGAR" in types
    assert "HIGH_SALT" in types
    assert "HIGH_FAT" in types


def test_damage_control_advice_generator():
    from foodai_backend.food_analysis.health_evaluator import generate_damage_control_advice
    nutrition = {
        "per_100g": {"sugars_g": 25.0, "salt_g": 1.2},
    }
    advice = generate_damage_control_advice(
        product_name="Crispy Biscuit",
        nutrition=nutrition,
        processing_level="ultra_processed",
    )
    assert "headline" in advice
    assert len(advice["mitigation_steps"]) >= 2
    assert any("Nuts" in s["action"] or "Walk" in s["action"] for s in advice["mitigation_steps"])