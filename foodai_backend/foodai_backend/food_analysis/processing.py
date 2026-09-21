from typing import Optional


def classify_processing_level(per_100g: dict, ingredients_categories: list) -> str:
    additive_like = {'additive', 'preservative', 'colour', 'flavour_enhancer'}
    additive_count = sum(1 for c in ingredients_categories if c in additive_like)
    category_counts = {}
    for c in ingredients_categories:
        category_counts[c] = category_counts.get(c, 0) + 1

    sugars_g = per_100g.get('sugars_g') or 0
    fat_g = per_100g.get('fat_g') or 0

    has_sugar = 'sugar' in category_counts
    has_oil = 'oil' in category_counts
    has_refined_carb = 'refined_carb' in category_counts
    has_whole_food = 'whole_food' in category_counts
    has_salt_sodium = 'salt_sodium' in category_counts
    has_flavour_enhancer = 'flavour_enhancer' in category_counts

    other_additives = additive_count
    if has_flavour_enhancer:
        other_additives = max(0, additive_count - category_counts.get('flavour_enhancer', 0))

    is_ultra = False
    if additive_count >= 5:
        is_ultra = True
    elif sugars_g >= 25 and fat_g >= 15 and additive_count >= 2:
        is_ultra = True
    elif has_flavour_enhancer and other_additives >= 3:
        is_ultra = True

    if is_ultra:
        return 'ultra_processed'

    is_highly = False
    if sugars_g >= 20:
        is_highly = True
    elif 2 <= additive_count <= 4:
        is_highly = True
    elif has_refined_carb and has_oil and has_sugar:
        is_highly = True

    if is_highly:
        return 'highly_processed'

    is_processed = False
    if additive_count <= 1 and (has_salt_sodium or has_sugar):
        is_processed = True
    elif additive_count <= 1 and category_counts:
        non_whole = sum(v for k, v in category_counts.items() if k != 'whole_food')
        if non_whole > 0:
            is_processed = True

    if is_processed:
        return 'processed'

    return 'minimally_processed'
