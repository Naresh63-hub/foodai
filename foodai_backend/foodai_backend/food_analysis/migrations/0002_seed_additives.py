from django.db import migrations
from django.core.management import call_command


def seed_additives_forward(apps, schema_editor):
    AdditiveReference = apps.get_model('food_analysis', 'AdditiveReference')
    if AdditiveReference.objects.count() < 100:
        call_command('seed_additives')


def seed_additives_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('food_analysis', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(seed_additives_forward, seed_additives_reverse),
    ]
