import re
import pytest

from foodai_backend.food_analysis.verdict import (
    PROCESSING_ADJECTIVES,
    generate_verdict,
    adi_reference_exposure,
)


def test_TR_3_4_verdict_highly_processed_sweet_biscuit():
    processing_level = 'highly_processed'
    ingredients_categories = ['sugar', 'refined_carb', 'fat']
    categories_tags = []
    result = generate_verdict(processing_level, categories_tags, ingredients_categories)
    assert result == 'Highly processed sweet biscuit'


def test_TR_3_4_verdict_matches_regex_pattern():
    processing_level = 'highly_processed'
    ingredients_categories = ['sugar', 'refined_carb', 'fat']
    categories_tags = []
    result = generate_verdict(processing_level, categories_tags, ingredients_categories)
    pattern = r'^[A-Z][a-z]+(ed|y)? [a-z ]+$'
    assert re.match(pattern, result), f"'{result}' did not match pattern {pattern}"


def test_TR_3_4_adi_reference_exposure_5mg_60kg_equals_300():
    assert adi_reference_exposure(5, 60) == 300


def test_TR_3_4_adi_reference_exposure_none_adi_returns_none():
    assert adi_reference_exposure(None, 60) is None


def test_TR_3_4_adi_reference_exposure_none_weight_returns_none():
    assert adi_reference_exposure(5, None) is None


def test_processing_adjectives_has_four_levels():
    assert len(PROCESSING_ADJECTIVES) == 4
    assert PROCESSING_ADJECTIVES['minimally_processed'] == 'Minimally processed'
    assert PROCESSING_ADJECTIVES['ultra_processed'] == 'Ultra-processed'


def test_generate_verdict_uses_categories_tags_when_provided():
    processing_level = 'processed'
    ingredients_categories = ['sugar', 'refined_carb', 'fat']
    categories_tags = ['en:canned-beans', 'beans']
    result = generate_verdict(processing_level, categories_tags, ingredients_categories)
    assert result.startswith('Processed ')
    assert 'canned beans' in result.lower() or 'beans' in result.lower()


def test_generate_verdict_minimally_processed_whole_food():
    processing_level = 'minimally_processed'
    ingredients_categories = ['whole_food']
    categories_tags = []
    result = generate_verdict(processing_level, categories_tags, ingredients_categories)
    assert result == 'Minimally processed whole food product'


def test_adi_reference_exposure_both_none_returns_none():
    assert adi_reference_exposure(None, None) is None


def test_adi_reference_exposure_decimal_values():
    assert adi_reference_exposure(0.5, 70) == 35.0
