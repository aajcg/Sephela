"""Extractor framework — the contract every static extractor implements.

Each extractor is an INDEPENDENT module: it declares what it needs, runs in
isolation, and returns a result. The pipeline (pipeline.py) catches any
exception so one extractor's failure degrades the run to ``partial`` rather
than crashing it (docs requirement: every extractor is independent).
"""

from __future__ import annotations

import functools
import zipfile
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from pathlib import Path

from sephela_static.envelope import Finding


@dataclass
class ExtractionContext:
    """Everything an extractor may need, computed once and shared.

    Lazily exposes the raw bytes and a parsed Androguard APK object so tool-free
    extractors never pay for tooling and tool-based ones share a single parse.
    """

    apk_path: Path
    #: evidence from already-run extractors, keyed by extractor name; lets a
    #: dependent extractor (e.g. urls) read an earlier one's output (strings)
    #: while keeping the uniform ``extract(ctx)`` signature.
    shared: dict[str, dict] = field(default_factory=dict)
    _apk_obj: object | None = field(default=None, repr=False)
    _bytes: bytes | None = field(default=None, repr=False)

    @property
    def data(self) -> bytes:
        if self._bytes is None:
            self._bytes = self.apk_path.read_bytes()
        return self._bytes

    @functools.cached_property
    def zip(self) -> zipfile.ZipFile:
        return zipfile.ZipFile(self.apk_path)

    def androguard_apk(self) -> object:
        """Parse (once) and return an androguard ``APK``. Raises if unavailable."""
        if self._apk_obj is None:
            from androguard.core.apk import APK  # type: ignore[import-not-found]

            self._apk_obj = APK(str(self.apk_path))
        return self._apk_obj


@dataclass
class ExtractorResult:
    """What an extractor returns: its evidence blob + any normalized findings."""

    evidence: dict[str, object] = field(default_factory=dict)
    findings: list[Finding] = field(default_factory=list)


class Extractor(ABC):
    """Base class for all static extractors."""

    #: stable identifier used as the evidence key + provenance name
    name: str = "extractor"
    #: whether this extractor needs external tooling (androguard/jadx/apkid)
    requires_tools: bool = False

    @abstractmethod
    def extract(self, ctx: ExtractionContext) -> ExtractorResult:
        """Run the extraction. May raise — the pipeline isolates failures."""
