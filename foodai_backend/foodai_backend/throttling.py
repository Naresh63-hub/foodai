from rest_framework.throttling import SimpleRateThrottle


class RoleRateThrottle(SimpleRateThrottle):
    """Split rate limiting: per-IP for anonymous callers, per-user-id for authenticated.

    The bucket is chosen from the view's ``throttle_scope`` attribute and resolved
    against the ``<scope>_anon`` / ``<scope>_user`` keys configured in
    ``REST_FRAMEWORK['DEFAULT_THROTTLE_RATES']``. A missing or ``"None"`` rate
    disables throttling for that role.

    Requires the Django cache (defaults to LocMemCache, which is per-process; use a
    shared Redis cache when running more than one web worker).
    """

    default_scope = 'scan'

    def __init__(self):
        # Resolve the rate per-request in get_cache_key(); skip SimpleRateThrottle's
        # eager get_rate(), which assumes one static scope. Any non-None string here
        # just gets past the early `self.rate is None` short-circuit in allow_request.
        self.rate = 'unset'
        self.num_requests, self.duration = None, None

    def get_cache_key(self, request, view):
        scope = getattr(view, 'throttle_scope', self.default_scope)
        if request.user and request.user.is_authenticated:
            ident = request.user.pk
            rate = self.THROTTLE_RATES.get(f'{scope}_user', 'None')
        else:
            ident = self.get_ident(request)
            rate = self.THROTTLE_RATES.get(f'{scope}_anon', 'None')

        if not rate or rate.lower() == 'none':
            self.rate = None
            return None

        self.rate = rate
        self.num_requests, self.duration = self.parse_rate(rate)
        return self.cache_format % {'scope': scope, 'ident': ident}
