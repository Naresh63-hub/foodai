"""
Production settings.

DEBUG is driven strictly by the environment (must be False in production).
A real ALLOWED_HOSTS list and CORS origins must be supplied via environment
variables so the app is not deployed with wildcard/debug defaults.
"""
from .base import *  # noqa: F401,F403
from django.core.exceptions import ImproperlyConfigured

# Never inherit the dev default; force an explicit, safe posture.
DEBUG = False

# Fail fast if the deployment forgot to set a real, unique secret.
if SECRET_KEY == 'django-insecure-dev-key-change-me':  # noqa: F405
    raise ImproperlyConfigured(
        'SECRET_KEY must be set to a unique value in production (refusing the dev default).'
    )

# In production ALLOWED_HOSTS must be provided explicitly via the environment.
# Fail fast rather than silently running with a wildcard.
ALLOWED_HOSTS = env.list('ALLOWED_HOSTS')  # noqa: F405

# Security hardening for the deployed backend.
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'

# CORS: never allow a wildcard in production. Origins must be listed explicitly.
CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOWED_ORIGINS = env.list('CORS_ALLOWED_ORIGINS')  # fail fast if unset

# Transport security: redirect HTTP->HTTPS and enable HSTS (1 year).
SECURE_SSL_REDIRECT = env.bool('SECURE_SSL_REDIRECT', default=True)
SECURE_HSTS_SECONDS = env.int('SECURE_HSTS_SECONDS', default=31536000)
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SESSION_COOKIE_HTTPONLY = True
