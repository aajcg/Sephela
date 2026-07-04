# Sephela Static Analysis Engine

Modular static-analysis engine for Android APKs. Public API:

```python
from sephela_static import analyze
envelope = analyze("/path/to/app.apk", job_id="…")   # -> EvidenceEnvelope
```

## Design
- **Every extractor is an independent module** implementing `Extractor.extract(ctx)`.
- **Failure is isolated**: the pipeline catches any extractor exception, records it
  in `envelope.errors`, and continues. One broken extractor degrades the run to
  `partial` — it never crashes the engine.
- **One contract out**: a single [`EvidenceEnvelope`](sephela_static/envelope.py)
  (the universal engine contract, docs/architecture/03-communication.md) with
  per-extractor evidence, normalized findings (severity + confidence + provenance
  + MITRE/OWASP mappings), and errors.

## Extractors
| Extractor | Tool | Output |
|---|---|---|
| `hashes` | — | SHA256/SHA1/MD5, size |
| `strings` | — | printable strings from DEX/resources |
| `urls` / `ips` | — | network IoCs (public IPs only) from strings |
| `manifest` | Androguard | package, version, SDKs, main activity |
| `permissions` | Androguard | permissions + dangerous-permission findings |
| `components` | Androguard | activities/services/receivers/providers + intent-filters |
| `certificate` | Androguard | signing certs, self-signed/debug detection |
| `smali` | Androguard | class/method inventory |
| `decompiled_java` | JADX (subprocess) | Java source artifacts + summary |
| `obfuscation` | — | name-mangling heuristic score |
| `packers` | APKID | packer/protector/anti-analysis signatures |

Tool-free extractors run anywhere. Tool-based extractors require the analysis
toolchain and are installed in the engine's Docker image (`extras = tools` + JADX).

## Install / test
```bash
pip install -e ".[dev]"           # tool-free extractors
pip install -e ".[dev,tools]"     # + androguard/apkid (Linux recommended)
# JADX is a Java CLI — install separately and put `jadx` on PATH.
pytest
```

## Notes
- Decompiled source and other large artifacts are written to a work dir and
  *referenced* from the envelope, not inlined — the Code Intelligence engine
  (Phase 6) consumes those artifacts directly to build compact LLM context.
- The envelope will graduate into a shared `libs/sephela_evidence` package so
  every engine imports the identical contract.
