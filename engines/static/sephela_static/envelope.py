"""Evidence Envelope — the universal engine contract.

Every Sephela engine (static, dynamic, threat-intel, code-intel) emits this same
wrapper so the orchestration pipeline and AI layer treat all evidence uniformly
(docs/architecture/03-communication.md). This module is the static engine's copy;
it will graduate into the shared `libs/sephela_evidence` package.

Guarantees:
- ``envelope_version`` is additive-versioned.
- An extractor failure is *partial* (recorded in ``errors``), never fatal.
- Findings carry provenance + framework mappings so scoring/reports are auditable.
"""

from __future__ import annotations

from enum import Enum

from pydantic import BaseModel, Field

ENVELOPE_VERSION = "1.0"


class Severity(str, Enum):
    info = "info"
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


class FindingType(str, Enum):
    permission = "permission"
    api = "api"
    url = "url"
    ip = "ip"
    cert = "cert"
    behavior = "behavior"
    signature = "signature"
    obfuscation = "obfuscation"


class Status(str, Enum):
    ok = "ok"
    partial = "partial"
    failed = "failed"


class EngineInfo(BaseModel):
    name: str
    version: str


class Provenance(BaseModel):
    extractor: str
    locator: str | None = None  # file/line/class where the evidence was found


class Mappings(BaseModel):
    mitre: list[str] = Field(default_factory=list)
    owasp_mobile: list[str] = Field(default_factory=list)


class Finding(BaseModel):
    id: str
    type: FindingType
    severity: Severity = Severity.info
    confidence: float = 0.5
    detail: str
    provenance: Provenance
    mappings: Mappings = Field(default_factory=Mappings)


class ExtractorError(BaseModel):
    extractor: str
    message: str


class EvidenceEnvelope(BaseModel):
    envelope_version: str = ENVELOPE_VERSION
    job_id: str | None = None
    apk_sha256: str | None = None
    engine: EngineInfo
    produced_at: str | None = None  # stamped by the caller (ISO-8601)
    status: Status = Status.ok
    # engine-specific structured evidence, keyed by extractor name
    evidence: dict[str, object] = Field(default_factory=dict)
    findings: list[Finding] = Field(default_factory=list)
    errors: list[ExtractorError] = Field(default_factory=list)
