import pytest

from foodai_backend.food_analysis.nutrition import _to_mg, compute_nutrition


def test_TR_3_1_compute_nutrition_per_serving_and_pct():
    nutriments = {
        'sugars_100g': 25,
        'fat_100g': 5,
        'salt_100g': 2,
        'proteins_100g': 6,
        'fiber_100g': 3,
    }
    serving_size_g = 30
    product_weight_g = 100

    result = compute_nutrition(nutriments, serving_size_g, product_weight_g)

    assert result['per_serving']['sugars_g'] == 7.5
    assert result['pct_by_weight']['sugars_pct'] == 25

    assert result['per_100g']['sugars_g'] == 25
    assert result['per_100g']['fat_g'] == 5
    assert result['per_100g']['salt_g'] == 2
    assert result['per_100g']['proteins_g'] == 6
    assert result['per_100g']['fiber_g'] == 3

    assert result['per_serving']['fat_g'] == 1.5
    assert result['per_serving']['salt_g'] == 0.6
    assert result['per_serving']['proteins_g'] == 1.8
    assert result['per_serving']['fiber_g'] == 0.9


def test_TR_3_1_missing_salt_key_returns_none_not_zero():
    nutriments = {
        'sugars_100g': 25,
        'fat_100g': 5,
        'proteins_100g': 6,
        'fiber_100g': 3,
    }
    serving_size_g = 30
    product_weight_g = 100

    result = compute_nutrition(nutriments, serving_size_g, product_weight_g)

    assert result['per_100g']['salt_g'] is None
    assert result['per_serving']['salt_g'] is None
    assert result['pct_by_weight']['salt_pct'] is None


def test_to_mg_converts_grams_to_mg():
    assert _to_mg(1, 'g') == 1000
    assert _to_mg(0.5, 'g') == 500


def test_to_mg_returns_none_for_none_input():
    assert _to_mg(None) is None
    assert _to_mg(None, 'g') is None


def test_to_mg_preserves_mg_value():
    assert _to_mg(500, 'mg') == 500


def test_compute_nutrition_accepts_alternative_key_formats():
    nutriments = {
        'sugars_value_g': 25,
        'salt_value': 2,
        'fat': 5,
    }
    result = compute_nutrition(nutriments, None, None)
    assert result['per_100g']['sugars_g'] == 25
    assert result['per_100g']['salt_g'] == 2
    assert result['per_100g']['fat_g'] == 5


def test_compute_nutrition_no_serving_returns_none_per_serving():
    nutriments = {'sugars_100g': 25}
    result = compute_nutrition(nutriments, None, None)
    assert result['per_serving']['sugars_g'] is None
