"""Dangerous control flow detector — pattern-matching for evasion techniques.

Goes beyond individual API calls (covered by api_usage) to detect *combined
patterns* that indicate deliberate evasion, obfuscation, or anti-analysis:
- Reflection chains (forName → getMethod → invoke)
- Dynamic DEX loading sequences
- Encrypted/encoded string construction (Base64 + Cipher in the same method)
- Native method declarations paired with System.loadLibrary
- Deferred execution via threads/handlers hiding malicious work

Each detected pattern produces a high-confidence Finding since these
multi-step combinations are rarely benign in banking-context APKs.
"""

from __future__ import annotations

import re

from sephela_code_intel.base import Analyzer, AnalysisContext, AnalyzerResult
from sephela_code_intel.envelope import (
    Finding,
    FindingType,
    Mappings,
    Provenance,
    Severity,
)

# Compound patterns: each entry is (name, description, regex that matches across
# a method/class body, severity, mitre, owasp).
_CONTROL_FLOW_PATTERNS: list[dict[str, object]] = [
    {
        "name": "reflection_chain",
        "description": "Reflection-based dynamic dispatch (Class.forName → getMethod → invoke)",
        "pattern": r"Class\s*\.\s*forName\s*\([^)]*\).*?(?:getMethod|getDeclaredMethod)\s*\([^)]*\).*?invoke\s*\(",
        "severity": Severity.high,
        "mitre": ["T1620"],  # Reflective Code Loading
        "owasp": ["M9"],
    },
    {
        "name": "dynamic_dex_loading",
        "description": "Dynamic DEX class loading at runtime",
        "pattern": r"(?:DexClassLoader|InMemoryDexClassLoader|PathClassLoader)\s*\([^)]*\).*?loadClass\s*\(",
        "severity": Severity.high,
        "mitre": ["T1407"],  # Download New Code at Runtime
        "owasp": ["M9"],
    },
    {
        "name": "encoded_string_construction",
        "description": "Base64 decode + string construction (likely decrypting C2/payload)",
        "pattern": r"Base64\s*\.\s*decode[^;]*;.*?new\s+String\s*\(",
        "severity": Severity.medium,
        "mitre": ["T1027"],  # Obfuscated Files or Information
        "owasp": ["M9"],
    },
    {
        "name": "crypto_with_hardcoded_key",
        "description": "Cipher initialization with hardcoded key material",
        "pattern": r"SecretKeySpec\s*\(\s*(?:\"[^\"]+\"|new\s+byte)\s*[^)]*\).*?Cipher\s*\.\s*getInstance",
        "severity": Severity.high,
        "mitre": ["T1573"],  # Encrypted Channel
        "owasp": ["M5"],
    },
    {
        "name": "native_with_library_load",
        "description": "Native method declaration + System.loadLibrary in the same class",
        "pattern": r"native\s+\w+\s+\w+\s*\([^)]*\)\s*;.*?System\s*\.\s*loadLibrary\s*\(",
        "severity": Severity.medium,
        "mitre": ["T1406"],
        "owasp": ["M9"],
    },
    {
        "name": "deferred_execution",
        "description": "Suspicious work dispatched via Thread/Handler/Runnable (hiding execution)",
        "pattern": r"new\s+(?:Thread|Runnable|Handler)\s*\([^)]*\)\s*.*?(?:Runtime|Class\.forName|DexClassLoader|SmsManager|AccessibilityService)",
        "severity": Severity.medium,
        "mitre": ["T1575"],  # Native API
        "owasp": ["M1"],
    },
    {
        "name": "webview_javascript_bridge",
        "description": "WebView with JavaScript interface (potential bridge for exploitation)",
        "pattern": r"addJavascriptInterface\s*\([^)]*\).*?(?:loadUrl|loadData)\s*\(",
        "severity": Severity.medium,
        "mitre": ["T1185"],
        "owasp": ["M1"],
    },
]


class ControlFlowAnalyzer(Analyzer):
    """Detect compound evasion/obfuscation patterns in developer code."""

    name = "control_flow"

    def analyze(self, ctx: AnalysisContext) -> AnalyzerResult:
        # Use developer sources only.
        dev_paths: list[str] | None = None
        class_filter_ev = ctx.shared.get("class_filter", {})
        if isinstance(class_filter_ev, dict):
            dev_paths = class_filter_ev.get("developer_source_paths")  # type: ignore[assignment]

        sources = ctx.source_files
        if dev_paths is not None:
            sources = {p: sources[p] for p in dev_paths if p in sources}

        findings: list[Finding] = []
        detected: dict[str, list[dict[str, str]]] = {}
        finding_counter = 0

        for rel_path, content in sources.items():
            for spec in _CONTROL_FLOW_PATTERNS:
                pattern: str = spec["pattern"]  # type: ignore[assignment]
                name: str = spec["name"]  # type: ignore[assignment]
                # Use DOTALL so patterns can span multiple lines within a method
                for match in re.finditer(pattern, content, re.DOTALL | re.IGNORECASE):
                    line = content.count("\n", 0, match.start()) + 1
                    snippet = match.group(0).replace("\n", " ").strip()[:150]
                    finding_counter += 1

                    if name not in detected:
                        detected[name] = []
                    detected[name].append({
                        "file": rel_path,
                        "line": str(line),
                        "snippet": snippet,
                    })

                    findings.append(
                        Finding(
                            id=f"ctrlflow:{name}:{finding_counter}",
                            type=FindingType.behavior,
                            severity=spec["severity"],  # type: ignore[arg-type]
                            confidence=0.80,
                            detail=(
                                f"{spec['description']}: `{snippet[:80]}` "
                                f"in {rel_path}:{line}"
                            ),
                            provenance=Provenance(
                                extractor=self.name,
                                locator=f"{rel_path}:{line}",
                            ),
                            mappings=Mappings(
                                mitre=spec["mitre"],  # type: ignore[arg-type]
                                owasp_mobile=spec["owasp"],  # type: ignore[arg-type]
                            ),
                        )
                    )

        patterns_found = list(detected.keys())
        return AnalyzerResult(
            evidence={
                "patterns_detected": patterns_found,
                "pattern_count": len(patterns_found),
                "total_matches": finding_counter,
                "details": {
                    name: {"count": len(hits), "samples": hits[:5]}
                    for name, hits in detected.items()
                },
                "files_scanned": len(sources),
            },
            findings=findings[:200],
        )
