"""File Version SQLAlchemy 2.x Repository."""

import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.file_version import FileVersion


class VersionRepository:
    """Data access repository for FileVersion entity operations."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(self, version: FileVersion) -> FileVersion:
        """Persists a new FileVersion entity."""
        self.session.add(version)
        await self.session.flush()
        return version

    async def get_by_id(self, version_id: uuid.UUID) -> FileVersion | None:
        """Fetches a single FileVersion entity by ID."""
        stmt = select(FileVersion).where(FileVersion.id == version_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_file_and_number(
        self, file_id: uuid.UUID, version_number: int
    ) -> FileVersion | None:
        """Fetches a specific version number belonging to a file."""
        stmt = select(FileVersion).where(
            FileVersion.file_id == file_id,
            FileVersion.version_number == version_number,
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_max_version_number(self, file_id: uuid.UUID) -> int:
        """Returns highest version_number for a file, or 0 if no versions exist."""
        stmt = select(func.coalesce(func.max(FileVersion.version_number), 0)).where(
            FileVersion.file_id == file_id
        )
        result = await self.session.execute(stmt)
        return result.scalar() or 0

    async def list_by_file_id(
        self, file_id: uuid.UUID, limit: int = 50, offset: int = 0
    ) -> list[FileVersion]:
        """Lists file versions in descending order of version number."""
        stmt = (
            select(FileVersion)
            .where(FileVersion.file_id == file_id)
            .order_by(FileVersion.version_number.desc())
            .limit(limit)
            .offset(offset)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def count_by_file_id(self, file_id: uuid.UUID) -> int:
        """Counts total historical versions for a file."""
        stmt = (
            select(func.count())
            .select_from(FileVersion)
            .where(FileVersion.file_id == file_id)
        )
        result = await self.session.execute(stmt)
        return result.scalar() or 0
