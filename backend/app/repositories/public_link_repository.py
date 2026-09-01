"""Public Link Repository for Data Access."""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.link_share import LinkShare


class PublicLinkRepository:
    """Data access repository for public share link token records."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_by_id(self, link_id: uuid.UUID) -> LinkShare | None:
        """Fetch link share record by primary key ID."""
        stmt = (
            select(LinkShare)
            .options(
                selectinload(LinkShare.file),
                selectinload(LinkShare.folder),
                selectinload(LinkShare.creator),
            )
            .where(LinkShare.id == link_id)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_token(self, token: str) -> LinkShare | None:
        """Fetch active public link share by unique token string."""
        stmt = (
            select(LinkShare)
            .options(
                selectinload(LinkShare.file),
                selectinload(LinkShare.folder),
                selectinload(LinkShare.creator),
            )
            .where(LinkShare.token == token)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_active_links_for_file(self, file_id: uuid.UUID) -> list[LinkShare]:
        """List active public links created for a file."""
        stmt = (
            select(LinkShare)
            .where(
                LinkShare.file_id == file_id,
                LinkShare.is_active.is_(True),
            )
            .order_by(LinkShare.created_at.desc())
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def list_active_links_for_folder(self, folder_id: uuid.UUID) -> list[LinkShare]:
        """List active public links created for a folder."""
        stmt = (
            select(LinkShare)
            .where(
                LinkShare.folder_id == folder_id,
                LinkShare.is_active.is_(True),
            )
            .order_by(LinkShare.created_at.desc())
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def create(self, link_entity: LinkShare) -> LinkShare:
        """Persist new public link entity."""
        self.session.add(link_entity)
        await self.session.flush()
        return link_entity

    async def deactivate(self, link_entity: LinkShare) -> None:
        """Deactivates public link token."""
        link_entity.is_active = False
        await self.session.flush()
