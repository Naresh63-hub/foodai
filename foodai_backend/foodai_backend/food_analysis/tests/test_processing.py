import pytest

from foodai_backend.food_analysis.processing import classify_processing_level


def test_TR_3_3_a_oats_minimally_processed():
    per_100g = {'sugars_g': 1, 'fat_g': 2, 'salt_g': 0, 'proteins_g': 13, 'fiber_g': 10}
    ingredients_categories = ['whole_food']
    result = classify_processing_level(per_100g, ingredients_categories)
    assert result == 'minimally_processed'


def test_TR_3_3_b_canned_beans_processed():
    per_100g = {'sugars_g': 3, 'fat_g': 1, 'salt_g': 0.5, 'proteins_g': 7, 'fiber_g': 5}
    ingredients_categories = ['whole_food', 'salt_sodium']
    result = classify_processing_level(per_100g, ingredients_categories)
    assert result == 'processed'


def test_TR_3_3_c_sweet_biscuit_highly_processed():
    per_100g = {'sugars_g': 22, 'fat_g': 18, 'salt_g': 0.3, 'proteins_g': 5, 'fiber_g': 2}
    ingredients_categories = [
        'sugar',
        'refined_carb',
        'oil',
        'preservative',
        'colour',
        'additive',
    ]
    result = classify_processing_level(per_100g, ingredients_categories)
    assert result == 'highly_processed'


def test_TR_3_3_d_instant_noodles_ultra_processed():
    per_100g = {'sugars_g': 5, 'fat_g': 20, 'salt_g': 1.5, 'proteins_g': 9, 'fiber_g': 3}
    ingredients_categories = [
        'oil',
        'refined_carb',
        'additive',
        'additive',
        'additive',
        'additive',
        'additive',
        'additive',
        'flavour_enhancer',
        'salt_sodium',
    ]
    result = classify_processing_level(per_100g, ingredients_categories)
    assert result == 'ultra_processed'


def test_highly_processed_via_additive_count_three():
    per_100g = {'sugars_g': 10, 'fat_g': 10, 'salt_g': 0.5, 'proteins_g': 5, 'fiber_g': 2}
    ingredients_categories = [
        'additive',
        'additive',
        'preservative',
    ]
    result = classify_processing_level(per_100g, ingredients_categories)
    assert result == 'highly_processed'


def test_ultra_processed_via_sugars_fat_additives_combo():
    per_100g = {'sugars_g': 26, 'fat_g': 16, 'salt_g': 0.2, 'proteins_g': 3, 'fiber_g': 1}
    ingredients_categories = ['sugar', 'additive', 'additive']
    result = classify_processing_level(per_100g, ingredients_categories)
    assert result == 'ultra_processed'


def test_ultra_processed_via_msg_plus_three_other_additives():
    per_100g = {'sugars_g': 5, 'fat_g': 8, 'salt_g': 0.8, 'proteins_g': 10, 'fiber_g': 2}
    ingredients_categories = [
        'flavour_enhancer',
        'additive',
        'preservative',
        'colour',
        'additive',
    ]
    result = classify_processing_level(per_100g, ingredients_categories)
    assert result == 'ultra_processed'


def test_highly_processed_via_refined_carb_oil_sugar_combo():
    per_100g = {'sugars_g': 15, 'fat_g': 12, 'salt_g': 0.3, 'proteins_g': 4, 'fiber_g': 2}
    ingredients_categories = ['sugar', 'refined_carb', 'oil']
    result = classify_processing_level(per_100g, ingredients_categories)
    assert result == 'highly_processed'
