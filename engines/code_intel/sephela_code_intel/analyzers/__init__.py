"""Analyzer registry.

Order matters for dependent analyzers: ``class_filter`` first (all others
read its developer-class list), ``api_usage`` before ``call_graph`` and
``grouper`` (they use its category hits), ``summarizer`` last (reads all).
Everything else is independent. The pipeline runs them in this order and
isolates each failure.
"""

from __future__ import annotations

from sephela_code_intel.base import Analyzer
from sephela_code_intel.analyzers.api_usage import ApiUsageAnalyzer
from sephela_code_intel.analyzers.call_graph import CallGraphAnalyzer
from sephela_code_intel.analyzers.class_filter import ClassFilterAnalyzer
from sephela_code_intel.analyzers.control_flow import ControlFlowAnalyzer
from sephela_code_intel.analyzers.grouper import GrouperAnalyzer
from sephela_code_intel.analyzers.summarizer import SummarizerAnalyzer


def default_analyzers() -> list[Analyzer]:
    """The standard code-intelligence analyzer chain, in dependency order."""
    return [
        ClassFilterAnalyzer(),
        ApiUsageAnalyzer(),
        CallGraphAnalyzer(),
        ControlFlowAnalyzer(),
        GrouperAnalyzer(),
        SummarizerAnalyzer(),
    ]


__all__ = ["default_analyzers"]
