# Sephela Code Intelligence Engine

Transforms raw decompiled APK output from the Static Analysis Engine (Phase 5)
into **compact, high-signal, token-minimized structured JSON** consumed by the
GenAI layer (Phase 7).

```python
from sephela_code_intel import analyze

envelope = analyze(
    static_envelope.evidence,          # evidence dict from static engine
    job_id="…",
    apk_sha256="…",
    artifact_dir="/path/to/jadx_out",  # optional JADX decompiled source
)
print(envelope.evidence["summarizer"]["code_summary"])
```

## Design
- **Every analyzer is an independent module** implementing `Analyzer.analyze(ctx)`.
- **Failure is isolated**: the pipeline catches any analyzer exception, records it
  in `envelope.errors`, and continues. One broken analyzer degrades the run to
  `partial` — it never crashes the engine.
- **One contract out**: a single `EvidenceEnvelope` (the universal engine contract,
  docs/architecture/03-communication.md) with per-analyzer evidence, normalized
  findings (severity + confidence + provenance + MITRE/OWASP mappings), and errors.
- **Token-optimized**: the summarizer produces compact LLM context within a
  configurable token budget.

## Analyzers (dependency order)
| Analyzer | Purpose | Input |
|---|---|---|
| `class_filter` | Separate developer code from framework/library/generated noise | smali class list + JADX source |
| `api_usage` | Scan developer source for dangerous Android API calls | developer source files |
| `call_graph` | Build call chains from entry points to dangerous APIs | developer source files |
| `control_flow` | Detect compound evasion patterns (reflection chains, dynamic loading) | developer source files |
| `grouper` | Organize classes into functional groups (networking, crypto, etc.) | developer classes + API usage |
| `summarizer` | Produce token-budgeted structured summary for LLM | all prior analyzer output |

## Install / test
```bash
cd engines/code_intel
pip install -e ".[dev]"
pytest -v
```

## Input
The static engine's `EvidenceEnvelope.evidence` dict, containing:
- `smali.classes` — class inventory from Androguard
- `decompiled_java.artifact_dir` — path to JADX output
- `permissions.permissions` — permission list
- `strings.strings` — extracted strings
- `obfuscation` — obfuscation metrics

## Output
An `EvidenceEnvelope` with code-intel evidence:
- `class_filter` — classified class lists + developer ratio
- `api_usage` — dangerous API hits by category
- `call_graph` — entry points, call edges, suspicious paths
- `control_flow` — evasion pattern detections
- `grouper` — functional class groups
- `summarizer.code_summary` — **the primary LLM input** (Phase 7)

## Notes
- All analysis is deterministic — no LLM calls. This engine produces context
  *for* the LLM, it doesn't *use* the LLM.
- The envelope will graduate into a shared `libs/sephela_evidence` package so
  every engine imports the identical contract.
- Source analysis uses regex-based pattern matching (not full AST parsing).
  This is deliberately lightweight: JADX output is clean enough that regex
  captures >90% of API usage patterns. Full AST can be an enhancement later.
