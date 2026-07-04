"""Shared FastAPI dependencies for the API layer."""

from __future__ import annotations

from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.storage import get_storage
from app.storage.base import StorageBackend

DbSession = Annotated[AsyncSession, Depends(get_db)]


def storage_dep() -> StorageBackend:
    return get_storage()


Storage = Annotated[StorageBackend, Depends(storage_dep)]
