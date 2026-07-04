"""Hash extractor — SHA256/SHA1/MD5 of the APK (tool-free)."""

from __future__ import annotations

import hashlib

from sephela_static.base import Extractor, ExtractionContext, ExtractorResult


class HashExtractor(Extractor):
    name = "hashes"

    def extract(self, ctx: ExtractionContext) -> ExtractorResult:
        data = ctx.data
        return ExtractorResult(
            evidence={
                "sha256": hashlib.sha256(data).hexdigest(),
                "sha1": hashlib.sha1(data).hexdigest(),
                "md5": hashlib.md5(data).hexdigest(),
                "file_size": len(data),
            }
        )
