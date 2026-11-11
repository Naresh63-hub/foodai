from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from foodai_backend.users.models import UserProfile


User = get_user_model()


class UserProfileNullValuesTests(TestCase):
    def test_profile_null_values_not_zero(self):
        user = User.objects.create_user(username='nulltestuser', password='pw')
        profile = UserProfile.objects.get(user=user)
        profile.age = None
        profile.body_weight_kg = None
        profile.height_cm = None
        profile.daily_calorie_goal = None
        profile.save()

        fetched = UserProfile.objects.get(pk=profile.pk)
        self.assertIs(fetched.age, None)
        self.assertIs(fetched.body_weight_kg, None)
        self.assertIs(fetched.height_cm, None)
        self.assertIs(fetched.daily_calorie_goal, None)
        self.assertNotEqual(fetched.age, 0)
        self.assertNotEqual(fetched.body_weight_kg, 0)


class UserProfileExtendedHealthFieldsAPITests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='healthuser', password='pw')
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_update_and_fetch_extended_health_profile(self):
        payload = {
            'full_name': 'Aarav Sharma',
            'age': 29,
            'body_weight_kg': 72.5,
            'height_cm': 176.0,
            'gender': 'male',
            'activity_level': 'moderate',
            'dietary_preference': 'vegetarian',
            'health_goal': 'gain_muscle',
            'daily_calorie_goal': 2400,
            'allergies_notes': 'Avoid artificial sweeteners',
            'health_conditions': ['diabetes', 'hypertension'],
        }
        res = self.client.put('/api/users/profile/', payload, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['full_name'], 'Aarav Sharma')
        self.assertEqual(res.data['age'], 29)
        self.assertEqual(res.data['body_weight_kg'], 72.5)
        self.assertEqual(res.data['height_cm'], 176.0)
        self.assertEqual(res.data['gender'], 'male')
        self.assertEqual(res.data['activity_level'], 'moderate')
        self.assertEqual(res.data['dietary_preference'], 'vegetarian')
        self.assertEqual(res.data['health_goal'], 'gain_muscle')
        self.assertEqual(res.data['daily_calorie_goal'], 2400)
        self.assertEqual(res.data['allergies_notes'], 'Avoid artificial sweeteners')
        self.assertEqual(res.data['health_conditions'], ['diabetes', 'hypertension'])

        get_res = self.client.get('/api/users/profile/')
        self.assertEqual(get_res.status_code, 200)
        self.assertEqual(get_res.data['full_name'], 'Aarav Sharma')
        self.assertEqual(get_res.data['height_cm'], 176.0)
        self.assertEqual(get_res.data['dietary_preference'], 'vegetarian')
