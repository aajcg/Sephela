# Object Models & Database Schema

PostgreSQL is the **system of record**. Large/blob artifacts live in object storage;
DB holds references + structured, queryable data. JSONB used where schema is
engine-defined and evolving; promoted to columns when queried often.

## Core object models (conceptual)

- **User / Organization** — tenant, RBAC role.
- **Sample** — the APK itself, deduplicated by `sha256` (one row per unique file).
- **AnalysisJob** — one analysis run of a sample (a sample may be re-analyzed as
  engines improve; jobs are versioned & immutable once complete).
- **StageRun** — execution of one pipeline stage/engine within a job.
- **Evidence** — an Evidence Envelope produced by a StageRun.
- **Finding** — normalized findings (extracted from envelopes for querying).
- **RiskScore** — output of the scoring engine for a job.
- **Report** — rendered artifacts (json/md/pdf) refs.
- **Enrichment** — TI results (Phase 11).
- **AuditLog** — immutable action trail.

## Schema (DDL sketch)

```sql
-- Identity & tenancy
CREATE TABLE organizations (
  id UUID PRIMARY KEY, name TEXT NOT NULL, created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE users (
  id UUID PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES organizations(id),
  email CITEXT UNIQUE NOT NULL,
  hashed_password TEXT,               -- null when SSO-only
  role TEXT NOT NULL DEFAULT 'analyst', -- admin|analyst|viewer (RBAC)
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Deduplicated APK samples
CREATE TABLE samples (
  id UUID PRIMARY KEY,
  sha256 CHAR(64) UNIQUE NOT NULL,     -- dedup key
  sha1 CHAR(40), md5 CHAR(32),
  file_size BIGINT NOT NULL,
  package_name TEXT,                   -- from manifest, nullable pre-analysis
  version_name TEXT, version_code BIGINT,
  storage_uri TEXT NOT NULL,           -- object-storage reference
  first_seen TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES users(id)
);
CREATE INDEX idx_samples_package ON samples(package_name);

-- One analysis run
CREATE TYPE job_status AS ENUM
  ('queued','running','partial','completed','failed','cancelled');
CREATE TABLE analysis_jobs (
  id UUID PRIMARY KEY,
  sample_id UUID NOT NULL REFERENCES samples(id),
  org_id UUID NOT NULL REFERENCES organizations(id),
  requested_by UUID REFERENCES users(id),
  status job_status NOT NULL DEFAULT 'queued',
  pipeline_version TEXT NOT NULL,      -- reproducibility
  priority SMALLINT DEFAULT 5,
  progress SMALLINT DEFAULT 0,         -- 0..100
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  started_at TIMESTAMPTZ, completed_at TIMESTAMPTZ
);
CREATE INDEX idx_jobs_status ON analysis_jobs(status);
CREATE INDEX idx_jobs_sample ON analysis_jobs(sample_id);

-- Per-stage execution
CREATE TYPE stage_status AS ENUM ('pending','running','ok','partial','failed','skipped');
CREATE TABLE stage_runs (
  id UUID PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES analysis_jobs(id) ON DELETE CASCADE,
  engine_name TEXT NOT NULL,           -- static|code_intel|dynamic|threat_intel|ai|scoring
  engine_version TEXT NOT NULL,
  status stage_status NOT NULL DEFAULT 'pending',
  attempt SMALLINT DEFAULT 0,
  started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ,
  error TEXT,
  UNIQUE(job_id, engine_name)
);

-- Evidence envelopes (raw engine output)
CREATE TABLE evidence (
  id UUID PRIMARY KEY,
  stage_run_id UUID NOT NULL REFERENCES stage_runs(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES analysis_jobs(id),
  envelope_version TEXT NOT NULL,
  payload JSONB NOT NULL,              -- validated against contracts/json-schema
  large_artifact_uri TEXT,             -- decompiled source, pcap, etc. in storage
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_evidence_job ON evidence(job_id);
CREATE INDEX idx_evidence_payload ON evidence USING GIN (payload);

-- Normalized findings for querying/aggregation
CREATE TABLE findings (
  id UUID PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES analysis_jobs(id) ON DELETE CASCADE,
  source_engine TEXT NOT NULL,
  type TEXT NOT NULL,                  -- permission|api|url|ip|cert|behavior|signature
  severity TEXT NOT NULL,
  confidence REAL,
  detail TEXT,
  provenance JSONB,
  mitre TEXT[], owasp_mobile TEXT[],
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_findings_job ON findings(job_id);
CREATE INDEX idx_findings_type ON findings(type);

-- Risk score (explainable)
CREATE TABLE risk_scores (
  id UUID PRIMARY KEY,
  job_id UUID UNIQUE NOT NULL REFERENCES analysis_jobs(id) ON DELETE CASCADE,
  score SMALLINT NOT NULL,             -- 0..100
  severity TEXT NOT NULL,              -- benign|suspicious|malicious|critical
  confidence REAL NOT NULL,
  category TEXT,                       -- e.g. banking_trojan, spyware, adware
  breakdown JSONB NOT NULL,            -- weighted contributions (explainability)
  mitre TEXT[], owasp_mobile TEXT[],
  scoring_version TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Threat-intel enrichment (Phase 11)
CREATE TABLE enrichments (
  id UUID PRIMARY KEY,
  job_id UUID REFERENCES analysis_jobs(id) ON DELETE CASCADE,
  ioc_type TEXT NOT NULL,              -- hash|domain|ip|url|cert
  ioc_value TEXT NOT NULL,
  provider TEXT NOT NULL,              -- virustotal|otx|abuseipdb|urlhaus|bazaar
  verdict TEXT, raw JSONB,
  fetched_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ               -- cache TTL
);
CREATE INDEX idx_enrich_ioc ON enrichments(ioc_type, ioc_value);

-- Rendered reports
CREATE TABLE reports (
  id UUID PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES analysis_jobs(id) ON DELETE CASCADE,
  format TEXT NOT NULL,                -- json|markdown|pdf
  storage_uri TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Immutable audit
CREATE TABLE audit_logs (
  id BIGSERIAL PRIMARY KEY,
  actor_id UUID, org_id UUID,
  action TEXT NOT NULL, target_type TEXT, target_id TEXT,
  metadata JSONB, ip INET,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

## Design notes
- **Dedup on `samples.sha256`** — uploading a known APK creates a new *job*, reuses
  the sample and can reuse cached engine evidence (by engine version).
- **Immutable jobs** — completed jobs never mutate; re-analysis = new job. Enables
  audit, reproducibility, and diffing over time.
- **JSONB + GIN** for evolving engine payloads; **normalized `findings`** table for
  fast aggregation/filtering in the dashboard and scoring.
- **Multi-tenant** via `org_id` on all tenant-scoped rows; row-level security path
  documented in `09-security.md`.
- **Vector data (Phase 12)** lives in Qdrant, not PostgreSQL, keyed back by job/report id.
