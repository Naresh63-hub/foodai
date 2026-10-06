from django.core.management import call_command
from django.test import TestCase

from foodai_backend.food_analysis.models import AdditiveReference


class SeedAdditivesCommandTests(TestCase):
    def test_seed_additives_inserts_at_least_100_distinct_rows(self):
        AdditiveReference.objects.all().delete()

        call_command('seed_additives')

        total = AdditiveReference.objects.count()
        distinct_codes = AdditiveReference.objects.values('code').distinct().count()

        self.assertGreaterEqual(total, 100, f'Expected >= 100 rows, got {total}')
        self.assertGreaterEqual(
            distinct_codes,
            100,
            f'Expected >= 100 distinct codes, got {distinct_codes}',
        )
