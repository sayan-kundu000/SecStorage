"""Domain Trash Service managing soft-deletion, restoration with conflict resolution, and permanent purging."""

import json
import uuid
from datetime import UTC, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictError, ResourceNotFoundError, ValidationError
from app.core.permissions import Action, ResourceType
from app.models.activity import Activity
from app.models.user import User
from app.repositories.file_repository import FileRepository
from app.repositories.folder_repository import FolderRepository
from app.repositories.star_repository import StarRepository
from app.repositories.trash_repository import TrashRepository
from app.schemas.pagination import PaginationMeta
from app.schemas.trash import RestoreResponse, TrashItemResponse, TrashListResponseData
from app.services.authorization_service import AuthorizationService
from app.services.storage_service import StorageService


class TrashService:
    """Domain service orchestrating soft deletion, trash listing, hierarchy restoration, and permanent storage purging."""

    def __init__(self, db_session: AsyncSession) -> None:
        self.db_session = db_session
        self.trash_repo = TrashRepository(db_session)
        self.file_repo = FileRepository(db_session)
        self.folder_repo = FolderRepository(db_session)
        self.star_repo = StarRepository(db_session)
        self.auth_service = AuthorizationService(db_session)
        self.storage_service = StorageService()

    async def trash_file(self, user: User, file_id: uuid.UUID) -> None:
        """Soft-deletes file metadata while preserving underlying binary storage key and parent hierarchy."""
        file_ent = await self.file_repo.get_by_id(file_id)
        if not file_ent or file_ent.deleted_at is not None:
            return

        await self.auth_service.require_resource_permission(
            user=user,
            resource=file_ent,
            resource_type=ResourceType.FILE,
            action=Action.DELETE,
        )

        deleted_at = await self.trash_repo.soft_delete_file(file_id)

        activity = Activity(
            user_id=user.id,
            action="RESOURCE_TRASHED",
            resource_type="file",
            resource_id=file_id,
            metadata_json=json.dumps({"name": file_ent.name, "deleted_at": deleted_at.isoformat()}),
        )
        self.db_session.add(activity)
        await self.db_session.commit()

    async def trash_folder(self, user: User, folder_id: uuid.UUID) -> None:
        """Recursively soft-deletes folder and descendant subfolders and files."""
        folder_ent = await self.folder_repo.get_by_id(folder_id)
        if not folder_ent or folder_ent.deleted_at is not None:
            return

        await self.auth_service.require_resource_permission(
            user=user,
            resource=folder_ent,
            resource_type=ResourceType.FOLDER,
            action=Action.DELETE,
        )

        await self.trash_repo.soft_delete_folder_tree(folder_id)

        activity = Activity(
            user_id=user.id,
            action="RESOURCE_TRASHED",
            resource_type="folder",
            resource_id=folder_id,
            metadata_json=json.dumps({"name": folder_ent.name}),
        )
        self.db_session.add(activity)
        await self.db_session.commit()

    async def list_trash(
        self,
        user: User,
        cursor: str | None = None,
        limit: int = 20,
        sort_by: str = "deletedAt",
        sort_order: str = "desc",
    ) -> TrashListResponseData:
        """Lists soft-deleted files and folders in user trash."""
        offset = 0
        if cursor and cursor.isdigit():
            offset = int(cursor)

        raw_items, total_count = await self.trash_repo.list_trash_items(
            user_id=user.id,
            offset=offset,
            limit=limit,
            sort_by=sort_by,
            sort_order=sort_order,
        )

        # Batch resolution of starred status
        file_ids = [item["id"] for item in raw_items if item["type"] == "file"]
        folder_ids = [item["id"] for item in raw_items if item["type"] == "folder"]

        starred_files, starred_folders = await self.star_repo.get_starred_resource_ids(
            user.id, file_ids, folder_ids
        )

        trash_items: list[TrashItemResponse] = []
        for item in raw_items:
            is_starred = (
                item["id"] in starred_files
                if item["type"] == "file"
                else item["id"] in starred_folders
            )
            item["starred"] = is_starred
            trash_items.append(TrashItemResponse.model_validate(item))

        has_more = (offset + limit) < total_count
        next_cursor = str(offset + limit) if has_more else None

        return TrashListResponseData(
            items=trash_items,
            pagination=PaginationMeta(
                has_more=has_more,
                next_cursor=next_cursor,
                total_count=total_count,
            ),
        )

    async def restore_file(self, user: User, file_id: uuid.UUID) -> RestoreResponse:
        """Restores trashed file to original container after conflict checks and authorization."""
        file_ent = await self.file_repo.get_by_id(file_id)
        if not file_ent or file_ent.deleted_at is None:
            raise ResourceNotFoundError("Trashed file entity not found")

        await self.auth_service.require_resource_permission(
            user=user,
            resource=file_ent,
            resource_type=ResourceType.FILE,
            action=Action.UPDATE,
        )

        # Verify active container folder if parent_id exists
        if file_ent.folder_id is not None:
            parent = await self.folder_repo.get_by_id(file_ent.folder_id)
            if not parent or parent.deleted_at is not None:
                raise ConflictError(
                    "RESTORE_PARENT_NOT_FOUND: Original parent directory is deleted or missing"
                )

        # Check naming conflict in destination active parent folder
        conflict = await self.trash_repo.check_active_file_name_conflict(
            user_id=user.id,
            folder_id=file_ent.folder_id,
            name=file_ent.name,
        )
        if conflict:
            raise ConflictError(
                "RESOURCE_NAME_CONFLICT: Active file with same name already exists in destination folder"
            )

        await self.trash_repo.restore_file(file_id)

        activity = Activity(
            user_id=user.id,
            action="RESOURCE_RESTORED",
            resource_type="file",
            resource_id=file_id,
            metadata_json=json.dumps({"name": file_ent.name}),
        )
        self.db_session.add(activity)
        await self.db_session.commit()

        return RestoreResponse(
            id=file_id,
            name=file_ent.name,
            type="file",
            folder_id=file_ent.folder_id,
            restored=True,
            restored_at=datetime.now(UTC),
        )

    async def restore_folder(self, user: User, folder_id: uuid.UUID) -> RestoreResponse:
        """Restores trashed folder and descendant subtrees after conflict checks and authorization."""
        folder_ent = await self.folder_repo.get_by_id(folder_id)
        if not folder_ent or folder_ent.deleted_at is None:
            raise ResourceNotFoundError("Trashed folder entity not found")

        await self.auth_service.require_resource_permission(
            user=user,
            resource=folder_ent,
            resource_type=ResourceType.FOLDER,
            action=Action.UPDATE,
        )

        # Verify active parent directory if parent_id exists
        if folder_ent.parent_id is not None:
            parent = await self.folder_repo.get_by_id(folder_ent.parent_id)
            if not parent or parent.deleted_at is not None:
                raise ConflictError(
                    "RESTORE_PARENT_NOT_FOUND: Original parent directory is deleted or missing"
                )

        # Check naming conflict in destination active parent directory
        conflict = await self.trash_repo.check_active_folder_name_conflict(
            user_id=user.id,
            parent_id=folder_ent.parent_id,
            name=folder_ent.name,
        )
        if conflict:
            raise ConflictError(
                "RESOURCE_NAME_CONFLICT: Active directory with same name already exists in destination"
            )

        await self.trash_repo.restore_folder_tree(folder_id)

        activity = Activity(
            user_id=user.id,
            action="RESOURCE_RESTORED",
            resource_type="folder",
            resource_id=folder_id,
            metadata_json=json.dumps({"name": folder_ent.name}),
        )
        self.db_session.add(activity)
        await self.db_session.commit()

        return RestoreResponse(
            id=folder_id,
            name=folder_ent.name,
            type="folder",
            folder_id=folder_ent.parent_id,
            restored=True,
            restored_at=datetime.now(UTC),
        )

    async def permanent_delete_file(self, user: User, file_id: uuid.UUID) -> None:
        """Permanently deletes storage binary object via StorageService and purges database metadata."""
        file_ent = await self.file_repo.get_by_id(file_id)
        if not file_ent:
            return

        await self.auth_service.require_resource_permission(
            user=user,
            resource=file_ent,
            resource_type=ResourceType.FILE,
            action=Action.DELETE,
        )

        # 1. Purge physical binary object from storage provider via StorageService
        if file_ent.storage_key:
            await self.storage_service.delete_object(file_ent.storage_key)

        # 2. Hard-delete metadata entity from database
        await self.trash_repo.hard_delete_file(file_id)

        # 3. Audit log
        activity = Activity(
            user_id=user.id,
            action="RESOURCE_PERMANENTLY_DELETED",
            resource_type="file",
            resource_id=file_id,
            metadata_json=json.dumps({"name": file_ent.name}),
        )
        self.db_session.add(activity)
        await self.db_session.commit()

    async def permanent_delete_folder(self, user: User, folder_id: uuid.UUID) -> None:
        """Permanently purges folder subtree binaries and database records."""
        folder_ent = await self.folder_repo.get_by_id(folder_id)
        if not folder_ent:
            return

        await self.auth_service.require_resource_permission(
            user=user,
            resource=folder_ent,
            resource_type=ResourceType.FOLDER,
            action=Action.DELETE,
        )

        # Retrieve descendant files and folders in subtree
        files, folders = await self.trash_repo.get_folder_subtree_entities(folder_id)

        # Purge storage binary for every file in subtree
        for file_ent in files:
            if file_ent.storage_key:
                await self.storage_service.delete_object(file_ent.storage_key)
            await self.trash_repo.hard_delete_file(file_ent.id)

        # Hard-delete all folders in subtree (bottom-up / cascade)
        for fold in reversed(folders):
            await self.trash_repo.hard_delete_folder(fold.id)

        # Audit log
        activity = Activity(
            user_id=user.id,
            action="RESOURCE_PERMANENTLY_DELETED",
            resource_type="folder",
            resource_id=folder_id,
            metadata_json=json.dumps({"name": folder_ent.name}),
        )
        self.db_session.add(activity)
        await self.db_session.commit()
