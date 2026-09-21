import requests


class OFFClientError(Exception):
    pass


BASE_URL = "https://world.openfoodfacts.org/api/v2/product"
FIELDS = "product_name,brands,ingredients_text,nutriments,serving_size,product_quantity,categories_tags"
USER_AGENT = "KnowWhatYoureEating/1.0 (dev@example.com)"
TIMEOUT = 12


def lookup_barcode(barcode: str) -> dict | None:
    url = f"{BASE_URL}/{barcode}"
    params = {"fields": FIELDS}
    headers = {"User-Agent": USER_AGENT}
    try:
        response = requests.get(url, params=params, headers=headers, timeout=TIMEOUT)
    except requests.RequestException as e:
        raise OFFClientError(f"Network error: {e}") from e

    if response.status_code == 404:
        return None

    if response.status_code != 200:
        return None

    try:
        data = response.json()
    except ValueError:
        return None

    if data.get("status") != 1:
        return None

    return data.get("product")
