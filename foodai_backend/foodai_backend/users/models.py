from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver


class UserProfile(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='profile',
    )
    full_name = models.CharField(max_length=120, blank=True, default='')
    age = models.IntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(120)],
    )
    body_weight_kg = models.FloatField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(500)],
    )
    height_cm = models.FloatField(
        null=True,
        blank=True,
        validators=[MinValueValidator(30), MaxValueValidator(300)],
    )
    gender = models.CharField(max_length=20, blank=True, default='')
    activity_level = models.CharField(max_length=30, blank=True, default='')
    dietary_preference = models.CharField(max_length=30, blank=True, default='')
    health_goal = models.CharField(max_length=40, blank=True, default='')
    daily_calorie_goal = models.IntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(500), MaxValueValidator(10000)],
    )
    allergies_notes = models.TextField(blank=True, default='')
    health_conditions = models.JSONField(default=list, blank=True)

    def __str__(self):
        return f"Profile for {self.user.username}"


@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.get_or_create(user=instance)
