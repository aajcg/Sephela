"""URL + IP extractors — network indicators from extracted strings.

Depend on the ``strings`` extractor's output via the shared evidence dict, so
they run after it in the pipeline. Each URL/IP becomes a normalized finding
(these are IoCs the Threat-Intel engine will later enrich).
"""

from __future__ import annotations

import ipaddress
import re

from sephela_static.base import Extractor, ExtractionContext, ExtractorResult
from sephela_static.envelope import (
    Finding,
    FindingType,
    Mappings,
    Provenance,
    Severity,
)

_URL_RE = re.compile(r"(?:https?|ftp)://[^\s\"'<>\\)]+", re.IGNORECASE)
_IP_RE = re.compile(r"(?<!\d)(?:\d{1,3}\.){3}\d{1,3}(?!\d)")


def _valid_public_ip(candidate: str) -> bool:
    try:
        ip = ipaddress.ip_address(candidate)
    except ValueError:
        return False
    return not (ip.is_private or ip.is_loopback or ip.is_multicast or ip.is_reserved)


class UrlExtractor(Extractor):
    name = "urls"

    def extract(self, ctx: ExtractionContext) -> ExtractorResult:
        corpus: list[str] = ctx.shared.get("strings", {}).get("strings", [])
        urls = sorted({m.group(0) for s in corpus for m in _URL_RE.finditer(s)})
        findings = [
            Finding(
                id=f"url:{i}",
                type=FindingType.url,
                severity=Severity.info,
                confidence=0.6,
                detail=url,
                provenance=Provenance(extractor=self.name),
                mappings=Mappings(mitre=["T1071"]),  # Application Layer Protocol
            )
            for i, url in enumerate(urls)
        ]
        return ExtractorResult(evidence={"count": len(urls), "urls": urls}, findings=findings)


class IpExtractor(Extractor):
    name = "ips"

    def extract(self, ctx: ExtractionContext) -> ExtractorResult:
        corpus: list[str] = ctx.shared.get("strings", {}).get("strings", [])
        candidates = {m.group(0) for s in corpus for m in _IP_RE.finditer(s)}
        ips = sorted(ip for ip in candidates if _valid_public_ip(ip))
        findings = [
            Finding(
                id=f"ip:{i}",
                type=FindingType.ip,
                severity=Severity.info,
                confidence=0.5,
                detail=ip,
                provenance=Provenance(extractor=self.name),
                mappings=Mappings(mitre=["T1071"]),
            )
            for i, ip in enumerate(ips)
        ]
        return ExtractorResult(evidence={"count": len(ips), "ips": ips}, findings=findings)
