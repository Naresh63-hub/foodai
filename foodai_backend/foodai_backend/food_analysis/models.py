from django.db import models


CATEGORY_CHOICES = [
    ('sugar', 'Sugar'),
    ('oil', 'Oil'),
    ('refined_carb', 'Refined Carbohydrate'),
    ('whole_food', 'Whole Food'),
    ('additive', 'Additive'),
    ('preservative', 'Preservative'),
    ('colour', 'Colour'),
    ('flavour_enhancer', 'Flavour Enhancer'),
    ('salt_sodium', 'Salt / Sodium'),
    ('protein_source', 'Protein Source'),
    ('fiber_source', 'Fiber Source'),
    ('other', 'Other'),
]


class AdditiveReference(models.Model):
    code = models.CharField(max_length=20, unique=True)
    common_name = models.CharField(max_length=255)
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES)
    fssai_ref = models.TextField(blank=True)
    who_jecfa_ref = models.TextField(blank=True)
    adi_mg_per_kg = models.FloatField(null=True, blank=True)
    food_limit_mg_per_kg = models.FloatField(null=True, blank=True)
    notes = models.TextField(blank=True)

    def __str__(self):
        return f"{self.code} - {self.common_name}"


class Product(models.Model):
    SOURCE_CHOICES = [
        ('off', 'Open Food Facts'),
        ('manual', 'Manual Entry'),
    ]

    barcode = models.CharField(max_length=64, unique=True, null=True, blank=True)
    product_name = models.CharField(max_length=255)
    brands = models.CharField(max_length=255, blank=True)
    ingredients_text = models.TextField(blank=True)
    nutriments = models.JSONField(default=dict)
    serving_size = models.CharField(max_length=100, blank=True)
    serving_size_g = models.FloatField(null=True, blank=True)
    product_weight_g = models.FloatField(null=True, blank=True)
    categories_tags = models.JSONField(default=list)
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES, default='off')

    def __str__(self):
        return self.product_name


class Ingredient(models.Model):
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='ingredients',
    )
    name = models.CharField(max_length=255)
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES)
    amount_g = models.FloatField(null=True, blank=True)
    purpose_text = models.TextField(blank=True)
    concern_text = models.TextField(blank=True)
    regulatory_refs = models.JSONField(default=dict)

    def __str__(self):
        return f"{self.name} ({self.product.product_name})"
