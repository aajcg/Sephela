"""Tests for the local storage backend + content-addressed keys."""

from __future__ import annotations

import pytest

from app.storage.base import StorageBackend
from app.storage.local import LocalStorage


def test_sample_key_is_sharded() -> None:
    sha = "ab" + "c" * 62
    key = StorageBackend.sample_key(sha)
    assert key == f"samples/ab/cc/{sha}.apk"


@pytest.mark.asyncio
async def test_local_roundtrip(tmp_path) -> None:
    store = LocalStorage(tmp_path)
    key = "samples/aa/bb/deadbeef.apk"
    assert not await store.exists(key)

    uri = await store.save(key, b"hello-apk")
    assert uri.startswith("file://")
    assert await store.exists(key)
    assert await store.load(key) == b"hello-apk"

    await store.delete(key)
    assert not await store.exists(key)
    await store.delete(key)  # idempotent
