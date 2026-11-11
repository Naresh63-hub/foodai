from django.core.validators import MaxValueValidator, MinValueValidator
from rest_framework import serializers

from foodai_backend.users.models import UserProfile


class UserProfileSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(
        max_length=120,
        required=False,
        allow_blank=True,
        default='',
    )
    age = serializers.IntegerField(
        required=False,
        allow_null=True,
        validators=[
            MinValueValidator(0),
            MaxValueValidator(120),
        ],
    )
    body_weight_kg = serializers.FloatField(
        required=False,
        allow_null=True,
        validators=[
            MinValueValidator(1),
            MaxValueValidator(500),
        ],
    )
    height_cm = serializers.FloatField(
        required=False,
        allow_null=True,
        validators=[
            MinValueValidator(30),
            MaxValueValidator(300),
        ],
    )
    gender = serializers.CharField(
        max_length=20,
        required=False,
        allow_blank=True,
        default='',
    )
    activity_level = serializers.CharField(
        max_length=30,
        required=False,
        allow_blank=True,
        default='',
    )
    dietary_preference = serializers.CharField(
        max_length=30,
        required=False,
        allow_blank=True,
        default='',
    )
    health_goal = serializers.CharField(
        max_length=40,
        required=False,
        allow_blank=True,
        default='',
    )
    daily_calorie_goal = serializers.IntegerField(
        required=False,
        allow_null=True,
        validators=[
            MinValueValidator(500),
            MaxValueValidator(10000),
        ],
    )
    allergies_notes = serializers.CharField(
        max_length=1000,
        required=False,
        allow_blank=True,
        default='',
    )
    health_conditions = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        default=list,
    )

    class Meta:
        model = UserProfile
        fields = (
            'full_name',
            'age',
            'body_weight_kg',
            'height_cm',
            'gender',
            'activity_level',
            'dietary_preference',
            'health_goal',
            'daily_calorie_goal',
            'allergies_notes',
            'health_conditions',
        )
