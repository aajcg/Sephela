# Sephela — GenAI-Based Automated Analysis & Risk Scoring of Fraudulent Android APKs

> Enterprise malware-analysis platform for banking cybersecurity teams.
> **Phase 1 deliverable — architecture & system design. No application code.**

## 1. Vision & Non-Goals

**Vision.** A production-grade platform that ingests suspicious Android APKs, runs
multi-engine static + dynamic analysis, enriches with threat intelligence,
reasons over the evidence with a multi-agent GenAI layer, and produces an
explainable risk score and SOC-ready report.

**Design principles**

1. **Engine-agnostic.** Every analysis capability (static, dynamic, TI, RAG) is a
   pluggable *engine* behind a stable contract. New malware engines drop in
   without touching orchestration.
2. **Evidence-first, AI-second.** The LLM never invents facts. It reasons *only*
   over structured evidence produced by deterministic extractors. Every AI claim
   is traceable to an artifact.
3. **Explainability is a product feature.** Risk scores decompose into weighted,
   auditable contributions mapped to MITRE ATT&CK & OWASP Mobile.
4. **Async by default.** Analysis is long-running; the API layer never blocks. All
   heavy work flows through a queue to horizontally-scalable workers.
5. **Isolation & least privilege.** Malware never executes on shared infra.
   Dynamic analysis runs in ephemeral, network-egress-controlled sandboxes.
6. **Build for phase 14 on day one.** Boundaries, contracts, and schemas anticipate
   dynamic analysis, TI, RAG, and multi-agent — even before they are implemented.

**Non-goals (Phase 1):** no application code, no model fine-tuning, no
on-device (mobile) client.

## 2. System Context (C4 Level 1)

```
        ┌────────────┐        ┌──────────────────────────────┐
        │ SOC Analyst │──HTTPS─▶│         Sephela Platform      │
        └────────────┘        │  (this system)                │
        ┌────────────┐        │                               │──▶ VirusTotal / OTX
        │ Bank IR Team│──HTTPS─▶│                               │──▶ AbuseIPDB / URLHaus
        └────────────┘        │                               │──▶ MalwareBazaar
        ┌────────────┐        │                               │──▶ LLM Provider(s)
        │ CI / SOAR   │──API───▶│                               │──▶ Object Storage
        └────────────┘        └──────────────────────────────┘
```

Consumers: interactive analysts (dashboard), automated pipelines (SOAR/CI via API
+ webhooks). External dependencies: TI feeds, LLM providers, object storage.

## 3. Document Map

| Doc | Contents |
|-----|----------|
| `01-tech-stack.md` | Technology choices + justification |
| `02-services.md` | Microservice boundaries & responsibilities |
| `03-communication.md` | Sync/async communication, contracts, events |
| `04-data-model.md` | Object models + PostgreSQL schema |
| `05-messaging.md` | Queue topology, task lifecycle, retries |
| `06-api-spec.md` | REST API surface & conventions |
| `07-data-flow.md` | End-to-end data-flow diagrams |
| `08-deployment.md` | Environments, K8s topology, scaling |
| `09-security.md` | Threat model & controls |
| `10-scalability.md` | Growth path & future capabilities |
| `11-dev-standards.md` | Coding standards, testing, CI/CD gates |
| `12-repo-structure.md` | Monorepo folder layout |
