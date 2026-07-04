"""Static Analysis pipeline — runs extractors, isolates failures, emits envelope.

This is the engine's public entrypoint. It runs each extractor independently:
- success  → evidence merged under the extractor's name, findings appended
- failure  → recorded in ``errors``; the run continues (status becomes ``partial``)

The orchestration worker (Phase 4) calls ``analyze()`` and persists the returned
Evidence Envelope.
"""

from __future__ import annotations

from pathlib import Path

from sephela_static.base import Extractor, ExtractionContext
from sephela_static.envelope import (
    ENVELOPE_VERSION,
    EngineInfo,
    EvidenceEnvelope,
    ExtractorError,
    Status,
)
from sephela_static.extractors import default_extractors

ENGINE_NAME = "static"
ENGINE_VERSION = "1.0.0"


def analyze(
    apk_path: str | Path,
    *,
    job_id: str | None = None,
    extractors: list[Extractor] | None = None,
) -> EvidenceEnvelope:
    """Run the static-analysis extractor chain over an APK.

    Never raises for extractor-level problems — those are captured as partial
    failures. Only a completely unreadable input path will propagate.
    """
    path = Path(apk_path)
    ctx = ExtractionContext(apk_path=path)
    chain = extractors if extractors is not None else default_extractors()

    envelope = EvidenceEnvelope(
        envelope_version=ENVELOPE_VERSION,
        job_id=job_id,
        engine=EngineInfo(name=ENGINE_NAME, version=ENGINE_VERSION),
        status=Status.ok,
    )

    ran = 0
    for extractor in chain:
        try:
            result = extractor.extract(ctx)
        except Exception as exc:  # noqa: BLE001 — isolation is the whole point
            envelope.errors.append(
                ExtractorError(extractor=extractor.name, message=f"{type(exc).__name__}: {exc}")
            )
            continue
        ran += 1
        envelope.evidence[extractor.name] = result.evidence
        ctx.shared[extractor.name] = result.evidence
        envelope.findings.extend(result.findings)

    # Surface the SHA-256 at the top level for indexing/caching.
    hashes = envelope.evidence.get("hashes")
    if isinstance(hashes, dict):
        envelope.apk_sha256 = hashes.get("sha256")

    if envelope.errors:
        envelope.status = Status.failed if ran == 0 else Status.partial
    return envelope
