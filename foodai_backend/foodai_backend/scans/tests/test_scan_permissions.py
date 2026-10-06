from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase
from rest_framework.test import APIClient

from foodai_backend.food_analysis.models import Product
from foodai_backend.scans.models import Scan

User = get_user_model()


class ScanPermissionTests(TestCase):
    """AC-9: history is private and cross-user operations are isolated."""

    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.user_a = User.objects.create_user(username='usera', password='pw')
        self.user_b = User.objects.create_user(username='userb', password='pw')
        self.product = Product.objects.create(product_name='Test Biscuit', barcode='123')
        self.scan_a = Scan.objects.create(user=self.user_a, product=self.product)
        self.scan_b = Scan.objects.create(user=self.user_b, product=self.product)

    def test_anonymous_cannot_list_scans(self):
        response = self.client.get('/api/scans/')
        self.assertEqual(response.status_code, 401)

    def test_user_only_sees_own_scans(self):
        self.client.force_authenticate(user=self.user_a)
        response = self.client.get('/api/scans/')
        self.assertEqual(response.status_code, 200)
        ids = [item['id'] for item in response.json()]
        self.assertEqual(ids, [self.scan_a.id])
        self.assertNotIn(self.scan_b.id, ids)

    def test_anonymous_cannot_delete_scan(self):
        response = self.client.delete(f'/api/scans/{self.scan_b.id}/')
        self.assertEqual(response.status_code, 401)

    def test_user_cannot_delete_another_users_scan(self):
        self.client.force_authenticate(user=self.user_a)
        response = self.client.delete(f'/api/scans/{self.scan_b.id}/')
        self.assertEqual(response.status_code, 404)
        self.assertTrue(Scan.objects.filter(pk=self.scan_b.id).exists())

    def test_user_can_delete_own_scan(self):
        self.client.force_authenticate(user=self.user_a)
        response = self.client.delete(f'/api/scans/{self.scan_a.id}/')
        self.assertEqual(response.status_code, 204)
        self.assertFalse(Scan.objects.filter(pk=self.scan_a.id).exists())


class ProfilePermissionTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.user = User.objects.create_user(username='profileuser', password='pw')

    def test_anonymous_cannot_read_profile(self):
        response = self.client.get('/api/users/profile/')
        self.assertEqual(response.status_code, 401)

    def test_authenticated_user_can_read_profile(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/users/profile/')
        self.assertEqual(response.status_code, 200)
        self.assertIn('health_conditions', response.json())

    def test_authenticated_user_can_update_profile(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.put(
            '/api/users/profile/',
            {'age': 30, 'body_weight_kg': 70.5, 'health_conditions': ['diabetes']},
            format='json',
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['age'], 30)
