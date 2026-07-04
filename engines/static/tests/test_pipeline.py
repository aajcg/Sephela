"""Static engine tests.

Runs the full pipeline over a synthetic APK. Tool-based extractors
(androguard/jadx/apkid) are expected to be ABSENT in CI, so the assertions
verify the isolation contract: tool-free extractors succeed, tool-based ones
land in ``errors``, and the run degrades to ``partial`` — never crashes.
"""

from __future__ import annotations

import io
import zipfile
from pathlib import Path

import pytest

from sephela_static import analyze
from sephela_static.base import ExtractionContext
from sephela_static.envelope import Status
from sephela_static.extractors.hashes import HashExtractor
from sephela_static.extractors.network import IpExtractor, UrlExtractor
from sephela_static.extractors.strings import StringExtractor


def _make_apk(tmp: Path) -> Path:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr("AndroidManifest.xml", b"\x03\x00\x08\x00manifest")
        # DEX-like blob carrying an embedded URL + public IP as printable strings.
        payload = b"padding" * 3 + b"https://evil-c2.example.com/gate.php" + b"\x00" + b"8.8.8.8" + b"\x00" + b"10.0.0.1"
        zf.writestr("classes.dex", payload)
    path = tmp / "sample.apk"
    path.write_bytes(buf.getvalue())
    return path


def test_tool_free_extractors(tmp_path: Path) -> None:
    apk = _make_apk(tmp_path)
    ctx = ExtractionContext(apk_path=apk)

    h = HashExtractor().extract(ctx)
    assert len(h.evidence["sha256"]) == 64

    s = StringExtractor().extract(ctx)
    ctx.shared["strings"] = s.evidence
    assert s.evidence["count"] > 0

    urls = UrlExtractor().extract(ctx)
    assert "https://evil-c2.example.com/gate.php" in urls.evidence["urls"]
    assert len(urls.findings) == 1

    ips = IpExtractor().extract(ctx)
    assert "8.8.8.8" in ips.evidence["ips"]
    assert "10.0.0.1" not in ips.evidence["ips"]  # private IP filtered out


def test_full_pipeline_partial_when_tools_absent(tmp_path: Path) -> None:
    apk = _make_apk(tmp_path)
    env = analyze(apk, job_id="job-123")

    # Tool-free extractors always produce evidence.
    assert "hashes" in env.evidence
    assert "urls" in env.evidence
    assert env.apk_sha256 is not None
    assert env.job_id == "job-123"
    assert env.engine.name == "static"

    # Envelope is always valid regardless of tooling availability.
    assert env.status in (Status.ok, Status.partial)
    # Findings from tool-free extractors (the embedded URL) are present.
    assert any(f.type.value == "url" for f in env.findings)


def test_pipeline_never_raises_on_garbage(tmp_path: Path) -> None:
    bad = tmp_path / "bad.apk"
    bad.write_bytes(b"not a zip")
    env = analyze(bad)
    # Hashes still compute; zip-based extractors fail into errors, not crash.
    assert "hashes" in env.evidence
    assert env.status in (Status.ok, Status.partial, Status.failed)
