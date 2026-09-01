"""File Versioning Domain Service orchestrating revisions, restoration, and signed URLs."""

import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ForbiddenError, ResourceNotFoundError, ValidationError
from app.core.permissions import Action, ResourceType
from app.models.file import File
from app.models.file_version import FileVersion
from app.models.user import User
from app.repositories.file_repository import FileRepository
from app.repositories.version_repository import VersionRepository
from app.schemas.file import DownloadUrlResponse
from app.schemas.version import FileVersionListResponse, FileVersionResponse, VersionRestoreResponse
from app.services.activity_service import ActivityService
from app.services.authorization_service import AuthorizationService
from app.services.storage_service import StorageService


class VersionService:
    """Domain service managing file version history, restoration, and security checks."""

    def __init__(self, db_session: AsyncSession) -> None:
        self.db_session = db_session
        self.file_repo = FileRepository(db_session)
        self.version_repo = VersionRepository(db_session)
        self.auth_service = AuthorizationService(db_session)
        self.storage_service = StorageService()
        self.activity_service = ActivityService(db_session)

    async def create_initial_version(self, file_entity: File, creator_id: uuid.UUID | None = None) -> FileVersion:
        """Creates Version 1 record when a file upload is confirmed READY."""
        existing = await self.version_repo.get_by_file_and_number(file_entity.id, 1)
        if existing:
            return existing

        version = FileVersion(
            file_id=file_entity.id,
            version_number=1,
            storage_key=file_entity.storage_key,
            size_bytes=file_entity.size_bytes,
            checksum=file_entity.checksum,
            mime_type=file_entity.mime_type,
            original_filename=file_entity.name,
            created_by=creator_id or file_entity.user_id,
            created_at=file_entity.uploaded_at or datetime.now(UTC),
        )
        return await self.version_repo.create(version)

    async def create_new_version(
        self,
        user: User,
        file_id: uuid.UUID,
        storage_key: str,
        size_bytes: int,
        mime_type: str,
        filename: str,
        checksum: str | None = None,
    ) -> FileVersionResponse:
        """Creates a new FileVersion N+1 for an existing logical file and updates active file metadata."""
        file_ent = await self.file_repo.get_by_id(file_id)
        if not file_ent or file_ent.deleted_at is not None:
            raise ResourceNotFoundError("File entity not found")

        await self.auth_service.require_resource_permission(
            user=user,
            resource=file_ent,
            resource_type=ResourceType.FILE,
            action=Action.UPDATE,
        )

        max_ver = await self.version_repo.get_max_version_number(file_id)
        new_version_num = max_ver + 1
        now = datetime.now(UTC)

        version = FileVersion(
            file_id=file_id,
            version_number=new_version_num,
            storage_key=storage_key,
            size_bytes=size_bytes,
            checksum=checksum,
            mime_type=mime_type,
            original_filename=filename,
            created_by=user.id,
            created_at=now,
        )
        saved_ver = await self.version_repo.create(version)

        # Update logical file metadata to point to new current version
        file_ent.storage_key = storage_key
        file_ent.size_bytes = size_bytes
        file_ent.mime_type = mime_type
        file_ent.checksum = checksum
        file_ent.updated_at = now
        await self.db_session.commit()

        await self.activity_service.log_activity(
            user_id=user.id,
            action="FILE_VERSION_CREATED",
            resource_type="FILE",
            resource_id=file_id,
            metadata={"versionNumber": new_version_num, "sizeBytes": size_bytes},
        )

        resp = FileVersionResponse.model_validate(saved_ver)
        resp.is_current = True
        return resp

    async def list_versions(
        self, user: User, file_id: uuid.UUID, limit: int = 50, offset: int = 0
    ) -> FileVersionListResponse:
        """Lists historical file versions for an authorized file."""
        file_ent = await self.file_repo.get_by_id(file_id)
        if not file_ent or file_ent.deleted_at is not None:
            raise ResourceNotFoundError("File entity not found")

        await self.auth_service.require_resource_permission(
            user=user,
            resource=file_ent,
            resource_type=ResourceType.FILE,
            action=Action.READ,
        )

        versions = await self.version_repo.list_by_file_id(file_id, limit=limit, offset=offset)
        total = await self.version_repo.count_by_file_id(file_id)
        max_ver_num = await self.version_repo.get_max_version_number(file_id)

        version_dtos: list[FileVersionResponse] = []
        for v in versions:
            dto = FileVersionResponse.model_validate(v)
            dto.is_current = (v.version_number == max_ver_num) or (v.storage_key == file_ent.storage_key)
            version_dtos.append(dto)

        return FileVersionListResponse(
            versions=version_dtos,
            total=total,
            current_version_number=max_ver_num,
        )

    async def get_version_details(
        self, user: User, file_id: uuid.UUID, version_id: uuid.UUID
    ) -> FileVersionResponse:
        """Fetches metadata for a specific historical version."""
        file_ent = await self.file_repo.get_by_id(file_id)
        if not file_ent or file_ent.deleted_at is not None:
            raise ResourceNotFoundError("File entity not found")

        await self.auth_service.require_resource_permission(
            user=user,
            resource=file_ent,
            resource_type=ResourceType.FILE,
            action=Action.READ,
        )

        ver = await self.version_repo.get_by_id(version_id)
        if not ver or ver.file_id != file_id:
            raise ResourceNotFoundError("Specified version was not found for this file")

        max_ver_num = await self.version_repo.get_max_version_number(file_id)
        dto = FileVersionResponse.model_validate(ver)
        dto.is_current = (ver.version_number == max_ver_num) or (ver.storage_key == file_ent.storage_key)
        return dto

    async def generate_version_download_url(
        self, user: User, file_id: uuid.UUID, version_id: uuid.UUID
    ) -> DownloadUrlResponse:
        """Generates a short-lived download URL for a specific historical version."""
        file_ent = await self.file_repo.get_by_id(file_id)
        if not file_ent or file_ent.deleted_at is not None:
            raise ResourceNotFoundError("File entity not found")

        await self.auth_service.require_resource_permission(
            user=user,
            resource=file_ent,
            resource_type=ResourceType.FILE,
            action=Action.DOWNLOAD,
        )

        ver = await self.version_repo.get_by_id(version_id)
        if not ver or ver.file_id != file_id:
            raise ResourceNotFoundError("Specified version was not found for this file")

        expires_in = 900
        now = datetime.now(UTC)
        download_url = await self.storage_service.generate_download_url(
            storage_key=ver.storage_key,
            filename=file_ent.name,
            expires_in=expires_in,
        )
        expires_at = now + timedelta(seconds=expires_in)

        await self.activity_service.log_activity(
            user_id=user.id,
            action="FILE_DOWNLOADED",
            resource_type="FILE",
            resource_id=file_id,
            metadata={"versionNumber": ver.version_number},
        )

        return DownloadUrlResponse(
            file_id=file_id,
            download_url=download_url,
            expires_at=expires_at,
        )

    async def restore_version(
        self, user: User, file_id: uuid.UUID, version_id: uuid.UUID
    ) -> VersionRestoreResponse:
        """Restores content from Version K by creating a new Version N+1 with target content."""
        file_ent = await self.file_repo.get_by_id(file_id)
        if not file_ent or file_ent.deleted_at is not None:
            raise ResourceNotFoundError("File entity not found")

        await self.auth_service.require_resource_permission(
            user=user,
            resource=file_ent,
            resource_type=ResourceType.FILE,
            action=Action.UPDATE,
        )

        target_ver = await self.version_repo.get_by_id(version_id)
        if not target_ver or target_ver.file_id != file_id:
            raise ResourceNotFoundError("Target version for restoration was not found")

        max_ver = await self.version_repo.get_max_version_number(file_id)
        new_version_num = max_ver + 1
        now = datetime.now(UTC)

        # Create NEW version N+1 copying target_ver content and storage key
        new_ver = FileVersion(
            file_id=file_id,
            version_number=new_version_num,
            storage_key=target_ver.storage_key,
            size_bytes=target_ver.size_bytes,
            checksum=target_ver.checksum,
            mime_type=target_ver.mime_type,
            original_filename=target_ver.original_filename or file_ent.name,
            created_by=user.id,
            created_at=now,
        )
        saved_new_ver = await self.version_repo.create(new_ver)

        # Update parent file entity active metadata
        file_ent.storage_key = target_ver.storage_key
        file_ent.size_bytes = target_ver.size_bytes
        if target_ver.mime_type:
            file_ent.mime_type = target_ver.mime_type
        file_ent.checksum = target_ver.checksum
        file_ent.updated_at = now
        await self.db_session.commit()

        await self.activity_service.log_activity(
            user_id=user.id,
            action="FILE_VERSION_RESTORED",
            resource_type="FILE",
            resource_id=file_id,
            metadata={
                "sourceVersionNumber": target_ver.version_number,
                "newVersionNumber": new_version_num,
            },
        )

        dto = FileVersionResponse.model_validate(saved_new_ver)
        dto.is_current = True
        return VersionRestoreResponse(
            message=f"Successfully restored Version {target_ver.version_number} as new Version {new_version_num}",
            new_version=dto,
        )
