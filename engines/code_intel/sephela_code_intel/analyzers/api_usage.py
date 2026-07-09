"""Suspicious API usage scanner — detects dangerous Android API calls.

Scans developer-authored Java source files for API call patterns that are
commonly abused by banking trojans and other Android malware. Each match
produces a Finding with severity, confidence, MITRE ATT&CK + OWASP Mobile
mappings, and source-file provenance.

This analyzer reads the class_filter's developer source list (via shared
evidence) so it only scans code the APK author wrote, not library code.
"""

from __future__ import annotations

import re

from sephela_code_intel.base import Analyzer, AnalysisContext, AnalyzerResult
from sephela_code_intel.constants import DANGEROUS_API_CATEGORIES
from sephela_code_intel.envelope import (
    Finding,
    FindingType,
    Mappings,
    Provenance,
    Severity,
)


class ApiUsageAnalyzer(Analyzer):
    """Scan developer source files for dangerous Android API usage."""

    name = "api_usage"

    def analyze(self, ctx: AnalysisContext) -> AnalyzerResult:
        # Use the class filter's developer file list if available; otherwise
        # scan all source files (graceful degradation if class_filter failed).
        dev_paths: list[str] | None = None
        class_filter_ev = ctx.shared.get("class_filter", {})
        if isinstance(class_filter_ev, dict):
            dev_paths = class_filter_ev.get("developer_source_paths")  # type: ignore[assignment]

        sources = ctx.source_files
        if dev_paths is not None:
            sources = {p: sources[p] for p in dev_paths if p in sources}

        findings: list[Finding] = []
        category_hits: dict[str, list[dict[str, str]]] = {}
        finding_counter = 0

        for category, spec in DANGEROUS_API_CATEGORIES.items():
            patterns: list[str] = spec["patterns"]  # type: ignore[assignment]
            severity_str: str = spec["severity"]  # type: ignore[assignment]
            mitre: list[str] = spec["mitre"]  # type: ignore[assignment]
            owasp: list[str] = spec["owasp_mobile"]  # type: ignore[assignment]
            hits: list[dict[str, str]] = []

            for rel_path, content in sources.items():
                for pattern in patterns:
                    for match in re.finditer(pattern, content):
                        # Find the line number of the match.
                        line_start = content.count("\n", 0, match.start()) + 1
                        snippet = match.group(0).strip()[:120]
                        hits.append({
                            "file": rel_path,
                            "line": str(line_start),
                            "match": snippet,
                        })
                        finding_counter += 1
                        findings.append(
                            Finding(
                                id=f"api:{category}:{finding_counter}",
                                type=FindingType.api,
                                severity=Severity(severity_str),
                                confidence=0.75,
                                detail=(
                                    f"Dangerous API usage ({category}): "
                                    f"`{snippet}` in {rel_path}:{line_start}"
                                ),
                                provenance=Provenance(
                                    extractor=self.name,
                                    locator=f"{rel_path}:{line_start}",
                                ),
                                mappings=Mappings(mitre=mitre, owasp_mobile=owasp),
                            )
                        )

            if hits:
                category_hits[category] = hits[:200]  # bound per category

        # Summary stats.
        categories_found = list(category_hits.keys())
        return AnalyzerResult(
            evidence={
                "categories_detected": categories_found,
                "total_findings": finding_counter,
                "hits_by_category": {
                    cat: {"count": len(hits), "samples": hits[:10]}
                    for cat, hits in category_hits.items()
                },
                "files_scanned": len(sources),
            },
            findings=findings[:500],  # hard cap for envelope size
        )
