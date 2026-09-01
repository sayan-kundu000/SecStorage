"""Session Repository for Database Access."""

import uuid
from datetime import UTC, datetime

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.session import Session


class SessionRepository:
    """Data access repository for Session entities and token rotation."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_by_id(self, session_id: uuid.UUID) -> Session | None:
        """Fetch session by ID."""
        return await self.session.get(Session, session_id)

    async def get_by_token_hash(self, token_hash: str) -> Session | None:
        """Fetch active session matching SHA-256 refresh token hash."""
        stmt = select(Session).where(Session.refresh_token_hash == token_hash)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def create(self, session_entity: Session) -> Session:
        """Persist a new Session entity."""
        self.session.add(session_entity)
        await self.session.flush()
        return session_entity

    async def revoke(self, session_id: uuid.UUID) -> None:
        """Mark specific session as revoked."""
        now = datetime.now(UTC)
        stmt = (
            update(Session)
            .where(Session.id == session_id, Session.revoked_at.is_(None))
            .values(revoked_at=now)
        )
        await self.session.execute(stmt)

    async def revoke_all_for_user(self, user_id: uuid.UUID) -> None:
        """Revoke all active sessions for a user."""
        now = datetime.now(UTC)
        stmt = (
            update(Session)
            .where(Session.user_id == user_id, Session.revoked_at.is_(None))
            .values(revoked_at=now)
        )
        await self.session.execute(stmt)

    async def get_active_user_sessions(self, user_id: uuid.UUID) -> list[Session]:
        """Fetch active non-expired sessions for user."""
        now = datetime.now(UTC)
        stmt = (
            select(Session)
            .where(
                Session.user_id == user_id,
                Session.revoked_at.is_(None),
                Session.expires_at > now,
            )
            .order_by(Session.created_at.desc())
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())
