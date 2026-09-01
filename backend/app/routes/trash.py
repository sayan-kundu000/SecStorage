"""Trash & Recovery Management Router."""

import uuid
from typing import Literal

from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import require_permission
from app.core.permissions import Permission
from app.models.user import User
from app.schemas.common import APIResponse
from app.schemas.trash import RestoreResponse, TrashListResponseData
from app.services.trash_service import TrashService

router = APIRouter(prefix="/trash", tags=["Trash"])


@router.get(
    "",
    response_model=APIResponse[TrashListResponseData],
    summary="List Soft-Deleted Resources in User Trash",
)
async def list_trash_items(
    cursor: str | None = Query(None, description="Pagination cursor token"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    sort_by: Literal["deletedAt", "name", "size"] = Query(
        "deletedAt", alias="sortBy", description="Sort by field"
    ),
    sort_order: Literal["asc", "desc"] = Query(
        "desc", alias="sortOrder", description="Sort direction ('asc' or 'desc')"
    ),
    current_user: User = Depends(require_permission(Permission.FILES_READ)),  # noqa: B008
    db: AsyncSession = Depends(get_db),  # noqa: B008
) -> APIResponse[TrashListResponseData]:
    """Returns soft-deleted files and folders currently in user trash with pagination and sorting."""
    service = TrashService(db)
    res_data = await service.list_trash(
        user=current_user,
        cursor=cursor,
        limit=limit,
        sort_by=sort_by,
        sort_order=sort_order,
    )
    return APIResponse(success=True, data=res_data, message="Trash items retrieved successfully")


@router.post(
    "/files/{file_id}/restore",
    response_model=APIResponse[RestoreResponse],
    summary="Restore Trashed File to Original Location",
)
async def restore_file(
    file_id: uuid.UUID,
    current_user: User = Depends(require_permission(Permission.FILES_UPDATE)),  # noqa: B008
    db: AsyncSession = Depends(get_db),  # noqa: B008
) -> APIResponse[RestoreResponse]:
    """Restores soft-deleted file from trash back to active state after checking for name conflicts."""
    service = TrashService(db)
    rest_res = await service.restore_file(user=current_user, file_id=file_id)
    return APIResponse(success=True, data=rest_res, message="File restored successfully")


@router.post(
    "/folders/{folder_id}/restore",
    response_model=APIResponse[RestoreResponse],
    summary="Restore Trashed Folder & Subtree",
)
async def restore_folder(
    folder_id: uuid.UUID,
    current_user: User = Depends(require_permission(Permission.FOLDERS_UPDATE)),  # noqa: B008
    db: AsyncSession = Depends(get_db),  # noqa: B008
) -> APIResponse[RestoreResponse]:
    """Restores soft-deleted folder and descendant subtree from trash back to active state."""
    service = TrashService(db)
    rest_res = await service.restore_folder(user=current_user, folder_id=folder_id)
    return APIResponse(success=True, data=rest_res, message="Folder restored successfully")


@router.post(
    "/{resource_id}/restore",
    response_model=APIResponse[RestoreResponse],
    summary="Restore Trashed Resource (Generic)",
)
async def restore_generic_resource(
    resource_id: uuid.UUID,
    current_user: User = Depends(require_permission(Permission.FILES_UPDATE)),  # noqa: B008
    db: AsyncSession = Depends(get_db),  # noqa: B008
) -> APIResponse[RestoreResponse]:
    """Restores trashed resource (file or folder) back to active state."""
    service = TrashService(db)
    try:
        rest_res = await service.restore_file(user=current_user, file_id=resource_id)
        return APIResponse(success=True, data=rest_res, message="Resource restored successfully")
    except Exception:
        rest_res = await service.restore_folder(user=current_user, folder_id=resource_id)
        return APIResponse(success=True, data=rest_res, message="Resource restored successfully")


@router.delete(
    "/files/{file_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Permanently Purge File from Trash",
)
async def purge_file(
    file_id: uuid.UUID,
    current_user: User = Depends(require_permission(Permission.FILES_DELETE)),  # noqa: B008
    db: AsyncSession = Depends(get_db),  # noqa: B008
) -> JSONResponse:
    """Permanently deletes file metadata and associated storage provider binary object."""
    service = TrashService(db)
    await service.permanent_delete_file(user=current_user, file_id=file_id)
    return JSONResponse(status_code=status.HTTP_204_NO_CONTENT, content=None)


@router.delete(
    "/folders/{folder_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Permanently Purge Folder & Subtree",
)
async def purge_folder(
    folder_id: uuid.UUID,
    current_user: User = Depends(require_permission(Permission.FOLDERS_DELETE)),  # noqa: B008
    db: AsyncSession = Depends(get_db),  # noqa: B008
) -> JSONResponse:
    """Permanently deletes folder subtree, all contained files' storage binaries, and DB metadata."""
    service = TrashService(db)
    await service.permanent_delete_folder(user=current_user, folder_id=folder_id)
    return JSONResponse(status_code=status.HTTP_204_NO_CONTENT, content=None)


@router.delete(
    "/{resource_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Permanently Purge Resource (Generic)",
)
async def purge_generic_resource(
    resource_id: uuid.UUID,
    current_user: User = Depends(require_permission(Permission.FILES_DELETE)),  # noqa: B008
    db: AsyncSession = Depends(get_db),  # noqa: B008
) -> JSONResponse:
    """Permanently deletes trashed file or folder resource."""
    service = TrashService(db)
    try:
        await service.permanent_delete_file(user=current_user, file_id=resource_id)
    except Exception:
        await service.permanent_delete_folder(user=current_user, folder_id=resource_id)
    return JSONResponse(status_code=status.HTTP_204_NO_CONTENT, content=None)
