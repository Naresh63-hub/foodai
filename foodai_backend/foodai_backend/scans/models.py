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
        related_name='scans',
    )
    scanned_at = models.DateTimeField(auto_now_add=True)
    raw_payload = models.JSONField(default=dict)

    def __str__(self):
        return f"Scan {self.id} - {self.product.product_name}"
