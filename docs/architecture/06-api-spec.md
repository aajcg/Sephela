# API Specification

REST/JSON, versioned `/api/v1`. Full machine-readable spec lives in
`contracts/openapi/`. This doc defines conventions + core endpoints.

## Conventions
- **Auth:** `Authorization: Bearer <JWT>`; OIDC later. RBAC roles: admin/analyst/viewer.
- **Async:** heavy ops return `202 Accepted` + resource with `job_id`.
- **Errors:** RFC 9457 Problem Details (`application/problem+json`):
  `{ "type","title","status","detail","instance","trace_id" }`.
- **Pagination:** cursor-based (`?cursor=&limit=`); responses include `next_cursor`.
- **Idempotency:** mutating POSTs accept `Idempotency-Key` header.
- **Versioning:** URI-versioned; additive changes only within a version.
- **Rate limits:** per-org token bucket; `429` + `Retry-After`.

## Endpoints (core)

### Auth
```
POST   /api/v1/auth/login            -> { access_token, refresh_token }
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout
GET    /api/v1/auth/me               -> current user + role
```
(Phase 2 ships a placeholder; OIDC/SSO slots in behind same routes.)

### Uploads & Samples
```
POST   /api/v1/uploads               (multipart or presigned-init)
   req: file | { filename, size, sha256? }
   -> 202 { job_id, sample_id, status:"queued", duplicate:false }
   # validation, sha256, dedup happen here (Phase 4)
GET    /api/v1/samples/{sha256}      -> sample metadata + job history
```

### Jobs (analysis lifecycle)
```
GET    /api/v1/jobs                  ?status=&sample=&cursor=  (list)
GET    /api/v1/jobs/{id}             -> { status, progress, stages[], error? }
GET    /api/v1/jobs/{id}/stages      -> per-stage status (static/ai/scoring/…)
GET    /api/v1/jobs/{id}/evidence    ?engine=static  (raw envelope, RBAC-gated)
GET    /api/v1/jobs/{id}/findings    ?type=&severity=
GET    /api/v1/jobs/{id}/score       -> risk score + breakdown + mappings
POST   /api/v1/jobs/{id}/cancel
POST   /api/v1/jobs/{id}/reanalyze   -> new job (updated pipeline/engines)
```

### Reports
```
GET    /api/v1/jobs/{id}/report      ?format=json|markdown|pdf
   -> json inline, or presigned download URL for md/pdf
```

### Webhooks (SOAR/CI integration)
```
POST   /api/v1/webhooks              register { url, events[], secret }
GET    /api/v1/webhooks
DELETE /api/v1/webhooks/{id}
   # events: job.completed, job.failed, score.high  (HMAC-signed delivery)
```

### Health & Ops
```
GET    /api/v1/health/live           -> liveness (process up)
GET    /api/v1/health/ready          -> readiness (db, redis, storage reachable)
GET    /api/v1/health/deps           -> per-dependency status (admin)
GET    /metrics                      -> Prometheus (internal only)
```

## Job status object (example)
```json
{
  "job_id": "…", "sample_id": "…", "status": "running", "progress": 60,
  "pipeline_version": "2025.1",
  "stages": [
    { "engine": "static", "status": "ok", "finished_at": "…" },
    { "engine": "code_intel", "status": "ok" },
    { "engine": "ai", "status": "running" },
    { "engine": "threat_intel", "status": "running" },
    { "engine": "scoring", "status": "pending" },
    { "engine": "reporting", "status": "pending" }
  ],
  "created_at": "…"
}
```

## Real-time progress
- Primary: **polling** `GET /jobs/{id}` (frontend uses TanStack Query polling).
- Optional: **SSE** `GET /api/v1/jobs/{id}/events` for live stage updates.
- Integrations: **webhooks** on terminal events.
