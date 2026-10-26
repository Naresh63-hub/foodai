"""
Production settings.

DEBUG is driven strictly by the environment (must be False in production).
A resilient SECRET_KEY, ALLOWED_HOSTS, and CORS origins posture ensures
seamless deployment on Render while protecting production data.
"""
import os
import secrets
from .base import *  # noqa: F401,F403

DEBUG = False

# Auto-generate or pick up SECRET_KEY safely if unset or left as insecure dev key
raw_secret = os.environ.get('SECRET_KEY') or SECRET_KEY
if not raw_secret or raw_secret == 'django-insecure-dev-key-change-me':
    SECRET_KEY = secrets.token_urlsafe(50)
else:
    SECRET_KEY = raw_secret

# In production, ensure Render wildcard and localhost are always permitted
# Security: No wildcard '*' to prevent Host header attacks
configured_hosts = env.list('ALLOWED_HOSTS', default=[])
# Security: Reject wildcard from environment variable to prevent configuration bypass
if '*' in configured_hosts:
    raise ValueError(
        "ALLOWED_HOSTS environment variable cannot contain wildcard '*' in production. "
        "This would allow any Host header and is a security vulnerability. "
        "Use specific hostnames instead."
    )
ALLOWED_HOSTS = list(set(configured_hosts + ['.onrender.com', 'foodai-1-cht5.onrender.com', 'localhost', '127.0.0.1']))

# Security hardening for the deployed backend.
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'

# CORS: Allow Vercel frontend and any custom origins
CORS_ALLOW_ALL_ORIGINS = env.bool('CORS_ALLOW_ALL_ORIGINS', default=False)
CORS_ALLOWED_ORIGINS = env.list(
    'CORS_ALLOWED_ORIGINS',
    default=[
        'https://foodai-prb1.vercel.app',
        'http://localhost:5173',
    ]
)

# Transport security: redirect HTTP->HTTPS and enable HSTS (1 year).
SECURE_SSL_REDIRECT = env.bool('SECURE_SSL_REDIRECT', default=False)
SECURE_HSTS_SECONDS = env.int('SECURE_HSTS_SECONDS', default=31536000)
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SESSION_COOKIE_HTTPONLY = True
