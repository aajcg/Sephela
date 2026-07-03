# Technology Stack & Justification

Choices optimize for **production reliability, ecosystem fit with Android malware
tooling (Python), and enterprise operability** — not MVP speed.

## Frontend

| Concern | Choice | Justification |
|---|---|---|
| Framework | **Next.js 14+ (App Router)** | SSR/RSC for fast, secure dashboards; mature; file-based routing; strong enterprise adoption. |
| Language | **TypeScript (strict)** | Type safety across a large dashboard; contracts generated from OpenAPI. |
| Styling | **TailwindCSS + shadcn/ui** | Design-token driven, consistent, accessible primitives, fast iteration. |
| Server state | **TanStack Query** | Caching, polling for long-running jobs, retries, background refetch. |
| Client state | **Zustand** | Minimal boilerplate for UI/local state; avoids Redux overhead. |
| Charts | **Recharts / visx** | Risk breakdowns, timelines (follows dataviz system). |
| Auth | **NextAuth / OIDC client** | Integrates with enterprise IdP (SSO/SAML/OIDC) later. |

## Backend / Core

| Concern | Choice | Justification |
|---|---|---|
| API framework | **FastAPI** | Async, Pydantic-native, auto-OpenAPI, high throughput, huge Python ML ecosystem alignment. |
| Language | **Python 3.12** | Every Android analysis tool (Androguard, Frida bindings, YARA) is Python-first. |
| ORM | **SQLAlchemy 2.0 (async)** | Mature, explicit, supports async; repository pattern. |
| Migrations | **Alembic** | Versioned, reviewable schema evolution. |
| Validation | **Pydantic v2** | Fast, shared models, structured-output validation for LLM. |
| Task queue | **Celery** | Battle-tested distributed task execution; routing, retries, priorities. |
| Broker/result | **Redis** (broker + cache); **RabbitMQ optional** for high-reliability routing | Redis simple + fast for MVP-scale; RabbitMQ path documented for durable, complex routing at scale. |
| Object storage | **S3-compatible (MinIO dev / S3 prod)** | Durable, cheap, versioned APK & artifact storage; presigned URLs. |

## AI / Analysis

| Concern | Choice | Justification |
|---|---|---|
| GenAI orchestration | **LangGraph** (built on LangChain) | Explicit graph/state machine for multi-stage & multi-agent reasoning; deterministic control flow; checkpointing. |
| LLM provider | **Claude (Anthropic) primary**, provider-abstracted | Strong reasoning + structured output + long context for decompiled code; abstraction allows multi-provider. |
| Structured output | **Pydantic + tool/function calling + JSON-schema validation** | Deterministic, validated outputs; retry on schema mismatch. |
| Vector DB | **Qdrant** (or pgvector for small scale) | Fast ANN, metadata filtering, horizontal scale; self-hostable for data sovereignty. |
| Embeddings | Provider embeddings, abstracted | Swappable; kept behind interface. |
| Static analysis | **Androguard, JADX, APKID, YARA** | Industry-standard APK decompilation, packer/obfuscation ID, signatures. |
| Dynamic analysis | **Android Emulator (AOSP/Genymotion), Frida, mitmproxy** | Runtime hooking, TLS interception, SSL-pinning bypass. |

## Platform / Ops

| Concern | Choice | Justification |
|---|---|---|
| Containerization | **Docker** | Reproducible builds; per-service images. |
| Orchestration | **Kubernetes** | Horizontal scaling, isolation, autoscaling of workers & sandboxes. |
| CI/CD | **GitHub Actions** | Lint/test/scan/build/deploy gates. |
| Observability | **Prometheus + Grafana + OpenTelemetry** | Metrics, tracing across async pipeline; SLOs. |
| Logging | **Structured JSON (structlog) → Loki/ELK** | Correlatable by job_id/trace_id. |
| Secrets | **Vault / cloud secrets manager (K8s ExternalSecrets)** | No secrets in env files or images. |

## Key trade-offs recorded

- **Celery over Temporal/Arq:** ubiquity, operator familiarity, mature ecosystem;
  Temporal reconsidered if workflow durability/versioning becomes central (see `10`).
- **Monorepo over polyrepo:** atomic contract changes across services early;
  service extraction remains possible due to strict boundaries.
- **LangGraph over hand-rolled orchestration:** we need multi-agent state,
  branching, and checkpoint/replay — provided out of the box.
