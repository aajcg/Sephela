"""Obfuscation + packer detection.

Obfuscation: tool-free heuristics over class/method names (short/random names,
high entropy) computed from the ``smali`` extractor's class list when present.
Packers: APKID (YARA-based) when installed; degrades if not.
"""

from __future__ import annotations

import re

from sephela_static.base import Extractor, ExtractionContext, ExtractorResult
from sephela_static.envelope import (
    Finding,
    FindingType,
    Mappings,
    Provenance,
    Severity,
)

_SHORT_NAME = re.compile(r"L(?:[a-z]/)*[a-z]{1,2};$")  # e.g. La/b/c;


class ObfuscationExtractor(Extractor):
    """Heuristic obfuscation score from decompiled class names."""

    name = "obfuscation"

    def extract(self, ctx: ExtractionContext) -> ExtractorResult:
        classes: list[str] = ctx.shared.get("smali", {}).get("classes", [])
        if not classes:
            return ExtractorResult(evidence={"analyzed": 0, "obfuscated_ratio": 0.0})

        short = sum(1 for c in classes if _SHORT_NAME.search(c))
        ratio = short / len(classes)
        findings: list[Finding] = []
        if ratio > 0.4:
            findings.append(
                Finding(
                    id="obfuscation:name-mangling",
                    type=FindingType.obfuscation,
                    severity=Severity.medium,
                    confidence=min(0.95, ratio),
                    detail=f"{ratio:.0%} of classes use mangled/short names (likely obfuscated).",
                    provenance=Provenance(extractor=self.name),
                    mappings=Mappings(mitre=["T1027"], owasp_mobile=["M9"]),
                )
            )
        return ExtractorResult(
            evidence={
                "analyzed": len(classes),
                "short_named_classes": short,
                "obfuscated_ratio": round(ratio, 3),
                "likely_obfuscated": ratio > 0.4,
            },
            findings=findings,
        )


class PackerExtractor(Extractor):
    """Packer/protector detection via APKID (YARA rules)."""

    name = "packers"
    requires_tools = True

    def extract(self, ctx: ExtractionContext) -> ExtractorResult:
        try:
            from apkid.apkid import Scanner, Options  # type: ignore[import-not-found]
            from apkid.rules import RulesManager  # type: ignore[import-not-found]
        except ImportError as exc:  # noqa: TRY003
            raise RuntimeError("APKID not installed; add it to the engine image.") from exc

        options = Options(timeout=120, verbose=False, entry_max_scan_size=0)
        rules = RulesManager().load()
        scanner = Scanner(rules, options)
        results = scanner.scan_file(str(ctx.apk_path)) or {}

        matches: list[str] = []
        findings: list[Finding] = []
        for _entry, tags in (results.get("files", {}) or {}).items():
            for category, values in (tags or {}).items():
                if category in ("packer", "protector", "anti_vm", "anti_debug"):
                    for v in values:
                        matches.append(f"{category}:{v}")
                        findings.append(
                            Finding(
                                id=f"packer:{category}:{v}",
                                type=FindingType.signature,
                                severity=Severity.high if category == "packer" else Severity.medium,
                                confidence=0.85,
                                detail=f"APKID detected {category}: {v}",
                                provenance=Provenance(extractor=self.name),
                                mappings=Mappings(mitre=["T1406"], owasp_mobile=["M9"]),
                            )
                        )
        return ExtractorResult(evidence={"matches": matches}, findings=findings)
