"""Share Repository for Database Access and User Sharing Permissions."""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.share import Share


class ShareRepository:
    """Data access repository for resource sharing permission grants."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_by_id(self, share_id: uuid.UUID) -> Share | None:
        """Fetch share record by ID with preloaded relationships."""
        stmt = (
            select(Share)
            .options(
                selectinload(Share.grantee),
                selectinload(Share.grantor),
                selectinload(Share.file),
                selectinload(Share.folder),
            )
            .where(Share.id == share_id)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_file_share_for_user(self, file_id: uuid.UUID, user_id: uuid.UUID) -> Share | None:
        """Fetch explicit share permission record for file and user (grantee)."""
        stmt = select(Share).where(
            Share.file_id == file_id,
            Share.grantee_id == user_id,
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_folder_share_for_user(
        self, folder_id: uuid.UUID, user_id: uuid.UUID
    ) -> Share | None:
        """Fetch explicit share permission record for folder and user (grantee)."""
        stmt = select(Share).where(
            Share.folder_id == folder_id,
            Share.grantee_id == user_id,
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_shares_for_file(self, file_id: uuid.UUID) -> list[Share]:
        """Fetch all user shares granted for a file."""
        stmt = (
            select(Share)
            .options(selectinload(Share.grantee))
            .where(Share.file_id == file_id)
            .order_by(Share.created_at.desc())
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def list_shares_for_folder(self, folder_id: uuid.UUID) -> list[Share]:
        """Fetch all user shares granted for a folder."""
        stmt = (
            select(Share)
            .options(selectinload(Share.grantee))
            .where(Share.folder_id == folder_id)
            .order_by(Share.created_at.desc())
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def create(self, share_entity: Share) -> Share:
        """Persist new Share permission entity."""
        self.session.add(share_entity)
        await self.session.flush()
        return share_entity

    async def delete(self, share_entity: Share) -> None:
        """Delete share permission record."""
        await self.session.delete(share_entity)
        await self.session.flush()

    async def list_shares_for_grantee(self, grantee_id: uuid.UUID) -> list[Share]:
        """Fetch all active resource shares granted to target user."""
        stmt = (
            select(Share)
            .options(
                selectinload(Share.grantor),
                selectinload(Share.file),
                selectinload(Share.folder),
            )
            .where(Share.grantee_id == grantee_id)
            .order_by(Share.created_at.desc())
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())
