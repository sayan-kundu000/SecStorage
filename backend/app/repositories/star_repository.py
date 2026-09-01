"""Star Repository for Favorite Marker Data Access."""

import uuid
from datetime import UTC, datetime

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.file import File
from app.models.folder import Folder
from app.models.star import Star


class StarRepository:
    """Data access repository for favorite Star markers and starred listings."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_by_id(self, star_id: uuid.UUID) -> Star | None:
        """Fetch star marker by primary key ID."""
        return await self.session.get(Star, star_id)

    async def find_file_star(self, user_id: uuid.UUID, file_id: uuid.UUID) -> Star | None:
        """Find existing star marker for user and file ID."""
        stmt = select(Star).where(
            Star.user_id == user_id,
            Star.file_id == file_id,
        )
        res = await self.session.execute(stmt)
        return res.scalar_one_or_none()

    async def find_folder_star(self, user_id: uuid.UUID, folder_id: uuid.UUID) -> Star | None:
        """Find existing star marker for user and folder ID."""
        stmt = select(Star).where(
            Star.user_id == user_id,
            Star.folder_id == folder_id,
        )
        res = await self.session.execute(stmt)
        return res.scalar_one_or_none()

    async def create(self, star: Star) -> Star:
        """Persist a new favorite star marker."""
        self.session.add(star)
        await self.session.flush()
        return star

    async def delete_star(self, star: Star) -> None:
        """Delete star marker."""
        await self.session.delete(star)
        await self.session.flush()

    async def delete_by_file_id(self, user_id: uuid.UUID, file_id: uuid.UUID) -> bool:
        """Unstars file for user."""
        stmt = delete(Star).where(Star.user_id == user_id, Star.file_id == file_id)
        res = await self.session.execute(stmt)
        return res.rowcount > 0

    async def delete_by_folder_id(self, user_id: uuid.UUID, folder_id: uuid.UUID) -> bool:
        """Unstars folder for user."""
        stmt = delete(Star).where(Star.user_id == user_id, Star.folder_id == folder_id)
        res = await self.session.execute(stmt)
        return res.rowcount > 0

    async def get_starred_resource_ids(
        self,
        user_id: uuid.UUID,
        file_ids: list[uuid.UUID],
        folder_ids: list[uuid.UUID],
    ) -> tuple[set[uuid.UUID], set[uuid.UUID]]:
        """Batch loads starred file and folder IDs for user to avoid N+1 query overhead."""
        starred_files: set[uuid.UUID] = set()
        starred_folders: set[uuid.UUID] = set()

        if not file_ids and not folder_ids:
            return starred_files, starred_folders

        conditions = []
        if file_ids:
            conditions.append(Star.file_id.in_(file_ids))
        if folder_ids:
            conditions.append(Star.folder_id.in_(folder_ids))

        from sqlalchemy import or_

        stmt = select(Star.file_id, Star.folder_id).where(
            Star.user_id == user_id,
            or_(*conditions),
        )
        result = await self.session.execute(stmt)

        for f_id, fold_id in result.all():
            if f_id is not None:
                starred_files.add(f_id)
            if fold_id is not None:
                starred_folders.add(fold_id)

        return starred_files, starred_folders

    async def list_starred_items(
        self,
        user_id: uuid.UUID,
        offset: int = 0,
        limit: int = 20,
    ) -> tuple[list[dict], int]:
        """Lists starred active/trashed files and folders for user ordered by star creation timestamp."""
        # 1. Query starred files for user
        file_stmt = (
            select(
                File.id.label("id"),
                File.name.label("name"),
                File.folder_id.label("folder_id"),
                File.mime_type.label("mime_type"),
                File.size_bytes.label("size_bytes"),
                File.created_at.label("created_at"),
                File.updated_at.label("updated_at"),
                File.deleted_at.label("deleted_at"),
                Star.created_at.label("starred_at"),
            )
            .join(Star, Star.file_id == File.id)
            .where(Star.user_id == user_id)
        )
        file_res = await self.session.execute(file_stmt)

        # 2. Query starred folders for user
        folder_stmt = (
            select(
                Folder.id.label("id"),
                Folder.name.label("name"),
                Folder.parent_id.label("folder_id"),
                Folder.created_at.label("created_at"),
                Folder.updated_at.label("updated_at"),
                Folder.deleted_at.label("deleted_at"),
                Star.created_at.label("starred_at"),
            )
            .join(Star, Star.folder_id == Folder.id)
            .where(Star.user_id == user_id)
        )
        folder_res = await self.session.execute(folder_stmt)

        items: list[dict] = []
        for row in file_res.all():
            items.append(
                {
                    "id": row.id,
                    "name": row.name,
                    "type": "file",
                    "folder_id": row.folder_id,
                    "mime_type": row.mime_type,
                    "size_bytes": row.size_bytes,
                    "starred": True,
                    "trashed": row.deleted_at is not None,
                    "created_at": row.created_at,
                    "updated_at": row.updated_at,
                    "starred_at": row.starred_at,
                }
            )

        for row in folder_res.all():
            items.append(
                {
                    "id": row.id,
                    "name": row.name,
                    "type": "folder",
                    "folder_id": row.folder_id,
                    "mime_type": None,
                    "size_bytes": None,
                    "starred": True,
                    "trashed": row.deleted_at is not None,
                    "created_at": row.created_at,
                    "updated_at": row.updated_at,
                    "starred_at": row.starred_at,
                }
            )

        # Sort combined items by starred_at descending
        items.sort(key=lambda x: x["starred_at"], reverse=True)
        total_count = len(items)

        paginated_items = items[offset : offset + limit]
        return paginated_items, total_count
