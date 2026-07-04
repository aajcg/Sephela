"""Data access for samples + analysis jobs (persistence layer).

Business logic stays in services; SQL/session mechanics live here.
"""

from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.models.analysis import AnalysisJob, JobStatus, Sample, StageRun


class SampleRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_by_sha256(self, sha256: str) -> Sample | None:
        result = await self.session.execute(select(Sample).where(Sample.sha256 == sha256))
        return result.scalar_one_or_none()

    async def create(self, sample: Sample) -> Sample:
        self.session.add(sample)
        await self.session.flush()
        return sample


class JobRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(self, job: AnalysisJob) -> AnalysisJob:
        self.session.add(job)
        await self.session.flush()
        return job

    async def get(self, job_id: uuid.UUID) -> AnalysisJob | None:
        result = await self.session.execute(
            select(AnalysisJob)
            .where(AnalysisJob.id == job_id)
            .options(selectinload(AnalysisJob.stages))
        )
        return result.scalar_one_or_none()

    async def list(
        self, *, status: JobStatus | None = None, limit: int = 50
    ) -> list[AnalysisJob]:
        stmt = (
            select(AnalysisJob)
            .options(selectinload(AnalysisJob.stages))
            .order_by(AnalysisJob.created_at.desc())
            .limit(limit)
        )
        if status is not None:
            stmt = stmt.where(AnalysisJob.status == status)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def add_stage(self, stage: StageRun) -> StageRun:
        self.session.add(stage)
        await self.session.flush()
        return stage
