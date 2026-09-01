"""File Versioning API Router."""

import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_active_user
from app.models.user import User
from app.schemas.common import APIResponse
from app.schemas.file import DownloadUrlResponse
from app.schemas.version import FileVersionListResponse, FileVersionResponse, VersionRestoreResponse
from app.services.version_service import VersionService

router = APIRouter(prefix="", tags=["File Versions"])


@router.get(
    "/files/{file_id}/versions",
    response_model=APIResponse[FileVersionListResponse],
    summary="List File Version History",
)
async def list_file_versions(
    file_id: uuid.UUID,
    limit: int = Query(default=50, ge=1, le=100, description="Max items to return"),
    offset: int = Query(default=0, ge=0, description="Items to skip"),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> APIResponse[FileVersionListResponse]:
    """Lists historical version revisions for a file."""
    service = VersionService(db)
    result = await service.list_versions(current_user, file_id=file_id, limit=limit, offset=offset)
    return APIResponse(
        success=True,
        data=result,
        message="File version history retrieved successfully",
    )


@router.get(
    "/files/{file_id}/versions/{version_id}",
    response_model=APIResponse[FileVersionResponse],
    summary="Get Version Details",
)
async def get_version_details(
    file_id: uuid.UUID,
    version_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> APIResponse[FileVersionResponse]:
    """Retrieves metadata for a specific historical file version."""
    service = VersionService(db)
    result = await service.get_version_details(current_user, file_id=file_id, version_id=version_id)
    return APIResponse(
        success=True,
        data=result,
        message="Version details retrieved successfully",
    )


@router.get(
    "/files/{file_id}/versions/{version_id}/download",
    response_model=APIResponse[DownloadUrlResponse],
    summary="Generate Historical Version Download Signed URL",
)
async def download_file_version(
    file_id: uuid.UUID,
    version_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> APIResponse[DownloadUrlResponse]:
    """Generates a temporary storage download signed URL for a specific historical version."""
    service = VersionService(db)
    result = await service.generate_version_download_url(
        current_user, file_id=file_id, version_id=version_id
    )
    return APIResponse(
        success=True,
        data=result,
        message="Historical version download URL generated successfully",
    )


@router.post(
    "/files/{file_id}/versions/{version_id}/restore",
    response_model=APIResponse[VersionRestoreResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Restore Historical Version Content",
)
async def restore_file_version(
    file_id: uuid.UUID,
    version_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> APIResponse[VersionRestoreResponse]:
    """Restores content from a target historical version by creating a new Version N+1."""
    service = VersionService(db)
    result = await service.restore_version(current_user, file_id=file_id, version_id=version_id)
    return APIResponse(
        success=True,
        data=result,
        message="File version restored successfully",
    )
