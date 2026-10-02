from .base import *  # noqa: F401,F403

DEBUG = True

# Local/test always use readable console logs, even if base defaulted to JSON.
LOGGING['root']['handlers'] = ['console']  # noqa: E405
LOGGING['loggers']['django']['handlers'] = ['console']  # noqa: E405
LOGGING['loggers']['foodai_backend']['handlers'] = ['console']  # noqa: E405

# Allow Django test client and common local hosts.
ALLOWED_HOSTS = ['*']
