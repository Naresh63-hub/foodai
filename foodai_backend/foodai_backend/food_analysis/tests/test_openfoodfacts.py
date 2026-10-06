from unittest.mock import patch

import requests as http_requests

from django.core.cache import cache
from django.test import TestCase

import foodai_backend.food_analysis.services.openfoodfacts as off


class _FakeResp:
    def __init__(self, status_code, json_data=None):
        self.status_code = status_code
        self._json = json_data

    def json(self):
        if self._json is None:
            raise ValueError("no json body")
        return self._json


class OpenFoodFactsClientTests(TestCase):
    def setUp(self):
        cache.clear()

    @patch('foodai_backend.food_analysis.services.openfoodfacts.requests.get')
    def test_hit_is_cached(self, mock_get):
        mock_get.return_value = _FakeResp(200, {'status': 1, 'product': {'product_name': 'X'}})

        first = off.lookup_barcode('123456')
        self.assertEqual(first, {'product_name': 'X'})
        self.assertEqual(mock_get.call_count, 1)

        # Second call is served from cache, no new network request.
        second = off.lookup_barcode('123456')
        self.assertEqual(second, {'product_name': 'X'})
        self.assertEqual(mock_get.call_count, 1)

    @patch('foodai_backend.food_analysis.services.openfoodfacts.requests.get')
    def test_miss_is_negative_cached(self, mock_get):
        mock_get.return_value = _FakeResp(404)

        self.assertIsNone(off.lookup_barcode('999999'))
        self.assertEqual(mock_get.call_count, 1)

        # Negative cache prevents hammering OFF for the same unknown code.
        self.assertIsNone(off.lookup_barcode('999999'))
        self.assertEqual(mock_get.call_count, 1)

    @patch('foodai_backend.food_analysis.services.openfoodfacts.time.sleep')
    @patch('foodai_backend.food_analysis.services.openfoodfacts.requests.get')
    def test_retries_transient_error_then_succeeds(self, mock_get, _sleep):
        mock_get.side_effect = [
            _FakeResp(503),
            _FakeResp(200, {'status': 1, 'product': {'product_name': 'Y'}}),
        ]
        product = off.lookup_barcode('555')
        self.assertEqual(product, {'product_name': 'Y'})
        self.assertEqual(mock_get.call_count, 2)

    @patch('foodai_backend.food_analysis.services.openfoodfacts.time.sleep')
    @patch('foodai_backend.food_analysis.services.openfoodfacts.requests.get')
    def test_raises_after_exhausting_retries(self, mock_get, _sleep):
        mock_get.side_effect = [_FakeResp(503), _FakeResp(503)]
        with self.assertRaises(off.OFFClientError):
            off.lookup_barcode('777')

    @patch('foodai_backend.food_analysis.services.openfoodfacts.time.sleep')
    @patch('foodai_backend.food_analysis.services.openfoodfacts.requests.get')
    def test_network_error_raises(self, mock_get, _sleep):
        mock_get.side_effect = http_requests.RequestException('boom')
        with self.assertRaises(off.OFFClientError):
            off.lookup_barcode('888')

    @patch('foodai_backend.food_analysis.services.openfoodfacts.requests.get')
    def test_empty_barcode_short_circuits(self, mock_get):
        self.assertIsNone(off.lookup_barcode(''))
        self.assertEqual(mock_get.call_count, 0)
