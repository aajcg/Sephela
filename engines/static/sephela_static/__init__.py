"""Sephela Static Analysis Engine.

Public API: ``analyze(apk_path)`` → ``EvidenceEnvelope``.
"""

from sephela_static.envelope import EvidenceEnvelope
from sephela_static.pipeline import ENGINE_NAME, ENGINE_VERSION, analyze

__all__ = ["EvidenceEnvelope", "analyze", "ENGINE_NAME", "ENGINE_VERSION"]
