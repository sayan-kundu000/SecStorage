"""Security Audit Service managing append-only security logs and admin audit trail access."""

import json
import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ForbiddenError
from app.models.activity import Activity
from app.models.user import User
from app.repositories.activity_repository import ActivityRepository
from app.schemas.activity import ActivityListResponse, ActivityResponse


class AuditService:
    """Domain service for security audit trail logging and compliance reporting."""

    def __init__(self, db_session: AsyncSession) -> None:
        self.db_session = db_session
        self.activity_repo = ActivityRepository(db_session)

    async def log_security_event(
        self,
        user_id: uuid.UUID,
        action: str,
        resource_type: str,
        resource_id: uuid.UUID,
        metadata: dict | None = None,
        ip_address: str | None = None,
    ) -> Activity:
        """Appends an immutable security audit record."""
        metadata_str = json.dumps(metadata) if metadata else None
        audit_entry = Activity(
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            metadata_json=metadata_str,
            ip_address=ip_address,
        )
        saved = await self.activity_repo.create(audit_entry)
        return saved

    async def list_audit_trail(
        self, user: User, page: int = 1, page_size: int = 50
    ) -> ActivityListResponse:
        """Returns security audit log entries. Admin/Audit permissions required."""
        if not user.is_active or not user.is_admin:
            raise ForbiddenError("Audit log access is restricted to system administrators")

        offset = (max(page, 1) - 1) * page_size
        items, total = await self.activity_repo.list_audit_logs(limit=page_size, offset=offset)
        return ActivityListResponse(
            items=[ActivityResponse.model_validate(act) for act in items],
            total=total,
            page=page,
            page_size=page_size,
        )
