from django.conf import settings
from django.db import models


class Scan(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='scans',
    )
    product = models.ForeignKey(
        'food_analysis.Product',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='scans',
    )
    food_name = models.CharField(max_length=255, blank=True, default='')
    scan_type = models.CharField(max_length=50, blank=True, default='barcode')
    calories_kcal = models.FloatField(default=0.0)
    scanned_at = models.DateTimeField(auto_now_add=True)
    raw_payload = models.JSONField(default=dict)

    class Meta:
        ordering = ['-scanned_at']

    def __str__(self):
        name = self.product.product_name if self.product else (self.food_name or f"Scan {self.id}")
        return f"Scan {self.id} - {name}"


class DailyMealLog(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='daily_logs',
    )
    product_name = models.CharField(max_length=255)
    meal_type = models.CharField(max_length=50, default='meal')
    portion_g = models.FloatField(default=200.0)
    calories_kcal = models.FloatField(default=0.0)
    carbohydrates_g = models.FloatField(default=0.0)
    proteins_g = models.FloatField(default=0.0)
    fat_g = models.FloatField(default=0.0)
    sugars_g = models.FloatField(default=0.0)
    salt_g = models.FloatField(default=0.0)
    additives_count = models.IntegerField(default=0)
    processing_level = models.CharField(max_length=50, default='minimally_processed')
    date_key = models.CharField(max_length=20, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    raw_data = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.product_name} ({self.date_key}) - {self.calories_kcal} kcal"
