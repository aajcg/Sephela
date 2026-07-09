"""Sephela Code Intelligence Engine.

Public API: ``analyze(static_evidence, *, job_id, artifact_dir) → EvidenceEnvelope``.
"""

from sephela_code_intel.envelope import EvidenceEnvelope
from sephela_code_intel.pipeline import ENGINE_NAME, ENGINE_VERSION, analyze

__all__ = ["EvidenceEnvelope", "analyze", "ENGINE_NAME", "ENGINE_VERSION"]
