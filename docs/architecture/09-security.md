# Security Considerations

This platform **stores and executes malware** for **banks**. Security is the
architecture, not a layer. Threat model below (STRIDE-oriented) + controls.

## Trust boundaries
1. Internet ↔ API Gateway (untrusted input, auth boundary).
2. API ↔ internal services (authenticated service mesh).
3. Analysis workers ↔ **malware** (the sample is hostile — assume RCE attempts).
4. Platform ↔ external TI/LLM providers (data-egress boundary).

## The malware-handling threat (most critical)
- **Sandbox escape / RCE from a crafted APK.** Controls:
  - Dynamic analysis on isolated, tainted node pool; ephemeral VMs; **egress
    default-deny**; destroyed post-run.
  - Static engines: unprivileged, read-only FS, seccomp/AppArmor, **no network**,
    strict CPU/mem/time limits, no shell-out with untrusted args.
  - APKs stored **encrypted at rest**, never executed outside sandbox, never served
    to browsers; downloads are analyst-gated + audited.
  - Decompiled artifacts treated as untrusted data; never `eval`'d/rendered raw.
- **Prompt injection via APK content** (strings/code fed to LLM):
  - Evidence is passed as clearly delimited *data*, never as instructions.
  - System prompts instruct agents to treat sample content as untrusted and never
    follow embedded instructions. Structured-output schema constrains responses.
  - Retrieved RAG docs are trusted-source only; sample-derived text is quarantined.

## STRIDE controls
| Threat | Control |
|---|---|
| **Spoofing** | OIDC/SSO, JWT with short TTL + refresh rotation, mTLS between services |
| **Tampering** | Immutable jobs/audit; signed webhooks (HMAC); integrity hashes on artifacts |
| **Repudiation** | Append-only `audit_logs` (actor, action, target, ip, ts) |
| **Info disclosure** | Encryption in transit (TLS 1.3) + at rest; RBAC + per-org row isolation; secrets in Vault |
| **DoS** | Per-org rate limits, upload size caps, queue backpressure, resource quotas per job |
| **Elevation** | Least-privilege RBAC (admin/analyst/viewer), no ambient service creds, scoped tokens |

## AuthN / AuthZ
- Phase 2: JWT placeholder. Target: enterprise OIDC/SAML SSO.
- **RBAC** (Phase 14): roles gate endpoints + fields (e.g. only analyst+ can
  download raw APK/evidence). **Multi-tenant isolation** via `org_id` on all rows;
  enforce with PostgreSQL Row-Level Security + app-layer checks (defense in depth).

## Data governance
- Data classification: APK bytes = "hostile/confidential"; reports = "confidential".
- Retention policies per org; secure deletion; audit of exports.
- PII: banking samples may embed PII/creds in strings → redact in reports, restrict
  raw string access, log access.
- **Egress control:** hashes/IOCs sent to external TI feeds by policy; sending the
  *full APK* to third parties (e.g. VT upload) is **opt-in per org** and audited —
  default is hash-only lookups to avoid leaking a bank's samples.

## Secrets & supply chain
- Vault / K8s ExternalSecrets; no secrets in images, env files, or git.
- SBOM generation; dependency + container scanning in CI; pinned digests; signed
  images (cosign); admission control (only signed images run).
- Network policies: default-deny, explicit allowlists between services.

## Compliance posture
Designed toward SOC 2 / ISO 27001 / PCI-DSS-adjacent controls: audit trails,
encryption, access control, change management, DR. (Formal certification = program,
not just architecture.)
