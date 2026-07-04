"""Queue producers — the API layer's seam to the async pipeline.

Keeping dispatch here (rather than importing Celery tasks into routes) means the
API depends on an intent ("analyze this job"), not on worker internals.
"""

from __future__ import annotations

import uuid

from app.core.logging import get_logger

logger = get_logger(__name__)


def dispatch_analysis(job_id: uuid.UUID) -> None:
    """Enqueue a job for analysis. Call only AFTER the job row is committed."""
    # Imported lazily so the API process doesn't need worker task modules at
    # import time (and to avoid circular imports).
    from app.tasks.pipeline import analyze

    analyze.delay(str(job_id))
    logger.info("job_enqueued", job_id=str(job_id))
