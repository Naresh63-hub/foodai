import os
import logging
import firebase_admin
from firebase_admin import credentials, auth
from django.conf import settings

logger = logging.getLogger(__name__)


def initialize_firebase():
    """Initialize Firebase Admin SDK for backend authentication with multiple candidate fallbacks"""
    if firebase_admin._apps:
        return firebase_admin._apps.get('[DEFAULT]')

    # 1. Direct JSON content in environment variable
    json_content = os.environ.get('FIREBASE_SERVICE_ACCOUNT_JSON') or os.environ.get('FIREBASE_ADMIN_CREDENTIALS')
    if json_content:
        import json
        try:
            cert_dict = json.loads(json_content)
            cred = credentials.Certificate(cert_dict)
            logger.info("Initialized Firebase Admin from FIREBASE_SERVICE_ACCOUNT_JSON")
            return firebase_admin.initialize_app(cred)
        except Exception as e:
            logger.warning(f"Could not initialize Firebase Admin from FIREBASE_SERVICE_ACCOUNT_JSON: {e}")

    # 2. File path from env var or standard Render secret locations
    env_path = os.environ.get('FIREBASE_ADMIN_SDK_KEY_PATH')
    base_dir = str(getattr(settings, 'BASE_DIR', ''))
    repo_dir = str(getattr(settings, 'REPO_DIR', ''))

    candidate_paths = [
        env_path,
        '/etc/secrets/firebase-service-account.json',
        '/etc/secrets/' + (os.path.basename(env_path) if env_path else 'firebase-service-account.json'),
        os.path.join(base_dir, 'firebase-service-account.json') if base_dir else None,
        os.path.join(repo_dir, 'firebase-service-account.json') if repo_dir else None,
        'firebase-service-account.json',
    ]

    for p in candidate_paths:
        if p and os.path.isfile(p):
            try:
                cred = credentials.Certificate(p)
                logger.info(f"Initialized Firebase Admin with key file: {p}")
                return firebase_admin.initialize_app(cred)
            except Exception as e:
                logger.warning(f"Failed to initialize Firebase Admin with {p}: {e}")

    # 3. Fallback: Initialize default app with Project ID (allows Google Auth public key token verification)
    project_id = (
        os.environ.get('FIREBASE_PROJECT_ID')
        or os.environ.get('VITE_FIREBASE_PROJECT_ID')
        or 'food-ai-433b7'
    )
    try:
        logger.info(f"Initializing Firebase Admin with projectId: {project_id}")
        return firebase_admin.initialize_app(options={'projectId': project_id})
    except Exception as e:
        logger.warning(f"Fallback Firebase Admin initialization: {e}")
        try:
            return firebase_admin.initialize_app()
        except Exception:
            return None


# Initialize Firebase on module import
try:
    initialize_firebase()
except Exception as e:
    logger.warning(f"Firebase Admin SDK initialization notice: {e}")


def verify_firebase_token(id_token: str) -> dict:
    """
    Verify Firebase ID token and return decoded token
    """
    decoded_token = auth.verify_id_token(id_token)
    return decoded_token


def get_firebase_user(uid: str) -> auth.UserRecord:
    """
    Get Firebase user record by UID
    """
    return auth.get_user(uid)


def create_firebase_user(email: str, password: str, display_name: str = None) -> auth.UserRecord:
    """
    Create a new Firebase user
    """
    user = auth.create_user(
        email=email,
        password=password,
        display_name=display_name
    )
    return user
