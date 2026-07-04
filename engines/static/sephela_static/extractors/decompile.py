"""Decompilation extractors — Java (JADX) + Smali (Androguard/dvm).

JADX is a Java CLI invoked as a subprocess (not a pip dep). Both extractors
write large artifacts to a work directory and return references + summaries in
the envelope, not the full source (that would bloat the envelope; the Code
Intelligence engine in Phase 6 consumes the artifacts directly).
"""

from __future__ import annotations

import shutil
import subprocess
from pathlib import Path
from typing import Any

from sephela_static.base import Extractor, ExtractionContext, ExtractorResult


class DecompileExtractor(Extractor):
    """Decompile DEX → Java source via JADX into a work dir."""

    name = "decompiled_java"
    requires_tools = True

    def __init__(self, workdir: Path | None = None, timeout: int = 600) -> None:
        self.workdir = workdir
        self.timeout = timeout

    def extract(self, ctx: ExtractionContext) -> ExtractorResult:
        jadx = shutil.which("jadx")
        if not jadx:
            raise RuntimeError("JADX not found on PATH; install it in the engine image.")

        out_dir = (self.workdir or ctx.apk_path.parent) / f"{ctx.apk_path.stem}_jadx"
        out_dir.mkdir(parents=True, exist_ok=True)
        # --no-res / --no-imports keep it fast; we only need source structure.
        proc = subprocess.run(  # noqa: S603 — fixed binary, no shell
            [jadx, "--no-res", "-d", str(out_dir), str(ctx.apk_path)],
            capture_output=True,
            text=True,
            timeout=self.timeout,
            check=False,
        )
        sources = list((out_dir / "sources").rglob("*.java")) if (out_dir / "sources").exists() else []
        return ExtractorResult(
            evidence={
                "artifact_dir": str(out_dir),
                "java_file_count": len(sources),
                "jadx_exit_code": proc.returncode,
                "jadx_warnings": proc.stderr[-2000:] if proc.stderr else "",
            }
        )


class SmaliExtractor(Extractor):
    """Extract Smali/DEX class listing via Androguard's DEX analysis."""

    name = "smali"
    requires_tools = True

    def extract(self, ctx: ExtractionContext) -> ExtractorResult:
        from androguard.core.dex import DEX  # type: ignore[import-not-found]

        apk: Any = ctx.androguard_apk()
        classes: list[str] = []
        method_count = 0
        for dex_bytes in apk.get_all_dex():
            dex = DEX(dex_bytes)
            for cls in dex.get_classes():
                classes.append(cls.get_name())
                method_count += len(list(cls.get_methods()))
        return ExtractorResult(
            evidence={
                "class_count": len(classes),
                "method_count": method_count,
                "classes": classes[:5000],  # bound envelope size
            }
        )
