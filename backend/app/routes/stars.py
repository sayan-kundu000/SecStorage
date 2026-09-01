"""Favorite Star Marker & Starred Listing Router."""

import uuid

from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import require_permission
from app.core.permissions import Permission
from app.models.user import User
from app.schemas.common import APIResponse
from app.schemas.star import StarCreate, StarResponse, StarredListResponseData
from app.services.star_service import StarService

router = APIRouter(tags=["Stars"])


# -------------------------------------------------------------
# Starred Listing
# -------------------------------------------------------------
@router.get(
    "/starred",
    response_model=APIResponse[StarredListResponseData],
    summary="List Starred Favorite Resources",
)
@router.get(
    "/stars",
    response_model=APIResponse[StarredListResponseData],
    summary="List Starred Favorite Resources (Alias)",
)
async def list_starred_resources(
    cursor: str | None = Query(None, description="Pagination cursor token"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    current_user: User = Depends(require_permission(Permission.FILES_READ)),  # noqa: B008
    db: AsyncSession = Depends(get_db),  # noqa: B008
) -> APIResponse[StarredListResponseData]:
    """Returns paginated list of file and folder resources starred as favorite by current user."""
    service = StarService(db)
    res = await service.list_starred(user=current_user, cursor=cursor, limit=limit)
    return APIResponse(success=True, data=res, message="Starred resources retrieved successfully")


# -------------------------------------------------------------
# File Star / Unstar
# -------------------------------------------------------------
@router.post(
    "/files/{file_id}/star",
    response_model=APIResponse[StarResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Star File as Favorite",
)
async def star_file(
    file_id: uuid.UUID,
    current_user: User = Depends(require_permission(Permission.FILES_READ)),  # noqa: B008
    db: AsyncSession = Depends(get_db),  # noqa: B008
) -> APIResponse[StarResponse]:
    """Marks specified file as favorite star marker."""
    service = StarService(db)
    star_res = await service.star_resource(user=current_user, file_id=file_id)
    return APIResponse(success=True, data=star_res, message="File starred successfully")


@router.delete(
    "/files/{file_id}/star",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Unstar File Favorite",
)
async def unstar_file(
    file_id: uuid.UUID,
    current_user: User = Depends(require_permission(Permission.FILES_READ)),  # noqa: B008
    db: AsyncSession = Depends(get_db),  # noqa: B008
) -> JSONResponse:
    """Removes favorite star marker from specified file."""
    service = StarService(db)
    await service.unstar_resource(user=current_user, file_id=file_id)
    return JSONResponse(status_code=status.HTTP_204_NO_CONTENT, content=None)


# -------------------------------------------------------------
# Folder Star / Unstar
# -------------------------------------------------------------
@router.post(
    "/folders/{folder_id}/star",
    response_model=APIResponse[StarResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Star Folder as Favorite",
)
async def star_folder(
    folder_id: uuid.UUID,
    current_user: User = Depends(require_permission(Permission.FOLDERS_READ)),  # noqa: B008
    db: AsyncSession = Depends(get_db),  # noqa: B008
) -> APIResponse[StarResponse]:
    """Marks specified folder as favorite star marker."""
    service = StarService(db)
    star_res = await service.star_resource(user=current_user, folder_id=folder_id)
    return APIResponse(success=True, data=star_res, message="Folder starred successfully")


@router.delete(
    "/folders/{folder_id}/star",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Unstar Folder Favorite",
)
async def unstar_folder(
    folder_id: uuid.UUID,
    current_user: User = Depends(require_permission(Permission.FOLDERS_READ)),  # noqa: B008
    db: AsyncSession = Depends(get_db),  # noqa: B008
) -> JSONResponse:
    """Removes favorite star marker from specified folder."""
    service = StarService(db)
    await service.unstar_resource(user=current_user, folder_id=folder_id)
    return JSONResponse(status_code=status.HTTP_204_NO_CONTENT, content=None)


# -------------------------------------------------------------
# Generic Stars Endpoint
# -------------------------------------------------------------
@router.post(
    "/stars",
    response_model=APIResponse[StarResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Star Resource via Payload",
)
async def create_star(
    payload: StarCreate,
    current_user: User = Depends(require_permission(Permission.FILES_READ)),  # noqa: B008
    db: AsyncSession = Depends(get_db),  # noqa: B008
) -> APIResponse[StarResponse]:
    """Marks a file or folder as favorite using request body payload."""
    service = StarService(db)
    star_res = await service.star_resource(
        user=current_user, file_id=payload.file_id, folder_id=payload.folder_id
    )
    return APIResponse(success=True, data=star_res, message="Resource starred successfully")


@router.delete(
    "/stars/{star_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete Star Marker by Star ID",
)
async def delete_star_by_id(
    star_id: uuid.UUID,
    current_user: User = Depends(require_permission(Permission.FILES_READ)),  # noqa: B008
    db: AsyncSession = Depends(get_db),  # noqa: B008
) -> JSONResponse:
    """Unstars resource using star marker ID."""
    service = StarService(db)
    star_ent = await service.star_repo.get_by_id(star_id)
    if star_ent and star_ent.user_id == current_user.id:
        await service.star_repo.delete_star(star_ent)
        await db.commit()
    return JSONResponse(status_code=status.HTTP_204_NO_CONTENT, content=None)
