"""Analyzer framework — the contract every code-intelligence analyzer implements.

Each analyzer is an INDEPENDENT module: it declares what it needs, runs in
isolation, and returns a result. The pipeline (pipeline.py) catches any
exception so one analyzer's failure degrades the run to ``partial`` rather
than crashing it (same isolation guarantee as the static engine).

Unlike the static engine's extractors which work on raw APK bytes, analyzers
operate on already-processed data: the static engine's Evidence Envelope
output and/or decompiled Java source files on disk.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from pathlib import Path

from sephela_code_intel.envelope import Finding


@dataclass
class AnalysisContext:
    """Everything an analyzer may need, computed once and shared.

    Lazily loads decompiled source files from disk when requested.
    ``static_evidence`` carries the raw evidence dict from the static engine's
    envelope so analyzers can read class lists, permissions, strings, etc.
    """

    #: Evidence dict from the static engine's Evidence Envelope
    static_evidence: dict[str, object] = field(default_factory=dict)
    #: Path to the JADX decompiled source tree (may not exist)
    artifact_dir: Path | None = None
    #: SHA-256 of the APK (passed through from the static envelope)
    apk_sha256: str | None = None
    #: Results from already-run analyzers, keyed by analyzer name.
    #: Lets dependent analyzers read earlier output while keeping the uniform
    #: ``analyze(ctx)`` signature.
    shared: dict[str, dict[str, object]] = field(default_factory=dict)
    #: Cached mapping of relative-path → Java source content (developer files)
    _source_cache: dict[str, str] | None = field(default=None, repr=False)

    @property
    def source_files(self) -> dict[str, str]:
        """Load all .java files from the artifact dir into a {path: content} dict.

        Cached on first access. Returns empty dict if artifact_dir is absent.
        """
        if self._source_cache is not None:
            return self._source_cache

        cache: dict[str, str] = {}
        if self.artifact_dir and self.artifact_dir.exists():
            sources_dir = self.artifact_dir / "sources"
            base = sources_dir if sources_dir.exists() else self.artifact_dir
            for java_file in base.rglob("*.java"):
                try:
                    content = java_file.read_text(encoding="utf-8", errors="replace")
                    rel = str(java_file.relative_to(base))
                    cache[rel] = content
                except OSError:
                    continue
        self._source_cache = cache
        return cache

    def get_smali_classes(self) -> list[str]:
        """Return the smali class list from the static envelope, if present."""
        smali = self.static_evidence.get("smali", {})
        if isinstance(smali, dict):
            classes = smali.get("classes", [])
            return classes if isinstance(classes, list) else []
        return []

    def get_permissions(self) -> list[str]:
        """Return the permission list from the static envelope, if present."""
        perms = self.static_evidence.get("permissions", {})
        if isinstance(perms, dict):
            perm_list = perms.get("permissions", [])
            return perm_list if isinstance(perm_list, list) else []
        return []


@dataclass
class AnalyzerResult:
    """What an analyzer returns: its evidence blob + any normalized findings."""

    evidence: dict[str, object] = field(default_factory=dict)
    findings: list[Finding] = field(default_factory=list)


class Analyzer(ABC):
    """Base class for all code-intelligence analyzers."""

    #: stable identifier used as the evidence key + provenance name
    name: str = "analyzer"

    @abstractmethod
    def analyze(self, ctx: AnalysisContext) -> AnalyzerResult:
        """Run the analysis. May raise — the pipeline isolates failures."""
