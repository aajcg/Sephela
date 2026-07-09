"""Code Intelligence pipeline — runs analyzers, isolates failures, emits envelope.

This is the engine's public entrypoint. It runs each analyzer independently:
- success  → evidence merged under the analyzer's name, findings appended
- failure  → recorded in ``errors``; the run continues (status becomes ``partial``)

The orchestration worker (pipeline task) calls ``analyze()`` and persists the
returned Evidence Envelope. The primary consumer of the output is the GenAI
layer (Phase 7), which reads the ``code_summary`` evidence key produced by the
summarizer analyzer.
"""

from __future__ import annotations

from pathlib import Path

from sephela_code_intel.base import Analyzer, AnalysisContext
from sephela_code_intel.envelope import (
    ENVELOPE_VERSION,
    AnalyzerError,
    EngineInfo,
    EvidenceEnvelope,
    Status,
)
from sephela_code_intel.analyzers import default_analyzers

ENGINE_NAME = "code_intel"
ENGINE_VERSION = "1.0.0"


def analyze(
    static_evidence: dict[str, object],
    *,
    job_id: str | None = None,
    apk_sha256: str | None = None,
    artifact_dir: str | Path | None = None,
    analyzers: list[Analyzer] | None = None,
) -> EvidenceEnvelope:
    """Run the code-intelligence analyzer chain over static analysis output.

    Args:
        static_evidence: The ``evidence`` dict from the static engine's
            Evidence Envelope. Contains smali class lists, strings,
            permissions, components, etc.
        job_id: The analysis job identifier (passed through to the envelope).
        apk_sha256: SHA-256 of the APK (passed through to the envelope).
        artifact_dir: Path to the JADX decompiled source tree (optional).
            When present, analyzers can read the actual Java source files
            for deeper analysis (API usage, call graphs, control flow).
        analyzers: Custom analyzer chain (defaults to the standard chain).

    Returns:
        An Evidence Envelope with code-intelligence evidence. The key output
        is ``evidence["summarizer"]["code_summary"]`` — a token-optimized
        structured summary for the GenAI layer.

    Never raises for analyzer-level problems — those are captured as partial
    failures. Only a completely invalid input will propagate.
    """
    art_path = Path(artifact_dir) if artifact_dir else None
    ctx = AnalysisContext(
        static_evidence=static_evidence,
        artifact_dir=art_path,
        apk_sha256=apk_sha256,
    )
    chain = analyzers if analyzers is not None else default_analyzers()

    envelope = EvidenceEnvelope(
        envelope_version=ENVELOPE_VERSION,
        job_id=job_id,
        apk_sha256=apk_sha256,
        engine=EngineInfo(name=ENGINE_NAME, version=ENGINE_VERSION),
        status=Status.ok,
    )

    ran = 0
    for analyzer in chain:
        try:
            result = analyzer.analyze(ctx)
        except Exception as exc:  # noqa: BLE001 — isolation is the whole point
            envelope.errors.append(
                AnalyzerError(
                    analyzer=analyzer.name,
                    message=f"{type(exc).__name__}: {exc}",
                )
            )
            continue
        ran += 1
        envelope.evidence[analyzer.name] = result.evidence
        ctx.shared[analyzer.name] = result.evidence  # type: ignore[assignment]
        envelope.findings.extend(result.findings)

    if envelope.errors:
        envelope.status = Status.failed if ran == 0 else Status.partial

    return envelope
