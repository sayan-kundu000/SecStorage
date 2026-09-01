"""Folder Repository for Hierarchy & Navigation Access."""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.folder import Folder


class FolderRepository:
    """Data access repository for Folder entities and directory tree navigation."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_by_id(self, folder_id: uuid.UUID) -> Folder | None:
        """Fetch folder by ID."""
        return await self.session.get(Folder, folder_id)

    async def get_active_subfolders(
        self, user_id: uuid.UUID, parent_id: uuid.UUID | None
    ) -> list[Folder]:
        """Fetch non-deleted subfolders under owner and parent folder."""
        stmt = (
            select(Folder)
            .where(
                Folder.user_id == user_id,
                Folder.parent_id == parent_id,
                Folder.deleted_at.is_(None),
            )
            .order_by(Folder.name.asc())
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def create(self, folder: Folder) -> Folder:
        """Persist a new Folder entity."""
        self.session.add(folder)
        await self.session.flush()
        return folder
