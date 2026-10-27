from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient
from foodai_backend.scans.models import DailyMealLog, Scan

User = get_user_model()


class DailyMealLogAndProgressTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='testlogger', password='pw')

    def test_create_daily_meal_log(self):
        self.client.force_authenticate(user=self.user)
        payload = {
            "product_name": "Quinoa Bowl",
            "meal_type": "lunch",
            "calories_kcal": 420.0,
            "portion_g": 250.0,
            "carbohydrates_g": 45.0,
            "proteins_g": 20.0,
            "fat_g": 12.0,
            "date_key": "2026-10-27",
        }
        response = self.client.post('/api/daily-logs/', payload, format='json')
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["product_name"], "Quinoa Bowl")
        self.assertEqual(response.json()["calories_kcal"], 420.0)

        # Check DB
        self.assertTrue(DailyMealLog.objects.filter(product_name="Quinoa Bowl").exists())

    def test_list_daily_meal_logs(self):
        self.client.force_authenticate(user=self.user)
        DailyMealLog.objects.create(
            user=self.user,
            product_name="Oatmeal",
            calories_kcal=300.0,
            date_key="2026-10-27"
        )
        response = self.client.get('/api/daily-logs/?date=2026-10-27')
        self.assertEqual(response.status_code, 200)
        logs = response.json()
        self.assertEqual(len(logs), 1)
        self.assertEqual(logs[0]["product_name"], "Oatmeal")

    def test_delete_daily_meal_log(self):
        self.client.force_authenticate(user=self.user)
        log = DailyMealLog.objects.create(
            user=self.user,
            product_name="Greek Yogurt",
            calories_kcal=150.0,
            date_key="2026-10-27"
        )
        response = self.client.delete(f'/api/daily-logs/{log.id}/')
        self.assertEqual(response.status_code, 204)
        self.assertFalse(DailyMealLog.objects.filter(pk=log.id).exists())

    def test_weekly_progress_aggregate(self):
        self.client.force_authenticate(user=self.user)
        import datetime
        today_str = datetime.date.today().isoformat()
        DailyMealLog.objects.create(
            user=self.user,
            product_name="Avocado Toast",
            calories_kcal=380.0,
            carbohydrates_g=32.0,
            proteins_g=16.0,
            fat_g=20.0,
            date_key=today_str,
        )
        response = self.client.get('/api/weekly-progress/?target=2000')
        self.assertEqual(response.status_code, 200)
        days = response.json()
        self.assertEqual(len(days), 7)
        today_data = days[-1]
        self.assertEqual(today_data["calories"], 380)
        self.assertEqual(today_data["targetCalories"], 2000)

    def test_create_custom_scan_history(self):
        self.client.force_authenticate(user=self.user)
        payload = {
            "food_name": "Berry Smoothie Bowl",
            "scan_type": "camera_snap",
            "calories_kcal": 310.0,
            "payload": {"health_score": 90}
        }
        response = self.client.post('/api/scans/', payload, format='json')
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["product_name"], "Berry Smoothie Bowl")
        self.assertEqual(response.json()["scan_type"], "camera_snap")
