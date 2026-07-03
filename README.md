# Sephela

**Enterprise platform for GenAI-based automated analysis & risk scoring of
fraudulent Android APKs** — built for banking cybersecurity teams.

Ingest suspicious APKs → multi-engine static + dynamic analysis → threat-intel
enrichment → multi-agent GenAI reasoning → explainable risk score → SOC-ready
reports.

## Status
**Phase 1 — Architecture & System Design** ✅ (this deliverable). No application
code yet, by design.

## Architecture docs
Start at [docs/architecture/00-overview.md](docs/architecture/00-overview.md).

| # | Document |
|---|---|
| 00 | [Overview, vision, principles](docs/architecture/00-overview.md) |
| 01 | [Technology stack & justification](docs/architecture/01-tech-stack.md) |
| 02 | [Microservice boundaries](docs/architecture/02-services.md) |
| 03 | [Inter-service communication & contracts](docs/architecture/03-communication.md) |
| 04 | [Object models & database schema](docs/architecture/04-data-model.md) |
| 05 | [Message queue architecture](docs/architecture/05-messaging.md) |
| 06 | [API specification](docs/architecture/06-api-spec.md) |
| 07 | [Data-flow diagrams](docs/architecture/07-data-flow.md) |
| 08 | [Deployment architecture](docs/architecture/08-deployment.md) |
| 09 | [Security considerations](docs/architecture/09-security.md) |
| 10 | [Future scalability & extensibility](docs/architecture/10-scalability.md) |
| 11 | [Development standards](docs/architecture/11-dev-standards.md) |
| 12 | [Repository structure](docs/architecture/12-repo-structure.md) |

## Roadmap
Phase 1 Architecture → 2 Backend → 3 Frontend → 4 Upload → 5 Static → 6 Code
Intel → 7 GenAI → 8 Risk Scoring → 9 Reporting → 10 Dynamic → 11 Threat Intel →
12 RAG → 13 Multi-Agent → 14 Production Hardening.

Every later phase has a reserved home in the architecture (see doc 10).
