from django.contrib.auth import get_user_model, authenticate
from django.core.validators import MaxValueValidator, MinValueValidator
from rest_framework import serializers

from foodai_backend.users.models import UserProfile

User = get_user_model()


class UserRegistrationSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('email', 'password')
        extra_kwargs = {
            'password': {'write_only': True},
        }

    def create(self, validated_data):
        email = User.objects.normalize_email(validated_data['email'])
        user = User.objects.create_user(
            email=email,
            username=email,
            password=validated_data['password'],
        )
        return user


class UserLoginSerializer(serializers.Serializer):
    username_or_email = serializers.CharField()
    password = serializers.CharField()

    def validate(self, attrs):
        username_or_email = attrs.get('username_or_email')
        password = attrs.get('password')

        user = authenticate(
            request=self.context.get('request'),
            username=username_or_email,
            password=password,
        )

        if user is None:
            try:
                user_obj = User.objects.get(email=username_or_email)
                user = authenticate(
                    request=self.context.get('request'),
                    username=user_obj.username,
                    password=password,
                )
            except User.DoesNotExist:
                pass

        if user is None:
            raise serializers.ValidationError('Invalid credentials')

        attrs['user'] = user
        return attrs


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
