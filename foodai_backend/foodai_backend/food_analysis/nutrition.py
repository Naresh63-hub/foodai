from typing import Optional


def _to_mg(value_g_or_mg, unit=None):
    if value_g_or_mg is None:
        return None
    if unit == 'g' or (unit is None and isinstance(value_g_or_mg, (int, float))):
        return value_g_or_mg * 1000
    return value_g_or_mg


def _extract_value(nutriments, base_key):
    for suffix in ('_100g', '_value_g', '_value', ''):
        key = base_key + suffix
        if key in nutriments and nutriments[key] is not None:
            try:
                return float(nutriments[key])
            except (TypeError, ValueError):
                return None
    return None


def compute_nutrition(
    nutriments: dict,
    serving_size_g: Optional[float],
    product_weight_g: Optional[float],
):
    per_100g = {
        'sugars_g': _extract_value(nutriments, 'sugars'),
        'salt_g': _extract_value(nutriments, 'salt'),
        'fat_g': _extract_value(nutriments, 'fat'),
        'proteins_g': _extract_value(nutriments, 'proteins'),
        'fiber_g': _extract_value(nutriments, 'fiber'),
    }

    per_serving = {}
    for key, value_100g in per_100g.items():
        if value_100g is not None and serving_size_g is not None:
            per_serving[key] = value_100g * serving_size_g / 100.0
        else:
            per_serving[key] = None

    pct_by_weight = {}
    pct_keys = {
        'sugars_pct': 'sugars_g',
        'salt_pct': 'salt_g',
        'fat_pct': 'fat_g',
        'proteins_pct': 'proteins_g',
        'fiber_pct': 'fiber_g',
    }
    for pct_key, source_key in pct_keys.items():
        value_100g = per_100g[source_key]
        if value_100g is None:
            pct_by_weight[pct_key] = None
        else:
            pct_by_weight[pct_key] = value_100g

    return {
        'per_100g': per_100g,
        'per_serving': per_serving,
        'pct_by_weight': pct_by_weight,
    }
