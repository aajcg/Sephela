# Inter-Service Communication

Two planes: **synchronous** (client ↔ API) and **asynchronous** (pipeline).

## Synchronous — REST (client-facing)
- Protocol: HTTPS/JSON, versioned `/api/v1`.
- Auth: Bearer JWT (later OIDC). RBAC enforced at gateway.
- Long-running work is **never** awaited: upload returns `202 Accepted` + `job_id`.
- Clients learn progress via **polling** (`GET /jobs/{id}`) and/or **webhooks/SSE**.

## Asynchronous — Message Queue (pipeline)
Celery over Redis (RabbitMQ path for durable routing at scale). See `05-messaging.md`.

- **Commands** (task messages): "analyze this job", "run static engine", "score".
- **Events** (fan-out): `job.created`, `job.stage.completed`, `job.completed`,
  `job.failed`. Published to a topic; consumers (notifications, webhooks, TI
  pre-warm, audit log) subscribe independently.

## The Evidence Envelope — the universal engine contract
Every engine (static, code-intel, dynamic, TI) emits the **same wrapper** so the
pipeline and AI layer treat all evidence uniformly:

```jsonc
{
  "envelope_version": "1.0",
  "job_id": "uuid",
  "apk_sha256": "…",
  "engine": { "name": "static", "version": "1.4.2" },
  "produced_at": "ISO-8601",
  "status": "ok | partial | failed",
  "evidence": { /* engine-specific, schema in contracts/json-schema/ */ },
  "findings": [                        // normalized, cross-engine
    {
      "id": "…", "type": "permission|api|url|cert|behavior|signature",
      "severity": "info|low|med|high|crit",
      "confidence": 0.0,
      "detail": "…",
      "provenance": { "extractor": "manifest", "locator": "…" },
      "mappings": { "mitre": ["T1636.003"], "owasp_mobile": ["M3"] }
    }
  ],
  "errors": [ { "extractor": "packers", "message": "…" } ]  // partial-failure detail
}
```

Guarantees: additive-versioned (`envelope_version`), engine failures are *partial*
not fatal, findings carry provenance + mappings so scoring & reports are auditable.

## Contract governance
- All payloads defined in `contracts/` (OpenAPI, AsyncAPI, JSON-Schema).
- CI validates every service's I/O against the schema; breaking changes require a
  new major version. Frontend TS client + backend Pydantic models are generated.

## Communication patterns summary
| Interaction | Mechanism | Why |
|---|---|---|
| Client → API | REST/HTTPS | Standard, cacheable, documented |
| API → Pipeline | Celery command | Decouple, async, retryable |
| Stage → Stage | Celery chain/chord + DB state | Resumable, observable |
| Pipeline → Clients | Events → webhook/SSE + polling | No long-lived HTTP holds |
| AI ↔ Engines | Via evidence in DB/storage (not direct calls) | Isolation, replayability |
| (future) Orchestrator ↔ Engine services | gRPC (`contracts/proto`) | Low-latency typed RPC at scale |
