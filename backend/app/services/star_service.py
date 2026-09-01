"""Domain Star Service managing favorite markers and starred resource listing."""

import json
import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ResourceNotFoundError, ValidationError
from app.core.permissions import Action, ResourceType
from app.models.activity import Activity
from app.models.star import Star
from app.models.user import User
from app.repositories.file_repository import FileRepository
from app.repositories.folder_repository import FolderRepository
from app.repositories.star_repository import StarRepository
from app.schemas.pagination import PaginationMeta
from app.schemas.star import StarResponse, StarredItemResponse, StarredListResponseData
from app.services.authorization_service import AuthorizationService


class StarService:
    """Domain service managing resource favorite starring, unstarring, and listing."""

    def __init__(self, db_session: AsyncSession) -> None:
        self.db_session = db_session
        self.star_repo = StarRepository(db_session)
        self.file_repo = FileRepository(db_session)
        self.folder_repo = FolderRepository(db_session)
        self.auth_service = AuthorizationService(db_session)

    async def star_resource(
        self,
        user: User,
        file_id: uuid.UUID | None = None,
        folder_id: uuid.UUID | None = None,
    ) -> StarResponse:
        """Stars a file or folder as favorite after authorization check."""
        if (file_id is None and folder_id is None) or (file_id is not None and folder_id is not None):
            raise ValidationError("Exactly one of 'file_id' or 'folder_id' must be provided")

        if file_id is not None:
            file_ent = await self.file_repo.get_by_id(file_id)
            if not file_ent or file_ent.deleted_at is not None:
                raise ResourceNotFoundError("Target file entity not found or deleted")

            await self.auth_service.require_resource_permission(
                user=user,
                resource=file_ent,
                resource_type=ResourceType.FILE,
                action=Action.READ,
            )

            existing = await self.star_repo.find_file_star(user.id, file_id)
            if existing:
                return StarResponse(
                    id=existing.id,
                    user_id=user.id,
                    file_id=file_id,
                    folder_id=None,
                    resource_id=file_id,
                    resource_type="file",
                    starred=True,
                    created_at=existing.created_at,
                )

            star = Star(
                user_id=user.id,
                file_id=file_id,
                folder_id=None,
            )
            saved_star = await self.star_repo.create(star)

            # Audit log
            activity = Activity(
                user_id=user.id,
                action="STARRED_RESOURCE",
                resource_type="file",
                resource_id=file_id,
                metadata_json=json.dumps({"file_name": file_ent.name}),
            )
            self.db_session.add(activity)
            await self.db_session.commit()

            return StarResponse(
                id=saved_star.id,
                user_id=user.id,
                file_id=file_id,
                folder_id=None,
                resource_id=file_id,
                resource_type="file",
                starred=True,
                created_at=saved_star.created_at,
            )

        else:
            folder_ent = await self.folder_repo.get_by_id(folder_id)
            if not folder_ent or folder_ent.deleted_at is not None:
                raise ResourceNotFoundError("Target folder entity not found or deleted")

            await self.auth_service.require_resource_permission(
                user=user,
                resource=folder_ent,
                resource_type=ResourceType.FOLDER,
                action=Action.READ,
            )

            existing = await self.star_repo.find_folder_star(user.id, folder_id)
            if existing:
                return StarResponse(
                    id=existing.id,
                    user_id=user.id,
                    file_id=None,
                    folder_id=folder_id,
                    resource_id=folder_id,
                    resource_type="folder",
                    starred=True,
                    created_at=existing.created_at,
                )

            star = Star(
                user_id=user.id,
                file_id=None,
                folder_id=folder_id,
            )
            saved_star = await self.star_repo.create(star)

            # Audit log
            activity = Activity(
                user_id=user.id,
                action="STARRED_RESOURCE",
                resource_type="folder",
                resource_id=folder_id,
                metadata_json=json.dumps({"folder_name": folder_ent.name}),
            )
            self.db_session.add(activity)
            await self.db_session.commit()

            return StarResponse(
                id=saved_star.id,
                user_id=user.id,
                file_id=None,
                folder_id=folder_id,
                resource_id=folder_id,
                resource_type="folder",
                starred=True,
                created_at=saved_star.created_at,
            )

    async def unstar_resource(
        self,
        user: User,
        file_id: uuid.UUID | None = None,
        folder_id: uuid.UUID | None = None,
    ) -> bool:
        """Unstars a file or folder as favorite."""
        if (file_id is None and folder_id is None) or (file_id is not None and folder_id is not None):
            raise ValidationError("Exactly one of 'file_id' or 'folder_id' must be provided")

        if file_id is not None:
            removed = await self.star_repo.delete_by_file_id(user.id, file_id)
            if removed:
                activity = Activity(
                    user_id=user.id,
                    action="UNSTARRED_RESOURCE",
                    resource_type="file",
                    resource_id=file_id,
                )
                self.db_session.add(activity)
                await self.db_session.commit()
            return removed
        else:
            removed = await self.star_repo.delete_by_folder_id(user.id, folder_id)
            if removed:
                activity = Activity(
                    user_id=user.id,
                    action="UNSTARRED_RESOURCE",
                    resource_type="folder",
                    resource_id=folder_id,
                )
                self.db_session.add(activity)
                await self.db_session.commit()
            return removed

    async def list_starred(
        self,
        user: User,
        cursor: str | None = None,
        limit: int = 20,
    ) -> StarredListResponseData:
        """Returns paginated list of resources starred by requesting user."""
        offset = 0
        if cursor and cursor.isdigit():
            offset = int(cursor)

        items_dict, total_count = await self.star_repo.list_starred_items(
            user_id=user.id, offset=offset, limit=limit
        )

        starred_items = [StarredItemResponse.model_validate(item) for item in items_dict]
        has_more = (offset + limit) < total_count
        next_cursor = str(offset + limit) if has_more else None

        return StarredListResponseData(
            items=starred_items,
            pagination=PaginationMeta(
                has_more=has_more,
                next_cursor=next_cursor,
                total_count=total_count,
            ),
        )
