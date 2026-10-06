export const PROCESSING_LEVELS = [
  'minimally_processed',
  'processed',
  'highly_processed',
  'ultra_processed',
] as const

export type ProcessingLevel = (typeof PROCESSING_LEVELS)[number]

export const PROCESSING_LABELS: Record<ProcessingLevel, string> = {
  minimally_processed: 'Minimally Processed',
  processed: 'Processed',
  highly_processed: 'Highly Processed',
  ultra_processed: 'Ultra-Processed',
}

export const PROCESSING_NOVA_MAP: Record<ProcessingLevel, { nova: number; desc: string }> = {
  minimally_processed: { nova: 1, desc: 'NOVA Group 1: Unprocessed or minimally processed foods with no added industrial substances.' },
  processed: { nova: 3, desc: 'NOVA Group 3: Processed food made with culinary ingredients like salt, oil, or sugar.' },
  highly_processed: { nova: 4, desc: 'NOVA Group 4: Industrial formulation with multiple processed components.' },
  ultra_processed: { nova: 4, desc: 'NOVA Group 4: Ultra-processed formulation featuring flavor enhancers, colours, or synthetic texturizers.' },
}

export const PROCESSING_COLORS: Record<ProcessingLevel, { bg: string; text: string; border: string; badge: string }> = {
  minimally_processed: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    border: 'border-emerald-200',
    badge: 'bg-emerald-500 text-white',
  },
  processed: {
    bg: 'bg-sky-50',
    text: 'text-sky-800',
    border: 'border-sky-200',
    badge: 'bg-sky-500 text-white',
  },
  highly_processed: {
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
    badge: 'bg-amber-500 text-white',
  },
  ultra_processed: {
    bg: 'bg-rose-50',
    text: 'text-rose-800',
    border: 'border-rose-200',
    badge: 'bg-rose-600 text-white',
  },
}

export const INGREDIENT_CATEGORIES: Record<string, { label: string; icon: string; color: string }> = {
  whole_food: { label: 'Whole Food', icon: '🥬', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  sugar: { label: 'Added Sugar', icon: '🍬', color: 'bg-pink-100 text-pink-800 border-pink-200' },
  oil: { label: 'Oil / Vegetable Fat', icon: '🧈', color: 'bg-amber-100 text-amber-800 border-amber-200' },
  refined_carb: { label: 'Refined Carb / Flour', icon: '🌾', color: 'bg-orange-100 text-orange-800 border-orange-200' },
  additive: { label: 'Functional Additive', icon: '🧪', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  preservative: { label: 'Preservative', icon: '🛡️', color: 'bg-rose-100 text-rose-800 border-rose-200' },
  colour: { label: 'Food Colour', icon: '🎨', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  color: { label: 'Food Colour', icon: '🎨', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  flavour_enhancer: { label: 'Flavour Enhancer', icon: '✨', color: 'bg-violet-100 text-violet-800 border-violet-200' },
  salt_sodium: { label: 'Salt / Sodium', icon: '🧂', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  salt: { label: 'Salt / Sodium', icon: '🧂', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  protein_source: { label: 'Protein Source', icon: '💪', color: 'bg-teal-100 text-teal-800 border-teal-200' },
  protein: { label: 'Protein Source', icon: '💪', color: 'bg-teal-100 text-teal-800 border-teal-200' },
  fiber_source: { label: 'Dietary Fiber', icon: '🌱', color: 'bg-lime-100 text-lime-800 border-lime-200' },
  fiber: { label: 'Dietary Fiber', icon: '🌱', color: 'bg-lime-100 text-lime-800 border-lime-200' },
  sweetener: { label: 'Sweetener', icon: '🍭', color: 'bg-pink-100 text-pink-800 border-pink-200' },
  acid: { label: 'Acidity Regulator', icon: '🧫', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  other: { label: 'Food Constituent', icon: '📦', color: 'bg-gray-100 text-gray-800 border-gray-200' },
}

export const QUICK_SAMPLE_PRESETS = [
  {
    barcode: '8901063371040',
    name: 'Britannia Glucose / Tiger',
    category: 'Glucose Biscuit',
    icon: '🍪',
    processing: 'ultra_processed',
    sugarPct: '26.5%',
    tag: 'Britannia 36.6g',
  },
  {
    barcode: '8901030927644',
    name: 'Oreo Biscuits',
    category: 'Sweet Biscuit',
    icon: '🍪',
    processing: 'ultra_processed',
    sugarPct: '38.5%',
    tag: 'Cadbury Oreo',
  },
  {
    barcode: '8901058852372',
    name: 'Maggi Masala Noodles',
    category: 'Instant Noodles',
    icon: '🍜',
    processing: 'ultra_processed',
    sugarPct: '2.2%',
    tag: 'High Sodium',
  },
  {
    barcode: '8901262010053',
    name: 'Greek Yogurt Plain',
    category: 'High Protein Dairy',
    icon: '🥛',
    processing: 'minimally_processed',
    sugarPct: '4.5%',
    tag: 'Minimally Processed',
  },
  {
    barcode: '5449000000996',
    name: 'Coca-Cola Zero Sugar',
    category: 'Diet Soda',
    icon: '🥤',
    processing: 'ultra_processed',
    sugarPct: '0%',
    tag: 'Zero Sugar',
  },
  {
    barcode: '8908007789012',
    name: 'Pure Peanut Butter',
    category: '100% Peanuts',
    icon: '🥜',
    processing: 'minimally_processed',
    sugarPct: '6.2%',
    tag: 'Whole Food',
  },
]

export const DNA_DIMENSIONS = [
  { key: 'additive_burden', label: 'Additive Burden', description: 'Concentration of functional additives and chemical preservatives' },
  { key: 'sugar_density', label: 'Sugar Density', description: 'Percentage of free sugars contributing to total weight' },
  { key: 'sodium_load', label: 'Sodium Load', description: 'Salt & sodium concentration per 100g' },
  { key: 'processing_score', label: 'Processing Score', description: 'NOVA transformation level from raw to industrialized food' },
  { key: 'whole_food_ratio', label: 'Whole Food Ratio', description: 'Proportion of unrefined, whole agriculture ingredients' },
  { key: 'fortification_quality', label: 'Protein & Fiber Density', description: 'Beneficial nutrient density per calorie' },
] as const
