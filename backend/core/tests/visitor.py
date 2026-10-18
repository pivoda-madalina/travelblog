"""Shared check that visitors cannot change anything through the API (BR-14).

`api_urls()` walks the URL configuration and returns every endpoint under /api/, so a new
endpoint is checked as soon as it is routed; nothing has to be registered by hand. The only
writes a visitor may send are listed in `VISITOR_WRITES_ALLOWED`.
"""

from django.urls import URLPattern, URLResolver, get_resolver, reverse
from rest_framework.test import APIClient

WRITE_METHODS = ("post", "put", "patch", "delete")

# Signing in is the one thing a visitor is meant to do; signing out without a session is harmless.
VISITOR_WRITES_ALLOWED = {"auth-login", "auth-logout"}

# 403: refused by a permission. 405: the endpoint does not accept that method at all.
REFUSED = {403, 405}


def _walk(patterns, namespace=""):
    for pattern in patterns:
        if isinstance(pattern, URLResolver):
            inner = f"{namespace}{pattern.namespace}:" if pattern.namespace else namespace
            yield from _walk(pattern.url_patterns, inner)
        elif isinstance(pattern, URLPattern):
            yield namespace, pattern


def api_urls() -> dict[str, str]:
    """Every named endpoint under /api/, as {url name: url}, with 1 for each path parameter.

    Permissions are checked before any object is looked up, so the id does not need to exist.
    """
    urls = {}
    for namespace, pattern in _walk(get_resolver().url_patterns):
        if pattern.name is None:
            continue
        kwargs = {name: "1" for name in pattern.pattern.regex.groupindex}
        if "format" in kwargs:
            continue  # The DRF format suffix variants point at the same views.
        url = reverse(f"{namespace}{pattern.name}", kwargs=kwargs)
        if url.startswith("/api/"):
            urls[f"{namespace}{pattern.name}"] = url
    return urls


def visitor_write_responses(url: str) -> dict[str, int]:
    """The status code of each write method sent to `url` by a visitor."""
    client = APIClient()
    return {
        method: getattr(client, method)(url, {}, format="json").status_code
        for method in WRITE_METHODS
    }
