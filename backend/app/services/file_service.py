"""Domain File Service orchestrating upload, confirmation, signed URLs, and deletion."""

import os
import re
import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ForbiddenError, ResourceNotFoundError, ValidationError
from app.core.permissions import Action, ResourceType
from app.models.file import File
from app.models.user import User
from app.repositories.file_repository import FileRepository
from app.schemas.file import DownloadUrlResponse, UploadInitiateResponse
from app.services.authorization_service import AuthorizationService
from app.services.storage_service import StorageService

MAX_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024 * 1024  # 5 GB limit


def sanitize_filename(filename: str) -> str:
    """Sanitizes user-supplied filename against path traversal and control characters."""
    clean_name = filename.replace("\\", "/")
    clean_name = os.path.basename(clean_name).strip()
    clean_name = re.sub(r"[^\w\s\.-]", "_", clean_name)
    return clean_name or "file.bin"


class FileService:
    """Domain service managing file upload lifecycle and storage URL generation."""

    def __init__(self, db_session: AsyncSession) -> None:
        self.db_session = db_session
        self.file_repo = FileRepository(db_session)
        self.auth_service = AuthorizationService(db_session)
        self.storage_service = StorageService()

    async def initiate_upload(
        self,
        user: User,
        filename: str,
        content_type: str,
        size_bytes: int,
        folder_id: uuid.UUID | None = None,
        checksum: str | None = None,
    ) -> UploadInitiateResponse:
        """Initiates file upload, creates PENDING File record, and issues signed upload URL."""
        if size_bytes > MAX_UPLOAD_SIZE_BYTES:
            raise ValidationError(f"File size ({size_bytes} bytes) exceeds maximum limit of 5 GB")

        clean_name = sanitize_filename(filename)
        file_id = uuid.uuid4()
        object_id = uuid.uuid4().hex
        storage_key = f"users/{user.id}/files/{file_id}/{object_id}.bin"

        now = datetime.now(UTC)
        file_entity = File(
            id=file_id,
            user_id=user.id,
            folder_id=folder_id,
            name=clean_name,
            mime_type=content_type or "application/octet-stream",
            size_bytes=size_bytes,
            storage_key=storage_key,
            status="PENDING",
            checksum=checksum,
            created_at=now,
            updated_at=now,
        )
        await self.file_repo.create(file_entity)
        await self.db_session.commit()

        expires_in = 900  # 15 minutes
        upload_url = await self.storage_service.generate_upload_url(
            storage_key=storage_key, content_type=content_type, expires_in=expires_in
        )
        expires_at = now + timedelta(seconds=expires_in)

        return UploadInitiateResponse(
            file_id=file_id,
            upload_url=upload_url,
            expires_at=expires_at,
            storage_key=storage_key,
        )

    async def confirm_upload(self, user: User, file_id: uuid.UUID) -> File:
        """Verifies binary object in storage provider and transitions file to READY."""
        file_entity = await self.file_repo.get_by_id(file_id)
        if not file_entity or file_entity.deleted_at is not None:
            raise ResourceNotFoundError("File entity not found")

        await self.auth_service.require_resource_permission(
            user=user,
            resource=file_entity,
            resource_type=ResourceType.FILE,
            action=Action.UPDATE,
        )

        # Check binary object in storage provider
        exists = await self.storage_service.object_exists(file_entity.storage_key)
        if not exists:
            file_entity.status = "FAILED"
            await self.db_session.commit()
            raise ValidationError("Uploaded binary object was not found in storage provider")

        now = datetime.now(UTC)
        file_entity.status = "READY"
        file_entity.uploaded_at = now
        file_entity.updated_at = now
        await self.db_session.commit()

        # Create Version 1 record and log FILE_UPLOADED activity
        from app.services.activity_service import ActivityService
        from app.services.version_service import VersionService

        version_service = VersionService(self.db_session)
        activity_service = ActivityService(self.db_session)

        await version_service.create_initial_version(file_entity, creator_id=user.id)
        await activity_service.log_activity(
            user_id=user.id,
            action="FILE_UPLOADED",
            resource_type="FILE",
            resource_id=file_entity.id,
            metadata={"filename": file_entity.name, "sizeBytes": file_entity.size_bytes},
        )
        return file_entity

    async def generate_download_url(self, user: User, file_id: uuid.UUID) -> DownloadUrlResponse:
        """Verifies READ/DOWNLOAD authorization and issues short-lived presigned download URL."""
        file_entity = await self.file_repo.get_by_id(file_id)
        if not file_entity or file_entity.deleted_at is not None:
            raise ResourceNotFoundError("File entity not found")

        await self.auth_service.require_resource_permission(
            user=user,
            resource=file_entity,
            resource_type=ResourceType.FILE,
            action=Action.DOWNLOAD,
        )

        if file_entity.status != "READY":
            raise ForbiddenError(
                f"File download unavailable: file status is '{file_entity.status}'"
            )

        expires_in = 900  # 15 minutes
        now = datetime.now(UTC)
        download_url = await self.storage_service.generate_download_url(
            storage_key=file_entity.storage_key,
            filename=file_entity.name,
            expires_in=expires_in,
        )
        expires_at = now + timedelta(seconds=expires_in)

        return DownloadUrlResponse(
            file_id=file_id,
            download_url=download_url,
            expires_at=expires_at,
        )

    async def delete_file(self, user: User, file_id: uuid.UUID) -> None:
        """Verifies DELETE authorization, soft-deletes metadata, and deletes object."""
        file_entity = await self.file_repo.get_by_id(file_id)
        if not file_entity or file_entity.deleted_at is not None:
            return

        await self.auth_service.require_resource_permission(
            user=user,
            resource=file_entity,
            resource_type=ResourceType.FILE,
            action=Action.DELETE,
        )

        await self.storage_service.delete_object(file_entity.storage_key)
        await self.file_repo.soft_delete(file_id)
        await self.db_session.commit()
