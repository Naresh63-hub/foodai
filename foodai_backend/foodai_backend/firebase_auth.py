import os
import logging
from django.contrib.auth.backends import BaseBackend
from django.contrib.auth.models import User
from django.conf import settings
import firebase_admin
from firebase_admin import auth as firebase_auth
from firebase_admin.auth import ExpiredIdTokenError, InvalidIdTokenError, RevokedIdTokenError
from rest_framework import authentication, exceptions

logger = logging.getLogger(__name__)


class FirebaseAuthenticationBackend(BaseBackend):
    """
    Custom authentication backend using Firebase tokens with multi-tier verification:
    1. Firebase Admin SDK verify_id_token (with clock skew tolerance for distributed environments)
    2. Google OAuth public-key verify_firebase_token (works without service account file)
    """

    def authenticate(self, request, token=None, **kwargs):
        """
        Authenticate user using Firebase ID token
        """
        if not token and hasattr(request, 'firebase_token'):
            token = request.firebase_token

        if not token:
            return None

        # Guard against bypass token on actual verification
        if token == 'local-dev-bypass-token':
            logger.warning("Rejecting bypass token on authenticated endpoint")
            return None

        decoded_token = None

        # 1. Try Firebase Admin SDK verification (with 15s clock skew tolerance)
        try:
            decoded_token = firebase_auth.verify_id_token(token, clock_skew_seconds=15)
        except (ExpiredIdTokenError, RevokedIdTokenError) as token_err:
            logger.warning(f"Firebase token expired/revoked: {token_err}")
            return None
        except TypeError:
            # Fallback for test mocks that don't accept clock_skew_seconds keyword argument
            try:
                decoded_token = firebase_auth.verify_id_token(token)
            except Exception as admin_err:
                logger.debug(f"Firebase Admin verify notice: {admin_err}")
        except Exception as admin_err:
            logger.debug(f"Firebase Admin verify notice: {admin_err}")

        # 2. Fallback to Google OAuth public certificate verification
        if not decoded_token:
            try:
                from google.oauth2 import id_token
                from google.auth.transport import requests as google_requests
                project_id = (
                    os.environ.get('FIREBASE_PROJECT_ID')
                    or os.environ.get('VITE_FIREBASE_PROJECT_ID')
                    or 'food-ai-433b7'
                )
                decoded_token = id_token.verify_firebase_token(
                    token,
                    google_requests.Request(),
                    audience=project_id,
                    clock_skew_in_seconds=15,
                )
            except TypeError:
                try:
                    from google.oauth2 import id_token
                    from google.auth.transport import requests as google_requests
                    project_id = (
                        os.environ.get('FIREBASE_PROJECT_ID')
                        or os.environ.get('VITE_FIREBASE_PROJECT_ID')
                        or 'food-ai-433b7'
                    )
                    decoded_token = id_token.verify_firebase_token(
                        token,
                        google_requests.Request(),
                        audience=project_id,
                    )
                except Exception as g_err:
                    logger.warning(f"Google public key token verification notice: {g_err}")
                    return None
            except Exception as g_err:
                logger.warning(f"Google public key token verification notice: {g_err}")
                return None

        if not decoded_token:
            return None

        uid = decoded_token.get('uid') or decoded_token.get('user_id') or decoded_token.get('sub')
        if not uid:
            logger.warning("Firebase token missing UID")
            return None

        email = decoded_token.get('email') or f"{uid}@foodai.app"
        first_name = (
            decoded_token.get('name', '').split()[0]
            if decoded_token.get('name')
            else ''
        )

        # Get or create Django user safely with concurrency protection
        try:
            user = User.objects.get(username=uid)
            if email and user.email != email:
                user.email = email
                user.save(update_fields=['email'])
        except User.DoesNotExist:
            try:
                user = User.objects.create_user(
                    username=uid,
                    email=email,
                    first_name=first_name,
                )
                logger.info(f"Created new Django user for Firebase UID: {uid}")
            except Exception:
                # Concurrent request might have created user simultaneously
                user = User.objects.filter(username=uid).first()
                if not user:
                    logger.error(f"Failed to create or retrieve Django user for {uid}")
                    return None

        return user

    def get_user(self, user_id):
        """
        Retrieve user by ID
        """
        try:
            return User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return None


class FirebaseAuthentication(authentication.BaseAuthentication):
    """
    Django REST Framework authentication class.
    """

    keyword = 'Bearer'

    def __init__(self):
        self.backend = FirebaseAuthenticationBackend()

    def authenticate(self, request):
        django_request = getattr(request, '_request', request)
        token = getattr(django_request, 'firebase_token', None)
        if not token:
            auth_header = request.META.get('HTTP_AUTHORIZATION', '')
            if auth_header.startswith(self.keyword + ' '):
                token = auth_header[len(self.keyword) + 1:]
        if not token:
            return None  # No credentials -> stay anonymous

        user = self.backend.authenticate(request=django_request, token=token)
        if user is None:
            raise exceptions.AuthenticationFailed('Invalid or expired session.')
        return (user, token)

    def authenticate_header(self, request):
        return self.keyword
