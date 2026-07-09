"""Library/Framework class filter — separates developer code from noise.

The single most impactful step for LLM token reduction: a typical APK contains
thousands of framework/library classes that add no malware-analysis signal.
This analyzer classifies every class from the static engine's smali inventory
and, when JADX source is available, retains only developer-authored files for
downstream analyzers.
"""

from __future__ import annotations

from sephela_code_intel.base import Analyzer, AnalysisContext, AnalyzerResult
from sephela_code_intel.constants import (
    ANDROID_FRAMEWORK_PREFIXES,
    GENERATED_PATTERNS,
    THIRD_PARTY_PREFIXES,
)


def _smali_to_java(smali_name: str) -> str:
    """Convert a Smali class name (``Lcom/example/Foo;``) to Java dot notation."""
    return smali_name.lstrip("L").rstrip(";").replace("/", ".")


def classify_class(class_name: str) -> str:
    """Return ``'framework'``, ``'third_party'``, ``'generated'``, or ``'developer'``."""
    java_name = _smali_to_java(class_name) if class_name.startswith("L") else class_name

    if any(java_name.startswith(prefix) for prefix in ANDROID_FRAMEWORK_PREFIXES):
        return "framework"

    if any(java_name.startswith(prefix) for prefix in THIRD_PARTY_PREFIXES):
        return "third_party"

    if any(pattern in java_name for pattern in GENERATED_PATTERNS):
        return "generated"

    return "developer"


class ClassFilterAnalyzer(Analyzer):
    """Classify every class as developer, framework, third_party, or generated.

    Also filters the Java source file index (if present) to retain only
    developer-authored files for downstream analyzers.
    """

    name = "class_filter"

    def analyze(self, ctx: AnalysisContext) -> AnalyzerResult:
        classes = ctx.get_smali_classes()

        classified: dict[str, list[str]] = {
            "developer": [],
            "framework": [],
            "third_party": [],
            "generated": [],
        }
        for cls in classes:
            category = classify_class(cls)
            classified[category].append(cls)

        # Also classify source file paths (from JADX output) so downstream
        # analyzers can focus on developer source only.
        dev_source_files: dict[str, str] = {}
        for rel_path, content in ctx.source_files.items():
            java_pkg = rel_path.replace("\\", "/").replace("/", ".").removesuffix(".java")
            cat = classify_class(java_pkg)
            if cat == "developer":
                dev_source_files[rel_path] = content

        total = len(classes) or 1  # avoid div by zero
        stats = {
            "total_classes": len(classes),
            "developer_count": len(classified["developer"]),
            "framework_count": len(classified["framework"]),
            "third_party_count": len(classified["third_party"]),
            "generated_count": len(classified["generated"]),
            "developer_ratio": round(len(classified["developer"]) / total, 3),
            "developer_source_files": len(dev_source_files),
        }

        return AnalyzerResult(
            evidence={
                "classified_classes": {
                    k: v[:2000] for k, v in classified.items()  # bound envelope size
                },
                "developer_source_paths": list(dev_source_files.keys())[:2000],
                "stats": stats,
            }
        )
