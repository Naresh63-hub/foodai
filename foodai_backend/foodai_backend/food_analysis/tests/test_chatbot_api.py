import os
from unittest.mock import patch, MagicMock
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status


class FoodAIChatBotAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.url = '/api/ai/chat/'
        self.alias_url = '/api/chat/'

    @patch('os.environ.get', return_value='')
    def test_empty_message_returns_welcome_and_suggestions(self, mock_env):
        response = self.client.post(self.url, {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("FoodAI Assistant", response.data.get("reply", ""))
        self.assertIsInstance(response.data.get("suggestions"), list)

    @patch('os.environ.get', return_value='')
    def test_plate_guidance_query(self, mock_env):
        response = self.client.post(self.url, {"message": "How do I analyze my plate?"}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("Analyze My Plate", response.data.get("reply", ""))
        self.assertTrue(len(response.data.get("suggestions", [])) > 0)

    @patch('os.environ.get', return_value='')
    def test_high_protein_query(self, mock_env):
        response = self.client.post(self.url, {"message": "What are good high protein foods for muscle building?"}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        reply = response.data.get("reply", "")
        self.assertTrue("Protein" in reply or "protein" in reply)
        self.assertIn("Chicken breast", reply)

    @patch('os.environ.get', return_value='')
    def test_who_guidelines_query(self, mock_env):
        response = self.client.post(self.alias_url, {"message": "What are WHO daily sugar and sodium limits?"}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        reply = response.data.get("reply", "")
        self.assertIn("Free Sugars", reply)
        self.assertIn("Sodium", reply)

    @patch('os.environ.get', return_value='mock-gemini-key')
    @patch('requests.post')
    def test_gemini_api_success(self, mock_post, mock_env):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "candidates": [
                {
                    "content": {
                        "parts": [
                            {"text": "Makhana is an excellent low-calorie snack with 105 kcal per serving."}
                        ]
                    }
                }
            ]
        }
        mock_post.return_value = mock_response

        response = self.client.post(self.url, {"message": "Tell me about makhana"}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("Makhana", response.data.get("reply", ""))
