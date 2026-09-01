"""Activity Audit Trail SQLAlchemy 2.x Repository."""

import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.activity import Activity


class ActivityRepository:
    """Data access repository for Activity logging and timeline queries."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(self, activity: Activity) -> Activity:
        """Persists a new Activity audit log entry."""
        self.session.add(activity)
        await self.session.flush()
        return activity

    async def list_user_activities(
        self, user_id: uuid.UUID, limit: int = 50, offset: int = 0
    ) -> tuple[list[Activity], int]:
        """Queries timeline of user-initiated activities with total count."""
        base_stmt = select(Activity).where(Activity.user_id == user_id)

        count_stmt = select(func.count()).select_from(base_stmt.subquery())
        total = (await self.session.execute(count_stmt)).scalar() or 0

        list_stmt = base_stmt.order_by(Activity.created_at.desc()).limit(limit).offset(offset)
        items = list((await self.session.execute(list_stmt)).scalars().all())

        return items, total

    async def list_resource_activities(
        self, resource_type: str, resource_id: uuid.UUID, limit: int = 50, offset: int = 0
    ) -> tuple[list[Activity], int]:
        """Queries timeline of events attached to a specific resource."""
        base_stmt = select(Activity).where(
            Activity.resource_type == resource_type,
            Activity.resource_id == resource_id,
        )

        count_stmt = select(func.count()).select_from(base_stmt.subquery())
        total = (await self.session.execute(count_stmt)).scalar() or 0

        list_stmt = base_stmt.order_by(Activity.created_at.desc()).limit(limit).offset(offset)
        items = list((await self.session.execute(list_stmt)).scalars().all())

        return items, total

    async def list_audit_logs(self, limit: int = 50, offset: int = 0) -> tuple[list[Activity], int]:
        """Queries all security audit log events system-wide."""
        base_stmt = select(Activity)

        count_stmt = select(func.count()).select_from(base_stmt.subquery())
        total = (await self.session.execute(count_stmt)).scalar() or 0

        list_stmt = base_stmt.order_by(Activity.created_at.desc()).limit(limit).offset(offset)
        items = list((await self.session.execute(list_stmt)).scalars().all())

        return items, total
