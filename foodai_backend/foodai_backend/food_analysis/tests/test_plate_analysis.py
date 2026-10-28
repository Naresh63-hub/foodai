import json
import base64
from unittest.mock import patch, MagicMock
from django.test import TestCase
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient
from rest_framework import status


class MultiItemPlateAnalysisTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.url = '/api/ai/plate-analyze/'
        self.alias_url = '/api/plate-analyze/'

    def test_plate_analysis_requires_image_or_hint(self):
        response = self.client.post(self.url, {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Please provide a meal plate photo", response.data.get("detail", ""))

    def test_plate_analysis_fallback_thali(self):
        response = self.client.post(self.url, {"food_hint": "Indian Thali with Rice Dal Paneer"}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data
        self.assertIn("meal_name", data)
        self.assertIn("Traditional Vegetarian Thali Plate", data["meal_name"])
        self.assertIn("items", data)
        self.assertGreaterEqual(len(data["items"]), 4)

        # Verify items have required properties
        rice_item = next((it for it in data["items"] if "Rice" in it["food_name"]), None)
        self.assertIsNotNone(rice_item)
        self.assertIn("base_per_100g", rice_item)
        self.assertGreater(rice_item["calories_kcal"], 0)
        self.assertGreater(rice_item["portion_g"], 0)
        self.assertIn("portion_unit", rice_item)
        self.assertIn("confidence_score", rice_item)

        # Verify totals match
        self.assertIn("total_calories_kcal", data)
        self.assertIn("total_proteins_g", data)
        self.assertIn("total_carbohydrates_g", data)
        self.assertIn("total_fat_g", data)

    def test_plate_analysis_fallback_salmon(self):
        response = self.client.post(self.alias_url, {"food_hint": "Grilled Salmon Quinoa Bowl"}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data
        self.assertIn("Salmon", data["meal_name"])
        salmon_item = next((it for it in data["items"] if "Salmon" in it["food_name"]), None)
        self.assertIsNotNone(salmon_item)
        self.assertGreater(salmon_item["proteins_g"], 20.0)

    def test_plate_analysis_fallback_chicken(self):
        response = self.client.post(self.url, {"food_hint": "Herb Chicken Rice Platter"}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data
        self.assertIn("Chicken", data["meal_name"])
        chicken_item = next((it for it in data["items"] if "Chicken" in it["food_name"]), None)
        self.assertIsNotNone(chicken_item)

    def test_plate_analysis_fallback_breakfast(self):
        response = self.client.post(self.url, {"food_hint": "Poached Eggs and Sourdough Avocado Toast"}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data
        self.assertIn("Breakfast", data["meal_name"])

    def test_plate_analysis_with_base64_image(self):
        fake_b64 = "data:image/jpeg;base64," + base64.b64encode(b"fake-image-bytes-plate").decode("utf-8")
        response = self.client.post(
            self.url,
            {"image_base64": fake_b64, "food_hint": "Vegetarian Meal Plate"},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data["items"]), 3)

    def test_plate_analysis_file_size_limit(self):
        huge_content = b"0" * (11 * 1024 * 1024)
        huge_file = SimpleUploadedFile("plate_huge.jpg", huge_content, content_type="image/jpeg")
        response = self.client.post(self.url, {"image": huge_file}, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("too large", response.data.get("detail", ""))

    @patch.dict('os.environ', {'GEMINI_API_KEY': 'mock-gemini-key'})
    @patch('requests.post')
    def test_plate_analysis_with_mocked_gemini_vision(self, mock_post):
        mock_gemini_payload = {
            "meal_name": "Custom Mediterranean Bowl",
            "overall_confidence": 0.96,
            "image_quality_assessment": "Crisp lighting and clear food separation.",
            "uncertainty_notes": ["Portion depth estimated from shadow."],
            "items": [
                {
                    "id": "it-1",
                    "food_name": "Grilled Lemon Chicken",
                    "description": "Herb marinated tender breast",
                    "portion_g": 120.0,
                    "portion_unit": "piece",
                    "serving_quantity": 1.0,
                    "calories_kcal": 210.0,
                    "proteins_g": 38.0,
                    "carbohydrates_g": 0.0,
                    "fat_g": 4.5,
                    "sugars_g": 0.0,
                    "fiber_g": 0.0,
                    "sodium_mg": 180.0,
                    "confidence_score": 0.95,
                    "uncertainty_note": "Lean breast cut",
                },
                {
                    "id": "it-2",
                    "food_name": "Greek Salad with Feta",
                    "description": "Cucumbers, olives and feta cheese",
                    "portion_g": 100.0,
                    "portion_unit": "cup",
                    "serving_quantity": 1.0,
                    "calories_kcal": 110.0,
                    "proteins_g": 4.0,
                    "carbohydrates_g": 5.0,
                    "fat_g": 8.0,
                    "sugars_g": 2.5,
                    "fiber_g": 1.8,
                    "sodium_mg": 280.0,
                    "confidence_score": 0.92,
                    "uncertainty_note": "Feta crumble portion estimated",
                },
            ]
        }

        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            "candidates": [
                {
                    "content": {
                        "parts": [{"text": json.dumps(mock_gemini_payload)}]
                    }
                }
            ]
        }
        mock_post.return_value = mock_resp

        fake_b64 = "data:image/jpeg;base64," + base64.b64encode(b"test-bytes").decode("utf-8")
        response = self.client.post(self.url, {"image_base64": fake_b64}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data
        self.assertEqual(data["meal_name"], "Custom Mediterranean Bowl")
        self.assertEqual(data["data_source"], "gemini_multimodal_vision")
        self.assertEqual(len(data["items"]), 2)
        self.assertEqual(data["items"][0]["food_name"], "Grilled Lemon Chicken")
        self.assertEqual(data["items"][0]["base_per_100g"]["calories_kcal"], round((210.0 / 120.0) * 100.0, 1))
        self.assertEqual(data["total_calories_kcal"], 320.0)

    @patch.dict('os.environ', {'GEMINI_API_KEY': 'mock-gemini-key'})
    @patch('requests.post', side_effect=Exception("Gemini network timeout"))
    def test_plate_analysis_gemini_error_resilience(self, mock_post):
        fake_b64 = "data:image/jpeg;base64," + base64.b64encode(b"test-bytes").decode("utf-8")
        response = self.client.post(self.url, {"image_base64": fake_b64, "food_hint": "Indian Thali"}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data
        self.assertEqual(data["data_source"], "clinical_plate_synthesizer")
        self.assertGreaterEqual(len(data["items"]), 4)
