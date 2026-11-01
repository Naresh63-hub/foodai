"""
Credential handling and provenance labelling tests for the /api/ai/* endpoints.

SENTINEL_KEY below is a fake marker value, never a real credential. The tests use
it to prove the configured key cannot leak into response bodies, request URLs or
log records, and that results which were not produced by Gemini are always
labelled as estimates instead of being passed off as AI analysis.
"""
import base64
import json
import logging
from unittest.mock import patch, MagicMock

import requests
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status

SENTINEL_KEY = "test-sentinel-not-a-real-key"
VIEWS_LOGGER = "foodai_backend.food_analysis.views_ai"


def mock_gemini_text(text: str) -> MagicMock:
    response = MagicMock()
    response.status_code = 200
    response.json.return_value = {
        "candidates": [{"content": {"parts": [{"text": text}]}}]
    }
    return response


def mock_gemini_status(code: int, body: dict) -> MagicMock:
    response = MagicMock()
    response.status_code = code
    response.json.return_value = body
    return response


def fake_food_json() -> str:
    return json.dumps({
        "food_name": "Masala Dosa",
        "calories_kcal": 320,
        "macros": {"carbohydrates_g": 40.0, "proteins_g": 6.0, "fat_g": 14.0},
    })


def jpeg_base64() -> str:
    return "data:image/jpeg;base64," + base64.b64encode(b"\xff\xd8\xff\xe0fake").decode("utf-8")


