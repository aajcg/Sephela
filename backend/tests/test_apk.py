"""Tests for APK validation + hashing (Phase 4)."""

from __future__ import annotations

import hashlib
import io
import zipfile

import pytest

from app.core.exceptions import ValidationAppError
from app.services.apk import compute_hashes, validate_apk


def _make_apk(with_manifest: bool = True) -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        if with_manifest:
            zf.writestr("AndroidManifest.xml", b"\x03\x00\x08\x00dummy")
        zf.writestr("classes.dex", b"dex-bytes")
    return buf.getvalue()


def test_valid_apk_passes() -> None:
    validate_apk(_make_apk(), filename="app.apk")  # should not raise


def test_empty_file_rejected() -> None:
    with pytest.raises(ValidationAppError):
        validate_apk(b"")


def test_non_zip_rejected() -> None:
    with pytest.raises(ValidationAppError):
        validate_apk(b"not a zip file at all")


def test_zip_without_manifest_rejected() -> None:
    with pytest.raises(ValidationAppError):
        validate_apk(_make_apk(with_manifest=False))


def test_hashes_match_hashlib() -> None:
    data = _make_apk()
    h = compute_hashes(data)
    assert h.sha256 == hashlib.sha256(data).hexdigest()
    assert h.sha1 == hashlib.sha1(data).hexdigest()
    assert h.md5 == hashlib.md5(data).hexdigest()
    assert h.size == len(data)
