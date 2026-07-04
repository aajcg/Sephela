"""String extractor — printable ASCII/UTF-8 strings from DEX + resources.

Tool-free: reads classes*.dex and resources.arsc directly from the archive and
extracts printable runs. This feeds the URL/IP extractors and the Code
Intelligence engine (Phase 6).
"""

from __future__ import annotations

import re

from sephela_static.base import Extractor, ExtractionContext, ExtractorResult

_PRINTABLE = re.compile(rb"[\x20-\x7e]{5,}")  # runs of >=5 printable chars
_MAX_STRINGS = 50_000  # bound memory on huge/hostile APKs


class StringExtractor(Extractor):
    name = "strings"

    def extract(self, ctx: ExtractionContext) -> ExtractorResult:
        strings: list[str] = []
        seen: set[str] = set()
        for entry in ctx.zip.namelist():
            if not (entry.endswith(".dex") or entry.endswith(".arsc")):
                continue
            try:
                blob = ctx.zip.read(entry)
            except Exception:  # noqa: BLE001 — skip unreadable entries
                continue
            for match in _PRINTABLE.finditer(blob):
                s = match.group().decode("ascii", "ignore")
                if s not in seen:
                    seen.add(s)
                    strings.append(s)
                    if len(strings) >= _MAX_STRINGS:
                        break
            if len(strings) >= _MAX_STRINGS:
                break

        return ExtractorResult(
            evidence={"count": len(strings), "strings": strings, "truncated": len(strings) >= _MAX_STRINGS}
        )
