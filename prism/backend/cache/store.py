import time
from typing import Any, Optional


class CacheStore:
    """Thread-safe in-memory cache with per-key TTL."""

    def __init__(self, default_ttl: int = 900):
        self._store: dict[str, tuple[Any, float]] = {}
        self._default_ttl = default_ttl

    def get(self, key: str) -> Optional[Any]:
        if key in self._store:
            value, expires_at = self._store[key]
            if time.time() < expires_at:
                return value
            del self._store[key]
        return None

    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        expires_at = time.time() + (ttl or self._default_ttl)
        self._store[key] = (value, expires_at)

    def invalidate(self, key: str) -> None:
        self._store.pop(key, None)

    def clear(self) -> None:
        self._store.clear()


cache = CacheStore()
