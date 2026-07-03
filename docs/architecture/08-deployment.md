# Deployment Architecture

## Environments
| Env | Purpose | Infra |
|---|---|---|
| local | dev full-stack | `docker-compose` (all services + MinIO + Postgres + Redis) |
| dev | integration | K8s namespace, ephemeral data |
| staging | pre-prod, load/security tests | K8s, prod-like, synthetic samples |
| prod | live | K8s, HA, autoscaled, backups+DR |

## Kubernetes topology (prod)

```
                     ┌───────── Ingress (TLS, WAF) ─────────┐
                     ▼                                       
             ┌───────────────┐   HPA (cpu/rps)               
             │ api-gateway    │  (stateless, N replicas)     
             └───────┬───────┘                               
   ┌─────────────────┼──────────────────────────────────┐   
   ▼                 ▼                                    ▼   
┌────────┐   ┌──────────────┐                    ┌──────────────┐
│Postgres│   │   Redis       │                    │ Object Store │
│ (HA,    │   │ (broker+cache)│                    │ (S3/MinIO)   │
│ replica)│   └──────────────┘                    └──────────────┘
└────────┘                                                        
   Worker pools (separate Deployments, KEDA-autoscaled on queue depth):
   ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────────┐
   │ w-static │ │w-code_int│ │  w-ai    │ │ w-tintel │ │  w-dynamic     │
   │ (cpu)    │ │ (mem)    │ │(io,ratel)│ │(io,ratel)│ │ ISOLATED node  │
   └──────────┘ └──────────┘ └──────────┘ └──────────┘ │ pool, no egress│
                                                        └────────────────┘
   ┌──────────┐  ┌──────────┐   ┌─────────────────────────────────────┐
   │w-scoring │  │w-report  │   │ Qdrant (vector DB, Phase 12)        │
   └──────────┘  └──────────┘   └─────────────────────────────────────┘
   Observability: Prometheus, Grafana, Loki, OTel Collector, Alertmanager
```

## Isolation of malware-executing workloads (critical)
- **`w-dynamic`** runs on a **dedicated, tainted node pool** — no other workloads.
- **Egress denied by default** (NetworkPolicy); only explicit sink for capture.
- **Ephemeral sandboxes**: one job → one emulator VM → destroyed after.
- Static engines also run **unprivileged, read-only rootfs, seccomp/AppArmor,
  no network** (they only parse bytes).

## Scaling strategy
- API: HPA on RPS/CPU; stateless → linear scale.
- Workers: **KEDA** scales each pool on its queue depth independently.
- Postgres: primary + read replicas; PgBouncer pooling; partition large tables
  (`evidence`, `findings`, `audit_logs`) by time.
- Redis: managed/HA; move to RabbitMQ for durability at scale.
- Object storage: effectively unbounded.

## CI/CD (Phase 14)
GitHub Actions → per-service pipeline: `lint → type → unit → security-scan
(SAST/deps/image) → build image → push → deploy (dev auto, staging on merge,
prod gated approval)`. Progressive delivery (canary) for API; blue/green for workers.
Migrations run as pre-deploy K8s Jobs (Alembic), backward-compatible.

## Backup & DR (Phase 14)
- Postgres: PITR (WAL archiving) + daily snapshots; tested restores.
- Object storage: versioning + cross-region replication.
- Qdrant: snapshot to object storage.
- RTO/RPO targets defined per env; DR runbook + game-days.
