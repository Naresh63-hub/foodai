import os
import firebase_admin
from firebase_admin import credentials, auth
from django.conf import settings

# Initialize Firebase Admin SDK
def initialize_firebase():
    """Initialize Firebase Admin SDK for backend authentication"""
    if not firebase_admin._apps:
        # Try to get the service account key path from environment
        service_account_path = os.environ.get('FIREBASE_ADMIN_SDK_KEY_PATH')
        
        if service_account_path and os.path.exists(service_account_path):
            cred = credentials.Certificate(service_account_path)
        else:
            # For development, you can use a different approach
            # In production, always use service account key
            raise ValueError(
                "Firebase Admin SDK service account key not found. "
                "Set FIREBASE_ADMIN_SDK_KEY_PATH environment variable."
            )
        
        firebase_admin.initialize_app(cred)

# Initialize Firebase on module import
try:
    initialize_firebase()
except Exception as e:
    import logging
    logger = logging.getLogger(__name__)
    logger.warning(f"Firebase Admin SDK initialization failed: {e}")


def verify_firebase_token(id_token: str) -> dict:
    """
    Verify Firebase ID token and return decoded token
    
    Args:
        id_token: Firebase ID token from client
        
    Returns:
        Decoded token payload
        
    Raises:
        ValueError: If token is invalid
        firebase_admin.auth.ExpiredIdTokenError: If token is expired
        firebase_admin.auth.InvalidIdTokenError: If token is invalid
        firebase_admin.auth.RevokedIdTokenError: If token is revoked
    """
    decoded_token = auth.verify_id_token(id_token)
    return decoded_token


def get_firebase_user(uid: str) -> auth.UserRecord:
    """
    Get Firebase user record by UID
    
    Args:
        uid: Firebase user UID
        
    Returns:
        Firebase user record
    """
    return auth.get_user(uid)


def create_firebase_user(email: str, password: str, display_name: str = None) -> auth.UserRecord:
    """
    Create a new Firebase user
    
    Args:
        email: User email
        password: User password
        display_name: Optional display name
        
    Returns:
        Created Firebase user record
    """
    user = auth.create_user(
        email=email,
        password=password,
        display_name=display_name
    )
    return user
