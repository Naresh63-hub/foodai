from django.test import TestCase
from django.contrib.auth import get_user_model

from foodai_backend.users.models import UserProfile


User = get_user_model()


class UserProfileNullValuesTests(TestCase):
    def test_profile_null_values_not_zero(self):
        user = User.objects.create_user(username='nulltestuser', password='pw')
        profile = UserProfile.objects.get(user=user)
        profile.age = None
        profile.body_weight_kg = None
        profile.save()

        fetched = UserProfile.objects.get(pk=profile.pk)
        self.assertIs(fetched.age, None)
        self.assertIs(fetched.body_weight_kg, None)
        self.assertNotEqual(fetched.age, 0)
        self.assertNotEqual(fetched.body_weight_kg, 0)
