// API contract types.
//
// These mirror backend contracts (docs/architecture/06-api-spec.md). In a later
// phase these are GENERATED from contracts/openapi — hand-written here for now
// so the whole dashboard is typed against a stable surface.

export interface Token {
  access_token: string;
  token_type: string;
}

export type Role = "admin" | "analyst" | "viewer";

export interface UserOut {
  id: string;
  email: string;
  role: Role;
  org_id: string | null;
}

export type JobStatus =
  | "queued"
  | "running"
  | "partial"
  | "completed"
  | "failed"
  | "cancelled";

export type StageStatus =
  | "pending"
  | "running"
  | "ok"
  | "partial"
  | "failed"
  | "skipped";

export interface StageInfo {
  engine: string;
  status: StageStatus;
  started_at?: string | null;
  finished_at?: string | null;
}

export interface Job {
  job_id: string;
  sample_id: string;
  status: JobStatus;
  progress: number;
  pipeline_version?: string;
  stages: StageInfo[];
  error?: string | null;
  created_at: string;
}

export interface Paginated<T> {
  items: T[];
  next_cursor: string | null;
}

// RFC 9457 Problem Details — the error envelope from the backend.
export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  trace_id?: string | null;
  errors?: unknown;
}
