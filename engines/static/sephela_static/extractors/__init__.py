"""Extractor registry.

Order matters only for dependent extractors: ``strings`` before ``urls``/``ips``,
and ``smali`` before ``obfuscation`` (they read shared evidence). Everything else
is independent. The pipeline runs them in this order and isolates each failure.
"""

from __future__ import annotations

from sephela_static.base import Extractor
from sephela_static.extractors.decompile import DecompileExtractor, SmaliExtractor
from sephela_static.extractors.hashes import HashExtractor
from sephela_static.extractors.manifest import (
    CertificateExtractor,
    ComponentExtractor,
    ManifestExtractor,
    PermissionExtractor,
)
from sephela_static.extractors.network import IpExtractor, UrlExtractor
from sephela_static.extractors.obfuscation import ObfuscationExtractor, PackerExtractor
from sephela_static.extractors.strings import StringExtractor


def default_extractors() -> list[Extractor]:
    """The standard static-analysis extractor chain, in dependency order."""
    return [
        HashExtractor(),
        ManifestExtractor(),
        PermissionExtractor(),
        ComponentExtractor(),
        CertificateExtractor(),
        StringExtractor(),
        UrlExtractor(),
        IpExtractor(),
        SmaliExtractor(),
        DecompileExtractor(),
        ObfuscationExtractor(),
        PackerExtractor(),
    ]


__all__ = ["default_extractors"]
