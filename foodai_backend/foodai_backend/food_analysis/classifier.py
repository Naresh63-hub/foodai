import re


INGREDIENT_CATEGORIES = [
    'sugar',
    'oil',
    'refined_carb',
    'whole_food',
    'additive',
    'preservative',
    'colour',
    'flavour_enhancer',
    'salt_sodium',
    'protein_source',
    'fiber_source',
    'other',
]


_TOKEN_KEYWORDS = {
    'preservative': [
        'benzoate', 'sorbate', 'sulfite', 'sulphite', 'nitrate', 'nitrite',
        'potassium sorbate', 'sodium benzoate', 'propionate', 'bha', 'bht', 'tbhq',
    ],
    'colour': [
        'colour', 'color', 'tartrazine', 'sunset yellow', 'carmine', 'allura red',
        'caramel color', 'caramel colour', 'titanium dioxide', 'annatto', 'curcumin',
        'riboflavin', 'brilliant blue',
    ],
    'flavour_enhancer': [
        'msg', 'monosodium glutamate', 'monosodium', 'glutamate', 'yeast extract',
        'disodium inosinate', 'disodium guanylate', 'disodium ribonucleotides', 'disodium',
        'hydrolyzed vegetable protein',
    ],
    'additive': [
        'lecithin', 'citric acid', 'xanthan', 'guar gum', 'carrageenan',
        'pectin', 'emulsifier', 'stabilizer', 'thickener', 'acidity regulator',
        'anti-caking', 'anticaking', 'raising agent', 'baking powder', 'sodium bicarbonate',
        'aspartame', 'sucralose', 'acesulfame', 'stevia', 'maltodextrin',
    ],
    'sugar': [
        'sugar', 'sucrose', 'fructose', 'glucose', 'honey', 'syrup',
        'dextrose', 'invert sugar', 'molasses', 'jaggery', 'cane juice',
        'maltose', 'corn syrup',
    ],
    'salt_sodium': [
        'salt', 'sodium chloride', 'rock salt', 'sea salt', 'iodized salt',
    ],
    'oil': [
        'oil', 'fat', 'butter', 'shortening', 'palm', 'margarine', 'ghee',
        'lard', 'tallow', 'vegetable fat', 'cocoa butter',
    ],
    'refined_carb': [
        'flour', 'starch', 'white rice', 'semolina', 'maida', 'refined wheat flour',
        'modified starch', 'cornstarch', 'tapioca',
    ],
    'protein_source': [
        'milk', 'whey', 'soy', 'pea protein', 'casein', 'egg', 'meat', 'chicken',
        'fish', 'paneer', 'tofu', 'collagen',
    ],
    'fiber_source': [
        'fiber', 'fibre', 'cellulose', 'inulin', 'bran', 'psyllium',
        'chicory root', 'resistant dextrin',
    ],
    'whole_food': [
        'oats', 'oat', 'whole wheat', 'beans', 'lentils', 'vegetable', 'fruit',
        'nuts', 'almonds', 'peanuts', 'seeds', 'chia', 'quinoa', 'chickpeas',
    ],
}


def classify_ingredient(name: str, additive_queryset=None) -> str:
    name_lower = name.lower().strip()
    if not name_lower:
        return 'other'

    # Check E-numbers first (e.g., E322, e950, E100, INS 500, etc.)
    if re.search(r'\b(?:e\s*\d{3,4}[a-z]?|ins\s*\d{3,4}[a-z]?)\b', name_lower) or re.match(r'^e\d+', name_lower):
        # If it's in the preservative / colour range, we could refine, or return 'additive'
        return 'additive'

    if additive_queryset is not None:
        try:
            code_match = name.strip().upper()
            additive = additive_queryset.filter(code=code_match).first()
            if additive is None:
                additive = additive_queryset.filter(common_name__iexact=name.strip()).first()
            if additive is not None:
                return additive.category
        except Exception:
            pass

    for category, keywords in _TOKEN_KEYWORDS.items():
        for kw in keywords:
            # Match as whole word or phrase with word boundaries if short, or phrase in string
            if len(kw) <= 4:
                pattern = rf'\b{re.escape(kw)}\b'
                if re.search(pattern, name_lower):
                    return category
            else:
                if kw in name_lower:
                    return category

    return 'other'


def parse_ingredients_text(text: str, additive_queryset=None):
    if not text:
        return []

    tokens = re.split(r'[;,]', text)
    result = []
    for token in tokens:
        token = token.strip()
        if len(token) < 2:
            continue
        paren_match = re.match(r'^\((.*)\)$', token)
        if paren_match:
            cleaned = paren_match.group(1).strip()
        else:
            cleaned = token
        if len(cleaned) < 2:
            continue
        category = classify_ingredient(cleaned, additive_queryset)
        result.append({'name': cleaned, 'category': category})
    return result
