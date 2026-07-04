"""Upload + job request/response schemas (docs/architecture/06-api-spec.md)."""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.db.models.analysis import JobStatus, StageStatus


class UploadResponse(BaseModel):
    job_id: uuid.UUID
    sample_id: uuid.UUID
    sha256: str
    status: JobStatus
    duplicate: bool


class StageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    engine: str
    status: StageStatus
    started_at: datetime | None = None
    finished_at: datetime | None = None


class JobOut(BaseModel):
    job_id: uuid.UUID
    sample_id: uuid.UUID
    status: JobStatus
    progress: int
    pipeline_version: str
    stages: list[StageOut]
    error: str | None = None
    created_at: datetime


class JobListOut(BaseModel):
    items: list[JobOut]
    next_cursor: str | None = None
