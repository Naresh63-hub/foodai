import additivesData from '../data/additives.json';
import { AdditiveReferenceItem } from './types';

export const INGREDIENT_CATEGORIES = [
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
] as const;

export type IngredientCategory = typeof INGREDIENT_CATEGORIES[number];

const TOKEN_KEYWORDS: Record<string, string[]> = {
  preservative: [
    'benzoate', 'sorbate', 'sulfite', 'sulphite', 'nitrate', 'nitrite',
    'potassium sorbate', 'sodium benzoate', 'propionate', 'bha', 'bht', 'tbhq',
    'sodium metabisulphite', 'sodium metabisulfite',
  ],
  colour: [
    'colour', 'color', 'tartrazine', 'sunset yellow', 'carmine', 'allura red',
    'caramel color', 'caramel colour', 'titanium dioxide', 'annatto', 'curcumin',
    'riboflavin', 'brilliant blue',
  ],
  flavour_enhancer: [
    'msg', 'monosodium glutamate', 'monosodium', 'glutamate', 'yeast extract',
    'disodium inosinate', 'disodium guanylate', 'disodium ribonucleotides', 'disodium',
    'hydrolyzed vegetable protein', 'hydrolyzed groundnut protein',
  ],
  additive: [
    'lecithin', 'citric acid', 'xanthan', 'guar gum', 'carrageenan',
    'pectin', 'emulsifier', 'emulsifiers', 'stabilizer', 'stabilisers', 'thickener', 'thickeners',
    'acidity regulator', 'acidity regulators', 'anti-caking', 'anticaking',
    'raising agent', 'raising agents', 'leavening agents', 'leavening agent',
    'baking powder', 'sodium bicarbonate', 'ammonium bicarbonate',
    'aspartame', 'sucralose', 'acesulfame', 'stevia', 'maltodextrin',
    'dough conditioner', 'dough conditioners', 'humectant',
  ],
  sugar: [
    'sugar', 'sucrose', 'fructose', 'glucose', 'honey', 'syrup',
    'dextrose', 'invert sugar', 'invert sugar syrup', 'molasses', 'jaggery', 'cane juice',
    'maltose', 'corn syrup',
  ],
  salt_sodium: [
    'salt', 'sodium chloride', 'rock salt', 'sea salt', 'iodized salt', 'iodised salt',
  ],
  oil: [
    'oil', 'fat', 'butter', 'shortening', 'palm', 'palmolein', 'margarine', 'ghee',
    'lard', 'tallow', 'vegetable fat', 'vegetable oil', 'cocoa butter',
  ],
  refined_carb: [
    'flour', 'starch', 'white rice', 'semolina', 'maida', 'refined wheat flour',
    'modified starch', 'cornstarch', 'tapioca', 'corn meal', 'rice meal', 'gram meal',
  ],
  protein_source: [
    'milk', 'whey', 'soy', 'pea protein', 'casein', 'egg', 'meat', 'chicken',
    'fish', 'paneer', 'tofu', 'collagen', 'milk solids', 'skimmed milk', 'peanuts',
  ],
  fiber_source: [
    'fiber', 'fibre', 'cellulose', 'inulin', 'bran', 'psyllium',
    'chicory root', 'resistant dextrin',
  ],
  whole_food: [
    'oats', 'oat', 'whole wheat', 'beans', 'lentils', 'vegetable', 'fruit',
    'nuts', 'almonds', 'seeds', 'chia', 'quinoa', 'chickpeas', 'apples', 'raw apples',
    'spices', 'chilli powder', 'onion powder', 'garlic powder', 'coriander powder', 'turmeric powder',
  ],
};

function buildKeywordIndex(): [string, string][] {
  const pairs: [string, string][] = [];
  for (const [category, keywords] of Object.entries(TOKEN_KEYWORDS)) {
    for (const kw of keywords) {
      pairs.push([kw, category]);
    }
  }
  // Sort longest keyword first
  pairs.sort((a, b) => b[0].length - a[0].length);
  return pairs;
}

const KEYWORD_INDEX = buildKeywordIndex();

const additives: AdditiveReferenceItem[] = additivesData as AdditiveReferenceItem[];

export function getAdditivesList(): AdditiveReferenceItem[] {
  return additives;
}

export function matchAdditiveReference(name: string): AdditiveReferenceItem | null {
  const nameClean = name.trim();
  const nameLower = nameClean.toLowerCase();

  // Search by E-code or INS code
  const eCodeMatch = nameLower.match(/\b(e\s*\d{3,4}[a-z]?|ins\s*\d{3,4}[a-z]?)\b/);
  if (eCodeMatch) {
    const codeStr = eCodeMatch[1].toUpperCase().replace(/\s+/g, '');
    const found = additives.find(a => a.code.toUpperCase() === codeStr);
    if (found) return found;
  }

  // Search by direct code or common name exact
  const byCode = additives.find(a => a.code.toLowerCase() === nameClean.toLowerCase());
  if (byCode) return byCode;

  const byName = additives.find(a => a.common_name.toLowerCase() === nameClean.toLowerCase());
  if (byName) return byName;

  // Substring match
  const bySub = additives.find(
    a => nameLower.includes(a.common_name.toLowerCase()) || a.common_name.toLowerCase().includes(nameLower)
  );
  if (bySub) return bySub;

  return null;
}

export function classifyIngredient(name: string): string {
  const nameLower = name.toLowerCase().trim();
  if (!nameLower) return 'other';

  // Check E-number regex
  if (/\b(?:e\s*\d{3,4}[a-z]?|ins\s*\d{3,4}[a-z]?)\b/i.test(nameLower) || /^e\d+/i.test(nameLower)) {
    const matchedRef = matchAdditiveReference(nameLower);
    if (matchedRef && matchedRef.category) {
      return matchedRef.category;
    }
    return 'additive';
  }

  const matchedRef = matchAdditiveReference(name);
  if (matchedRef && matchedRef.category) {
    return matchedRef.category;
  }

  for (const [kw, category] of KEYWORD_INDEX) {
    if (kw.length <= 4) {
      const regex = new RegExp(`\\b${kw}\\b`, 'i');
      if (regex.test(nameLower)) {
        return category;
      }
    } else {
      if (nameLower.includes(kw)) {
        return category;
      }
    }
  }

  return 'other';
}

export function parseIngredientsText(text: string): { name: string; category: string }[] {
  if (!text) return [];

  // Split on commas and semicolons, handling parenthesized groups
  const tokens = text.split(/[;,]/);
  const result: { name: string; category: string }[] = [];

  for (let token of tokens) {
    token = token.trim();
    if (token.length < 2) continue;

    // Strip outer parentheses if any
    const parenMatch = token.match(/^\((.*)\)$/);
    if (parenMatch) {
      token = parenMatch[1].trim();
    }
    if (token.length < 2) continue;

    // Check if contains sub-ingredients in parens (e.g. "Emulsifier (E322 Lecithin)")
    const subParen = token.match(/^(.*?)\((.*?)\)$/);
    if (subParen) {
      const mainName = subParen[1].trim();
      const innerDetails = subParen[2].trim();
      const category = classifyIngredient(token);
      result.push({ name: token, category });
      continue;
    }

    const category = classifyIngredient(token);
    result.push({ name: token, category });
  }

  return result;
}
