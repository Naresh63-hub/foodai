from typing import Optional


PROCESSING_ADJECTIVES = {
    'minimally_processed': 'Minimally processed',
    'processed': 'Processed',
    'highly_processed': 'Highly processed',
    'ultra_processed': 'Ultra-processed',
}


PRIMARY_CATEGORY_HINTS = [
    (
        {'sugar', 'refined_carb', 'oil'},
        'sweet biscuit',
    ),
    (
        {'sugar', 'refined_carb', 'fat'},
        'sweet biscuit',
    ),
    (
        {'oil', 'refined_carb', 'salt_sodium'},
        'savoury snack',
    ),
    (
        {'refined_carb', 'sugar'},
        'sweet bakery product',
    ),
    (
        {'protein_source', 'fiber_source'},
        'nutrition bar',
    ),
    (
        {'protein_source'},
        'dairy or protein product',
    ),
    (
        {'sugar'},
        'confectionery',
    ),
    (
        {'whole_food'},
        'whole food product',
    ),
]


def _derive_primary_category(ingredients_categories: list) -> str:
    category_set = set(ingredients_categories)
    for required_cats, label in PRIMARY_CATEGORY_HINTS:
        if required_cats.issubset(category_set):
            return label
    return 'food product'


def generate_verdict(
    processing_level: str,
    categories_tags: list,
    ingredients_categories: list,
) -> str:
    adjective = PROCESSING_ADJECTIVES.get(processing_level, 'Processed')

    primary_category = None
    meaningful_tags = [
        t for t in categories_tags
        if isinstance(t, str) and len(t.strip()) > 0 and t.strip().lower() not in ('en:', 'fr:', 'de:')
    ]
    if meaningful_tags:
        first_tag = meaningful_tags[0].strip().lower()
        if first_tag.startswith('en:'):
            first_tag = first_tag[3:]
        first_tag = first_tag.replace('-', ' ').replace('_', ' ')
        if first_tag:
            primary_category = first_tag

    if primary_category is None:
        primary_category = _derive_primary_category(ingredients_categories)

    return f"{adjective} {primary_category}"


def adi_reference_exposure(
    adi_mg_per_kg: Optional[float],
    body_weight_kg: Optional[float],
) -> Optional[float]:
    if adi_mg_per_kg is None or body_weight_kg is None:
        return None
    return adi_mg_per_kg * body_weight_kg
