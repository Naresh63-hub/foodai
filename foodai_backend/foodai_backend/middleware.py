import logging
from django.utils.deprecation import MiddlewareMixin
from firebase_admin import auth as firebase_auth
from firebase_admin.auth import ExpiredIdTokenError, InvalidIdTokenError

logger = logging.getLogger(__name__)


class FirebaseTokenMiddleware(MiddlewareMixin):
    """
    Middleware to extract Firebase token from Authorization header
    and attach it to the request for authentication backend
    """
    
    def process_request(self, request):
        """
        Extract Firebase token from Authorization header
        
        Expected format: Authorization: Bearer <firebase_token>
        """
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        
        if auth_header.startswith('Bearer '):
            token = auth_header[7:]  # Remove 'Bearer ' prefix
            request.firebase_token = token
        else:
            request.firebase_token = None
        
        return None
