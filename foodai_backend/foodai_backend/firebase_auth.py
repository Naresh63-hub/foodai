from django.contrib.auth.backends import BaseBackend
from django.contrib.auth.models import User
from django.conf import settings
from firebase_admin import auth as firebase_auth
from firebase_admin.auth import ExpiredIdTokenError, InvalidIdTokenError, RevokedIdTokenError
from rest_framework import authentication, exceptions
import logging

logger = logging.getLogger(__name__)


class FirebaseAuthenticationBackend(BaseBackend):
    """
    Custom authentication backend using Firebase tokens
    """
    
    def authenticate(self, request, token=None, **kwargs):
        """
        Authenticate user using Firebase ID token
        
        Args:
            request: The HTTP request
            token: Firebase ID token from Authorization header
            
        Returns:
            User object if authentication successful, None otherwise
        """
        # Get token from parameter or from middleware
        if not token and hasattr(request, 'firebase_token'):
            token = request.firebase_token
        
        if not token:
            return None
        
        try:
            # Verify the Firebase token
            decoded_token = firebase_auth.verify_id_token(token)
            uid = decoded_token.get('uid')
            email = decoded_token.get('email')
            
            if not uid:
                logger.warning("Firebase token missing UID")
                return None
            
            # Get or create Django user
            try:
                user = User.objects.get(username=uid)
            except User.DoesNotExist:
                # Create new user if doesn't exist
                if email:
                    user = User.objects.create_user(
                        username=uid,
                        email=email,
                        first_name=decoded_token.get('name', '').split()[0] if decoded_token.get('name') else '',
                    )
                    logger.info(f"Created new Django user for Firebase UID: {uid}")
                else:
                    logger.warning(f"Cannot create user without email for Firebase UID: {uid}")
                    return None
            
            return user
            
        except ExpiredIdTokenError:
            logger.warning("Firebase token expired")
            return None
        except InvalidIdTokenError:
            logger.warning("Invalid Firebase token")
            return None
        except RevokedIdTokenError:
            logger.warning("Firebase token revoked")
            return None
        except Exception as e:
            logger.error(f"Firebase authentication error: {e}")
            return None
    
    def get_user(self, user_id):
        """
        Retrieve user by ID
        
        Args:
            user_id: Django user ID
            
        Returns:
            User object if exists, None otherwise
        """
        try:
            return User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return None


class FirebaseAuthentication(authentication.BaseAuthentication):
    """
    Django REST Framework authentication class.

    Wraps the Django ``FirebaseAuthenticationBackend`` so DRF can verify the
    ``Authorization: Bearer <firebase id token>`` header, return a proper 401
    (with a WWW-Authenticate header) for anonymous requests, and attach the
    verified user to ``request.user``.
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
