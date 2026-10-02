from unittest.mock import patch

from django.core.cache import cache
from django.test import TestCase

from foodai_backend.food_analysis.models import Product


class UnknownBarcodeNeverFabricatesTests(TestCase):
    """Guard the core data-integrity rule: an unknown barcode must return a clean 404
    and must NEVER create a Product with guessed ingredients/nutrition."""

    def setUp(self):
        # The scan endpoints are rate-limited via the (per-process) cache; start clean
        # so throttling from other test modules can't turn these 404s into 429s.
        cache.clear()

    @patch('foodai_backend.food_analysis.views.lookup_barcode', return_value=None)
    def test_unknown_890_barcode_returns_404_and_creates_no_product(self, _mock_lookup):
        response = self.client.post(
            '/api/scan/barcode/',
            data={'barcode': '8901063999999'},  # Britannia-prefixed but not a real product
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.data.get('fallback'), 'ocr_or_manual')
        self.assertFalse(Product.objects.filter(barcode='8901063999999').exists())

    @patch('foodai_backend.food_analysis.views.lookup_barcode', return_value=None)
    def test_unknown_barcode_persists_no_invented_rows(self, _mock_lookup):
        before = Product.objects.count()
        self.client.post(
            '/api/scan/barcode/',
            data={'barcode': '1234567890123'},
            content_type='application/json',
        )
        self.assertEqual(Product.objects.count(), before)
