from django.contrib.auth.models import AnonymousUser
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from rest_framework.test import APIRequestFactory
from unittest.mock import MagicMock, patch

from foodai_backend.food_analysis.models import Product
from foodai_backend.throttling import RoleRateThrottle


class BarcodeScanApiTests(TestCase):
    def setUp(self):
        cache.clear()

    def test_curated_barcode_returns_full_analysis(self):
        response = self.client.post(
            '/api/scan/barcode/',
            {'barcode': '8901063371040'},
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        for key in ('product', 'nutrition', 'ingredients', 'verdict', 'summary_info'):
            self.assertIn(key, data)
        # Curated product is seeded from real catalog data, not invented.
        self.assertTrue(Product.objects.filter(barcode='8901063371040').exists())

    @patch('foodai_backend.food_analysis.views.lookup_barcode')
    def test_off_barcode_creates_product_from_real_data(self, mock_lookup):
        mock_lookup.return_value = {
            'product_name': 'Test OFF Cola',
            'brands': 'TestBrand',
            'ingredients_text': 'Carbonated Water, Sugar, Colour (E150d), Acid (E338).',
            'nutriments': {'sugars_100g': 10.6, 'salt_100g': 0.02},
            'serving_size': '250 ml',
            'product_quantity': '300',
            'categories_tags': ['en:beverages'],
        }
        response = self.client.post(
            '/api/scan/barcode/',
            {'barcode': '5000123400001'},
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 200)
        product = Product.objects.get(barcode='5000123400001')
        self.assertEqual(product.source, 'off')
        self.assertEqual(product.product_name, 'Test OFF Cola')
        self.assertEqual(product.product_weight_g, 300.0)


class TextScanApiTests(TestCase):
    def setUp(self):
        cache.clear()

    def test_text_scan_returns_analysis(self):
        response = self.client.post(
            '/api/scan/text/',
            {'ingredients_text': 'Wheat Flour, Sugar, Refined Palm Oil, Emulsifier (E322).',
             'product_name': 'Test Cookie'},
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn('nutrition', response.json())

    def test_text_scan_requires_input(self):
        response = self.client.post('/api/scan/text/', {}, content_type='application/json')
        self.assertEqual(response.status_code, 400)


class ProductDetailCompareApiTests(TestCase):
    def setUp(self):
        cache.clear()

    def test_detail_for_curated_barcode(self):
        self.client.post('/api/scan/barcode/', {'barcode': '8901063371040'}, content_type='application/json')
        response = self.client.get('/api/products/8901063371040/')
        self.assertEqual(response.status_code, 200)

    @patch('foodai_backend.food_analysis.views.lookup_barcode', return_value=None)
    def test_detail_unknown_returns_404(self, _mock):
        response = self.client.get('/api/products/9999999999999/')
        self.assertEqual(response.status_code, 404)

    def test_compare_two_curated_products(self):
        response = self.client.post(
            '/api/products/compare/',
            {'barcode_1': '8901063371040', 'barcode_2': '8901719101076'},
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 200)
        comparison = response.json()['comparison']
        self.assertIn('better_choice_index', comparison)
        self.assertIn(comparison['better_choice_index'], (1, 2))


class OCRScanApiTests(TestCase):
    def setUp(self):
        cache.clear()

    def test_missing_image_returns_400(self):
        response = self.client.post('/api/scan/ocr/', {})
        self.assertEqual(response.status_code, 400)

    @override_settings(OCR_MAX_UPLOAD_BYTES=100)
    def test_oversized_image_returns_413(self):
        big = SimpleUploadedFile('big.png', b'x' * 200, content_type='image/png')
        response = self.client.post('/api/scan/ocr/', {'image': big})
        self.assertEqual(response.status_code, 413)

    @patch('foodai_backend.scans.views_ocr.get_default_ocr_engine')
    def test_ocr_success_returns_text(self, mock_engine):
        engine = MagicMock()
        engine.extract_text.return_value = 'Sugar, Wheat Flour'
        mock_engine.return_value = engine
        image = SimpleUploadedFile('label.png', b'imagbytes', content_type='image/png')
        response = self.client.post('/api/scan/ocr/', {'image': image})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['text'], 'Sugar, Wheat Flour')


class ScanThrottleIntegrationTests(TestCase):
    def setUp(self):
        cache.clear()

    @patch('foodai_backend.food_analysis.views.lookup_barcode', return_value=None)
    def test_anonymous_scan_is_rate_limited(self, _mock):
        codes = []
        for _ in range(40):
            response = self.client.post(
                '/api/scan/barcode/',
                {'barcode': '8901063999999'},
                content_type='application/json',
            )
            codes.append(response.status_code)
        # First requests are processed (404 unknown barcode), then throttled (429).
        self.assertEqual(codes[0], 404)
        self.assertIn(429, codes)


class RoleRateThrottleUnitTests(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()

    def _anon_request(self):
        request = self.factory.get('/')
        request.user = AnonymousUser()
        return request

    def test_resolves_scope_anon_rate(self):
        view = MagicMock()
        view.throttle_scope = 'scan'
        with patch.object(RoleRateThrottle, 'THROTTLE_RATES', {'scan_anon': '5/min', 'scan_user': '50/min'}):
            throttle = RoleRateThrottle()
            key = throttle.get_cache_key(self._anon_request(), view)
            self.assertIsNotNone(key)
            self.assertIn('throttle_scan_', key)
            self.assertEqual(throttle.num_requests, 5)
            self.assertEqual(throttle.duration, 60)

    def test_missing_rate_disables_throttling(self):
        view = MagicMock()
        view.throttle_scope = 'scan'
        with patch.object(RoleRateThrottle, 'THROTTLE_RATES', {}):
            throttle = RoleRateThrottle()
            self.assertIsNone(throttle.get_cache_key(self._anon_request(), view))
