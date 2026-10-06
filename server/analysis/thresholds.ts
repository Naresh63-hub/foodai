/**
 * Single source of truth for nutritional thresholds used across deterministic engines.
 * Follows FSSAI Front-of-Pack Nutrient Warning (FOPNL) norms and WHO/FAO benchmarks.
 */

// --- FSSAI / WHO Front-of-Pack Nutrient Warning (FOPNL) triggers ---
export const SUGAR_HIGH = 15.0;            // "high in added sugar" warning trigger (per 100g)
export const SUGAR_HIGH_PER_SERVING = 10.0; // per-serving sugar trigger (diabetes)
export const SALT_HIGH = 1.25;             // "high in sodium" warning trigger (salt grams per 100g)
export const SALT_HIGH_PER_SERVING = 0.6;  // per-serving sodium trigger
export const FAT_HIGH = 17.5;              // total-fat warning trigger
export const FAT_PALM_TRIGGER = 12.0;      // lower fat trigger when refined palm / hydrogenated fat present

// --- Secondary / escalation bands ---
export const SUGAR_STRICT = 25.0;          // strictest portion guidance in damage control
export const SUGAR_MODERATE = 6.0;         // diabetes moderate glycemic load
export const SALT_MODERATE = 0.6;          // moderate sodium
export const SALT_DAMAGE = 1.0;            // damage-control salt trigger
export const SALT_KIDNEY = 1.0;            // renal filtration load
export const CHILD_SUGAR_ULTRA = 20.0;     // child-mode ultra-sugary trigger

// --- Descriptive highlight bands ---
export const DESC_SUGAR_VERY_HIGH = 20.0;
export const DESC_SUGAR_MODERATE = 10.0;
export const DESC_SALT_HIGH = 1.5;
export const DESC_SALT_MODERATE = 0.5;
export const DESC_FAT_HIGH = 15.0;
export const DESC_FIBER_GOOD = 3.0;
export const DESC_PROTEIN_HIGH = 8.0;

// --- Catalog "healthier choice" filters ---
export const CATALOG_LOW_SUGAR_MAX = 5.0;
export const CATALOG_LOW_SALT_MAX = 0.5;