class GeminiCredentialTransportTests(TestCase):
    """The key must travel in a header and never in a URL, log line or response."""

    def setUp(self):
        self.client = APIClient()

    @patch.dict("os.environ", {"GEMINI_API_KEY": ""})
    @patch("requests.post")
    def test_missing_key_skips_provider_and_labels_estimate(self, mock_post):
        mock_post.side_effect = AssertionError("provider must not be called without a key")
        response = self.client.post("/api/ai/nutrition-analyze/", {"food_query": "masala dosa"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["data_source"], "clinical_baseline")
        self.assertIs(response.data["is_estimate"], True)
        self.assertEqual(response.data["estimate_reason"], "missing_credentials")
        self.assertIn("Estimate only", response.data["estimate_notice"])

    @patch.dict("os.environ", {"GEMINI_API_KEY": SENTINEL_KEY})
    @patch("requests.post")
    def test_key_is_sent_in_header_never_in_url(self, mock_post):
        mock_post.return_value = mock_gemini_text(fake_food_json())
        response = self.client.post("/api/ai/nutrition-analyze/", {"food_query": "masala dosa"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        mock_post.assert_called_once()
        url = mock_post.call_args.args[0]
        headers = mock_post.call_args.kwargs["headers"]

        self.assertNotIn("key=", url)
        self.assertNotIn(SENTINEL_KEY, url)
        self.assertEqual(headers.get("x-goog-api-key"), SENTINEL_KEY)

    @patch.dict("os.environ", {"GEMINI_API_KEY": SENTINEL_KEY})
    @patch("requests.post")
    def test_success_path_is_not_marked_as_estimate(self, mock_post):
        mock_post.return_value = mock_gemini_text(fake_food_json())
        response = self.client.post("/api/ai/nutrition-analyze/", {"food_query": "masala dosa"}, format="json")

        self.assertEqual(response.data["data_source"], "gemini_ai_analysis")
        self.assertIs(response.data["is_estimate"], False)
        self.assertNotIn("estimate_notice", response.data)
        self.assertNotIn("estimate_reason", response.data)
        self.assertEqual(response.data["food_name"], "Masala Dosa")

    @patch.dict("os.environ", {"GEMINI_API_KEY": SENTINEL_KEY})
    @patch("requests.post")
    def test_rejected_credentials_are_reported_and_provider_body_hidden(self, mock_post):
        mock_post.return_value = mock_gemini_status(
            400, {"error": {"message": "API key not valid. Please pass a valid API key."}}
        )
        with self.assertLogs(VIEWS_LOGGER, level="WARNING") as captured:
            response = self.client.post("/api/ai/nutrition-analyze/", {"food_query": "masala dosa"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["estimate_reason"], "invalid_credentials")
        self.assertIs(response.data["is_estimate"], True)

        serialized = json.dumps(response.data, default=str)
        self.assertNotIn("API key not valid", serialized)
        self.assertNotIn(SENTINEL_KEY, serialized)
        self.assertNotIn(SENTINEL_KEY, "\n".join(captured.output))

    @patch.dict("os.environ", {"GEMINI_API_KEY": SENTINEL_KEY})
    @patch("requests.post")
    def test_quota_exhaustion_reason_code(self, mock_post):
        mock_post.return_value = mock_gemini_status(429, {"error": {"message": "Resource has been exhausted"}})
        with self.assertLogs(VIEWS_LOGGER, level="WARNING"):
            response = self.client.post("/api/ai/nutrition-analyze/", {"food_query": "masala dosa"}, format="json")
        self.assertEqual(response.data["estimate_reason"], "quota_exceeded")

    @patch.dict("os.environ", {"GEMINI_API_KEY": SENTINEL_KEY})
    @patch("requests.post")
    def test_timeout_is_reported_without_secret_leak(self, mock_post):
        mock_post.side_effect = requests.exceptions.Timeout(
            f"HTTPSConnectionPool(host='generativelanguage.googleapis.com'): Read timed out. url=https://x?key={SENTINEL_KEY}"
        )
        with self.assertLogs(VIEWS_LOGGER, level="WARNING") as captured:
            response = self.client.post("/api/ai/nutrition-analyze/", {"food_query": "masala dosa"}, format="json")

        self.assertEqual(response.data["estimate_reason"], "provider_timeout")
        joined = "\n".join(captured.output)
        self.assertNotIn(SENTINEL_KEY, joined)
        self.assertNotIn(SENTINEL_KEY, json.dumps(response.data, default=str))

    @patch.dict("os.environ", {"GEMINI_API_KEY": SENTINEL_KEY})
    @patch("requests.post")
    def test_connection_error_message_is_never_logged(self, mock_post):
        # requests embeds the full request URL (including any query string) in
        # these messages, so logging str(exc) would leak the credential.
        mock_post.side_effect = requests.exceptions.ConnectionError(
            f"Max retries exceeded with url: /v1beta/models/gemini-2.5-flash:generateContent?key={SENTINEL_KEY}"
        )
        with self.assertLogs(VIEWS_LOGGER, level="WARNING") as captured:
            response = self.client.post("/api/ai/nutrition-analyze/", {"food_query": "masala dosa"}, format="json")

        self.assertEqual(response.data["estimate_reason"], "provider_unreachable")
        self.assertNotIn(SENTINEL_KEY, "\n".join(captured.output))

    @patch.dict("os.environ", {"GEMINI_API_KEY": SENTINEL_KEY})
    @patch("requests.post")
    def test_blocked_or_empty_candidates_falls_back_with_reason(self, mock_post):
        empty = MagicMock()
        empty.status_code = 200
        empty.json.return_value = {"candidates": []}
        mock_post.return_value = empty

        with self.assertLogs(VIEWS_LOGGER, level="WARNING"):
            response = self.client.post("/api/ai/nutrition-analyze/", {"food_query": "masala dosa"}, format="json")

        self.assertEqual(response.data["estimate_reason"], "empty_response")
        self.assertIs(response.data["is_estimate"], True)

    @patch.dict("os.environ", {"GEMINI_API_KEY": SENTINEL_KEY})
    @patch("requests.post")
    def test_non_json_model_output_falls_back_with_reason(self, mock_post):
        mock_post.return_value = mock_gemini_text("this plate looks delicious but is not JSON at all")
        with self.assertLogs(VIEWS_LOGGER, level="WARNING"):
            response = self.client.post("/api/ai/nutrition-analyze/", {"food_query": "masala dosa"}, format="json")
        self.assertEqual(response.data["estimate_reason"], "model_output_not_json")


class GeminiProvenanceAcrossEndpointsTests(TestCase):
    """Every AI endpoint must declare whether its payload came from the model."""

    def setUp(self):
        self.client = APIClient()

    @patch.dict("os.environ", {"GEMINI_API_KEY": ""})
    def test_vision_fallback_marked_as_estimate(self):
        response = self.client.post("/api/ai/food-vision-analyze/", {"image_base64": jpeg_base64()}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["data_source"], "clinical_vision_synthesizer")
        self.assertIs(response.data["is_estimate"], True)

    @patch.dict("os.environ", {"GEMINI_API_KEY": SENTINEL_KEY})
    @patch("requests.post")
    def test_vision_success_marked_as_ai(self, mock_post):
        mock_post.return_value = mock_gemini_text(fake_food_json())
        response = self.client.post("/api/ai/food-vision-analyze/", {"image_base64": jpeg_base64()}, format="json")
        self.assertEqual(response.data["data_source"], "gemini_multimodal_vision")
        self.assertIs(response.data["is_estimate"], False)

    @patch.dict("os.environ", {"GEMINI_API_KEY": ""})
    def test_plate_fallback_marked_as_estimate(self):
        response = self.client.post("/api/ai/plate-analyze/", {"food_hint": "Indian Thali"}, format="json")
        self.assertEqual(response.data["data_source"], "clinical_plate_synthesizer")
        self.assertIs(response.data["is_estimate"], True)
        self.assertEqual(response.data["estimate_reason"], "missing_credentials")
        self.assertGreaterEqual(len(response.data["items"]), 4)

    @patch.dict("os.environ", {"GEMINI_API_KEY": SENTINEL_KEY})
    @patch("requests.post")
    def test_plate_success_marked_as_ai(self, mock_post):
        plate_json = json.dumps({
            "meal_name": "Mediterranean Bowl",
            "overall_confidence": 0.95,
            "image_quality_assessment": "Clear",
            "uncertainty_notes": [],
            "items": [{
                "id": "it-1", "food_name": "Grilled Chicken", "description": "lean",
                "portion_g": 120.0, "portion_unit": "piece", "serving_quantity": 1.0,
                "calories_kcal": 210.0, "proteins_g": 38.0, "carbohydrates_g": 0.0,
                "fat_g": 4.5, "sugars_g": 0.0, "fiber_g": 0.0, "sodium_mg": 180.0,
                "confidence_score": 0.95, "uncertainty_note": "",
            }],
        })
        mock_post.return_value = mock_gemini_text(plate_json)

        response = self.client.post("/api/ai/plate-analyze/", {"image_base64": jpeg_base64()}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["data_source"], "gemini_multimodal_vision")
        self.assertIs(response.data["is_estimate"], False)
        self.assertNotIn("estimate_notice", response.data)
        self.assertEqual(response.data["items"][0]["data_source"], "gemini_multimodal_vision")

    @patch.dict("os.environ", {"GEMINI_API_KEY": ""})
    def test_chat_fallback_marked_as_estimate(self):
        response = self.client.post("/api/ai/chat/", {"message": "How do I analyze my plate?"}, format="json")
        self.assertEqual(response.data["data_source"], "clinical_chat_synthesizer")
        self.assertIs(response.data["is_estimate"], True)

    @patch.dict("os.environ", {"GEMINI_API_KEY": SENTINEL_KEY})
    @patch("requests.post")
    def test_chat_success_marked_as_ai(self, mock_post):
        mock_post.return_value = mock_gemini_text("Makhana is a low-calorie snack.")
        response = self.client.post("/api/ai/chat/", {"message": "Tell me about makhana"}, format="json")
        self.assertEqual(response.data["data_source"], "gemini_ai_analysis")
        self.assertIs(response.data["is_estimate"], False)
        self.assertIn("Makhana", response.data["reply"])


class GeminiDiagnosticsHelperTests(TestCase):
    """gemini_credentials_present() reflects the runtime environment only."""

    @patch.dict("os.environ", {"GEMINI_API_KEY": "   "})
    def test_whitespace_only_key_is_treated_as_missing(self):
        from foodai_backend.food_analysis.views_ai import gemini_credentials_present
        self.assertFalse(gemini_credentials_present())

    @patch.dict("os.environ", {"GEMINI_API_KEY": SENTINEL_KEY})
    def test_configured_key_is_detected(self):
        from foodai_backend.food_analysis.views_ai import gemini_credentials_present
        self.assertTrue(gemini_credentials_present())

    def test_logger_name_matches_module(self):
        # Guards against the provenance/log assertions silently targeting a dead logger.
        from foodai_backend.food_analysis import views_ai
        self.assertEqual(views_ai.logger.name, VIEWS_LOGGER)
        self.assertIsInstance(views_ai.logger, logging.Logger)
