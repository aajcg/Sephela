"""Analysis pipeline task (Phase 4 skeleton).

Phase 4 wires the orchestration entrypoint and progress tracking only — it does
NOT run any analysis. Real engine stages (static, code-intel, AI, scoring,
reporting) are appended in their phases per docs/architecture/05-messaging.md.

The task is idempotent and DB-driven: it loads job state, marks running, and
(for now) marks completed. It never trusts the previous message payload beyond
the job id, so it is safe to retry/resume.
"""

from __future__ import annotations

import asyncio
from datetime import datetime, timezone

from sqlalchemy import select

from app.core.logging import get_logger
from app.db.models.analysis import AnalysisJob, JobStatus
from app.db.session import AsyncSessionLocal
from app.tasks.celery_app import celery_app

logger = get_logger(__name__)


async def _run(job_id: str) -> str:
    async with AsyncSessionLocal() as session:
        job = (
            await session.execute(select(AnalysisJob).where(AnalysisJob.id == job_id))
        ).scalar_one_or_none()
        if job is None:
            logger.warning("pipeline_job_missing", job_id=job_id)
            return "missing"
        if job.status in (JobStatus.completed, JobStatus.cancelled):
            return job.status.value  # idempotent no-op

        job.status = JobStatus.running
        job.started_at = datetime.now(timezone.utc)
        job.progress = 0
        await session.commit()

        # --- Phase 5+ engine stages are dispatched here. ---
        # Placeholder: no analysis yet. Mark the job completed so the end-to-end
        # upload → queue → status flow is observable now.
        job.status = JobStatus.completed
        job.progress = 100
        job.completed_at = datetime.now(timezone.utc)
        await session.commit()
        logger.info("pipeline_completed_placeholder", job_id=job_id)
        return job.status.value


@celery_app.task(
    name="pipeline.analyze",
    queue="intake",
    bind=True,
    max_retries=3,
    default_retry_delay=10,
    acks_late=True,
)
def analyze(self, job_id: str) -> str:  # type: ignore[no-untyped-def]
    """Entrypoint task for a job. Retries transient failures with backoff."""
    try:
        return asyncio.run(_run(job_id))
    except Exception as exc:  # noqa: BLE001
        logger.exception("pipeline_error", job_id=job_id)
        raise self.retry(exc=exc) from exc
