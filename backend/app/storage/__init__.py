"""Storage backend factory — selects the backend from settings."""

from __future__ import annotations

from functools import lru_cache

from app.core.config import settings
from app.storage.base import StorageBackend
from app.storage.local import LocalStorage


@lru_cache
def get_storage() -> StorageBackend:
    if settings.storage_backend == "local":
        return LocalStorage(settings.storage_local_root)
    if settings.storage_backend == "s3":
        # S3-compatible backend (MinIO/S3) is wired in the production-hardening
        # phase; the interface is stable so callers won't change.
        raise NotImplementedError(
            "S3 storage backend is not yet implemented; use storage_backend=local."
        )
    raise ValueError(f"Unknown storage backend: {settings.storage_backend}")
