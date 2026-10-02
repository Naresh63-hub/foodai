from django.core.validators import MaxValueValidator, MinValueValidator
from rest_framework import serializers

from foodai_backend.users.models import UserProfile


class UserProfileSerializer(serializers.ModelSerializer):
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
    health_conditions = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        default=list,
    )

    class Meta:
        model = UserProfile
        fields = ('age', 'body_weight_kg', 'health_conditions')
