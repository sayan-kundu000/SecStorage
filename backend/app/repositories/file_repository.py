"""File Repository for Data Access."""

import uuid
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.file import File


class FileRepository:
    """Data access repository for File entities."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_by_id(self, file_id: uuid.UUID) -> File | None:
        """Fetch file metadata by primary key ID."""
        return await self.session.get(File, file_id)

    async def get_active_files(self, user_id: uuid.UUID, folder_id: uuid.UUID | None) -> list[File]:
        """Fetch active non-deleted files under owner and parent folder."""
        stmt = (
            select(File)
            .where(
                File.user_id == user_id,
                File.folder_id == folder_id,
                File.deleted_at.is_(None),
            )
            .order_by(File.name.asc())
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def create(self, file: File) -> File:
        """Persist a new File entity."""
        self.session.add(file)
        await self.session.flush()
        return file

    async def soft_delete(self, file_id: uuid.UUID) -> bool:
        """Soft-deletes file entity by setting deleted_at timestamp."""
        file_ent = await self.get_by_id(file_id)
        if file_ent and file_ent.deleted_at is None:
            file_ent.deleted_at = datetime.now(UTC)
            await self.session.flush()
            return True
        return False
