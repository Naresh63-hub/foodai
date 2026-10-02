import os
import time

import requests
from django.core.cache import cache


class OFFClientError(Exception):
    pass


BASE_URL = "https://world.openfoodfacts.org/api/v2/product"
FIELDS = "product_name,brands,ingredients_text,nutriments,serving_size,product_quantity,categories_tags"
# Open Food Facts asks for a descriptive UA with a real contact so they can reach us
# instead of silently blocking. Override with the OFF_USER_AGENT env var in production.
USER_AGENT = os.environ.get(
    "OFF_USER_AGENT",
    "KnowWhatYoureEating/1.0 (https://github.com/foodai; contact@foodai.app)",
)
TIMEOUT = 12
MAX_ATTEMPTS = 2
BACKOFF_BASE = 0.5
RETRY_STATUS = (429, 500, 502, 503, 504)

CACHE_HIT_TTL = 60 * 60 * 24   # 24h for products we found
CACHE_MISS_TTL = 60 * 5        # 5m negative cache so we don't hammer OFF for unknown codes
_MISS = "__off_miss__"


def _cache_key(barcode: str) -> str:
    return f"off:product:{barcode}"


def _request_with_backoff(barcode: str):
    """GET a product, retrying once on network errors / transient OFF status codes."""
    url = f"{BASE_URL}/{barcode}"
    params = {"fields": FIELDS}
    headers = {"User-Agent": USER_AGENT}

    last_error = None
    for attempt in range(MAX_ATTEMPTS):
        try:
            response = requests.get(url, params=params, headers=headers, timeout=TIMEOUT)
        except requests.RequestException as e:
            last_error = f"network error: {e}"
            time.sleep(BACKOFF_BASE * (2 ** attempt))
            continue

        if response.status_code in RETRY_STATUS:
            last_error = f"HTTP {response.status_code}"
            time.sleep(BACKOFF_BASE * (2 ** attempt))
            continue

        return response

    raise OFFClientError(f"Open Food Facts request failed after {MAX_ATTEMPTS} attempts ({last_error})")


def lookup_barcode(barcode: str) -> dict | None:
    """Resolve a barcode from Open Food Facts.

    Returns a product dict, or None for unknown/unavailable barcodes. Results (both hits
    and misses) are cached to avoid repeatedly calling OFF for the same code. Raises
    OFFClientError only when the network/API is genuinely unreachable.
    """
    barcode = (barcode or "").strip()
    if not barcode:
        return None

    key = _cache_key(barcode)
    cached = cache.get(key)
    if cached is not None:
        return None if cached == _MISS else cached

    response = _request_with_backoff(barcode)

    if response.status_code == 404:
        cache.set(key, _MISS, CACHE_MISS_TTL)
        return None

    if response.status_code != 200:
        # Non-retryable error status: don't cache, just report as not found.
        return None

    try:
        data = response.json()
    except ValueError:
        return None

    if data.get("status") != 1:
        cache.set(key, _MISS, CACHE_MISS_TTL)
        return None

    product = data.get("product")
    if product:
        cache.set(key, product, CACHE_HIT_TTL)
    return product
