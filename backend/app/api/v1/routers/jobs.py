"""Job status API (Phase 4) — list, retrieve, cancel."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Query

from app.api.deps import DbSession
from app.core.exceptions import ConflictError, NotFoundError
from app.core.security import CurrentUserDep
from app.db.models.analysis import AnalysisJob, JobStatus
from app.repositories.samples import JobRepository
from app.schemas.jobs import JobListOut, JobOut, StageOut

router = APIRouter(prefix="/jobs", tags=["jobs"])

_ACTIVE = {JobStatus.queued, JobStatus.running}


def _to_out(job: AnalysisJob) -> JobOut:
    return JobOut(
        job_id=job.id,
        sample_id=job.sample_id,
        status=job.status,
        progress=job.progress,
        pipeline_version=job.pipeline_version,
        stages=[
            StageOut(
                engine=s.engine_name,
                status=s.status,
                started_at=s.started_at,
                finished_at=s.finished_at,
            )
            for s in sorted(job.stages, key=lambda s: s.created_at)
        ],
        error=job.error,
        created_at=job.created_at,
    )


@router.get("", response_model=JobListOut)
async def list_jobs(
    session: DbSession,
    _user: CurrentUserDep,
    status: JobStatus | None = None,
    limit: int = Query(50, ge=1, le=200),
) -> JobListOut:
    jobs = await JobRepository(session).list(status=status, limit=limit)
    return JobListOut(items=[_to_out(j) for j in jobs], next_cursor=None)


@router.get("/{job_id}", response_model=JobOut)
async def get_job(session: DbSession, _user: CurrentUserDep, job_id: uuid.UUID) -> JobOut:
    job = await JobRepository(session).get(job_id)
    if job is None:
        raise NotFoundError("Job not found.")
    return _to_out(job)


@router.post("/{job_id}/cancel", response_model=JobOut)
async def cancel_job(session: DbSession, _user: CurrentUserDep, job_id: uuid.UUID) -> JobOut:
    repo = JobRepository(session)
    job = await repo.get(job_id)
    if job is None:
        raise NotFoundError("Job not found.")
    if job.status not in _ACTIVE:
        raise ConflictError(f"Job in status '{job.status.value}' cannot be cancelled.")
    job.status = JobStatus.cancelled
    job.completed_at = datetime.now(timezone.utc)
    await session.commit()
    return _to_out(job)
