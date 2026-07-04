"""Upload endpoint — accept an APK and start analysis (Phase 4)."""

from __future__ import annotations

from fastapi import APIRouter, File, UploadFile, status

from app.api.deps import DbSession, Storage
from app.core.security import CurrentUserDep
from app.events.producer import dispatch_analysis
from app.schemas.jobs import UploadResponse
from app.services.upload import UploadService

router = APIRouter(prefix="/uploads", tags=["uploads"])


@router.post("", response_model=UploadResponse, status_code=status.HTTP_202_ACCEPTED)
async def upload_apk(
    session: DbSession,
    storage: Storage,
    _user: CurrentUserDep,
    file: UploadFile = File(...),
) -> UploadResponse:
    """Validate, deduplicate, store, persist, and enqueue an APK for analysis.

    Returns 202 with the job id. NOTE: ``created_by``/``org_id`` are left null
    while auth is a placeholder (the token principal is not yet a DB user row);
    they populate automatically once real users land, without route changes.
    """
    data = await file.read()
    svc = UploadService(session, storage)
    result = await svc.ingest(data, filename=file.filename)

    # Commit the job row BEFORE enqueuing so the worker can never race ahead of
    # a durable record (error-recovery guarantee).
    await session.commit()
    dispatch_analysis(result.job_id)

    return UploadResponse(
        job_id=result.job_id,
        sample_id=result.sample_id,
        sha256=result.sha256,
        status=result.status,
        duplicate=result.duplicate,
    )
