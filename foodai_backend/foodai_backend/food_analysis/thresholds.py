"""Single source of truth for nutritional thresholds used across the deterministic
engines (health_evaluator, ai_explainer, catalog filters).

Values follow FSSAI draft Front-of-Pack Nutrient Warning (FOPNL) norms and WHO/FAO
benchmarks, expressed per 100 g of solids unless the name says otherwise. Keep any
user-facing prose/labels in sync when a value is changed here.
"""

# --- FSSAI / WHO Front-of-Pack Nutrient Warning (FOPNL) triggers ---
SUGAR_HIGH = 15.0            # "high in added sugar" warning trigger
SUGAR_HIGH_PER_SERVING = 10.0  # per-serving sugar trigger (diabetes)
SALT_HIGH = 1.25             # "high in sodium" warning trigger (salt grams)
SALT_HIGH_PER_SERVING = 0.6  # per-serving sodium trigger
FAT_HIGH = 17.5              # total-fat warning trigger
FAT_PALM_TRIGGER = 12.0      # lower fat trigger when refined palm / hydrogenated fat present

# --- Secondary / escalation bands ---
SUGAR_STRICT = 25.0          # strictest portion guidance in damage control
SUGAR_MODERATE = 6.0         # diabetes moderate glycemic load
SALT_MODERATE = 0.6          # moderate sodium
SALT_DAMAGE = 1.0            # damage-control salt trigger
SALT_KIDNEY = 1.0            # renal filtration load
CHILD_SUGAR_ULTRA = 20.0     # child-mode ultra-sugary trigger

# --- AIExplainer descriptive highlight bands (informational, NOT regulatory warnings) ---
DESC_SUGAR_VERY_HIGH = 20.0
DESC_SUGAR_MODERATE = 10.0
DESC_SALT_HIGH = 1.5
DESC_SALT_MODERATE = 0.5
DESC_FAT_HIGH = 15.0
DESC_FIBER_GOOD = 3.0
DESC_PROTEIN_HIGH = 8.0

# --- Catalog "healthier choice" filters ---
CATALOG_LOW_SUGAR_MAX = 5.0
CATALOG_LOW_SALT_MAX = 0.5
