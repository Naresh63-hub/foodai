import pytest

from foodai_backend.food_analysis.classifier import (
    INGREDIENT_CATEGORIES,
    classify_ingredient,
    parse_ingredients_text,
)


def test_TR_3_2_parse_ingredients_five_categories_ordered():
    text = "Sugar, Palm Oil, Wheat Flour, E322 (Lecithin), Sodium Benzoate"
    result = parse_ingredients_text(text)

    assert isinstance(result, list)
    assert len(result) == 5

    categories = [item['category'] for item in result]
    names = [item['name'] for item in result]

    assert categories == ['sugar', 'oil', 'refined_carb', 'additive', 'preservative']
    assert names[0] == 'Sugar'
    assert names[1] == 'Palm Oil'
    assert names[2] == 'Wheat Flour'


def test_ingredient_categories_has_twelve_entries():
    assert len(INGREDIENT_CATEGORIES) == 12
    assert 'sugar' in INGREDIENT_CATEGORIES
    assert 'oil' in INGREDIENT_CATEGORIES
    assert 'additive' in INGREDIENT_CATEGORIES
    assert 'other' in INGREDIENT_CATEGORIES


def test_classify_ingredient_sugar_keywords():
    assert classify_ingredient('Sucrose') == 'sugar'
    assert classify_ingredient('High Fructose Corn Syrup') == 'sugar'
    assert classify_ingredient('Honey') == 'sugar'


def test_classify_ingredient_ecode_detected_as_additive():
    assert classify_ingredient('E100') == 'additive'
    assert classify_ingredient('e950') == 'additive'


def test_classify_ingredient_preservative_keywords():
    assert classify_ingredient('Sodium Benzoate') == 'preservative'
    assert classify_ingredient('Potassium Sorbate') == 'preservative'


def test_classify_ingredient_unknown_returns_other():
    assert classify_ingredient('XYZRandomIngredient123') == 'other'


def test_parse_ingredients_handles_semicolons_and_parens():
    text = "Milk; Whey Protein (Concentrate); Salt"
    result = parse_ingredients_text(text)
    categories = [item['category'] for item in result]
    assert 'protein_source' in categories
    assert 'salt_sodium' in categories


def test_parse_ingredients_empty_and_short_tokens_dropped():
    text = ", , Sugar, , A, Palm Oil"
    result = parse_ingredients_text(text)
    assert len(result) == 2
