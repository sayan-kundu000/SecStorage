"""Activity Timeline Service managing event logging and paginated feed retrieval."""

import json
import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import Action, ResourceType
from app.models.activity import Activity
from app.models.file import File
from app.models.folder import Folder
from app.models.user import User
from app.repositories.activity_repository import ActivityRepository
from app.repositories.file_repository import FileRepository
from app.repositories.folder_repository import FolderRepository
from app.schemas.activity import ActivityListResponse, ActivityResponse
from app.services.authorization_service import AuthorizationService


class ActivityService:
    """Domain service for user activity logging and permission-aware timeline access."""

    def __init__(self, db_session: AsyncSession) -> None:
        self.db_session = db_session
        self.activity_repo = ActivityRepository(db_session)
        self.file_repo = FileRepository(db_session)
        self.folder_repo = FolderRepository(db_session)
        self.auth_service = AuthorizationService(db_session)

    async def log_activity(
        self,
        user_id: uuid.UUID,
        action: str,
        resource_type: str,
        resource_id: uuid.UUID,
        metadata: dict | None = None,
        ip_address: str | None = None,
    ) -> Activity:
        """Records a user activity event in the database."""
        metadata_str = json.dumps(metadata) if metadata else None
        activity = Activity(
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            metadata_json=metadata_str,
            ip_address=ip_address,
        )
        saved = await self.activity_repo.create(activity)
        return saved

    async def list_user_activities(
        self, user: User, page: int = 1, page_size: int = 50
    ) -> ActivityListResponse:
        """Returns paginated activity timeline for the requesting user."""
        offset = (max(page, 1) - 1) * page_size
        items, total = await self.activity_repo.list_user_activities(
            user_id=user.id, limit=page_size, offset=offset
        )
        return ActivityListResponse(
            items=[ActivityResponse.model_validate(act) for act in items],
            total=total,
            page=page,
            page_size=page_size,
        )

    async def list_resource_activities(
        self,
        user: User,
        resource_type: str,
        resource_id: uuid.UUID,
        page: int = 1,
        page_size: int = 50,
    ) -> ActivityListResponse:
        """Enforces READ authorization on target resource and lists its activity history."""
        res_type_str = resource_type.upper()
        if res_type_str == "FILE":
            file_ent = await self.file_repo.get_by_id(resource_id)
            if file_ent:
                await self.auth_service.require_resource_permission(
                    user=user,
                    resource=file_ent,
                    resource_type=ResourceType.FILE,
                    action=Action.READ,
                )
        elif res_type_str == "FOLDER":
            folder_ent = await self.folder_repo.get_by_id(resource_id)
            if folder_ent:
                await self.auth_service.require_resource_permission(
                    user=user,
                    resource=folder_ent,
                    resource_type=ResourceType.FOLDER,
                    action=Action.READ,
                )

        offset = (max(page, 1) - 1) * page_size
        items, total = await self.activity_repo.list_resource_activities(
            resource_type=res_type_str, resource_id=resource_id, limit=page_size, offset=offset
        )
        return ActivityListResponse(
            items=[ActivityResponse.model_validate(act) for act in items],
            total=total,
            page=page,
            page_size=page_size,
        )
