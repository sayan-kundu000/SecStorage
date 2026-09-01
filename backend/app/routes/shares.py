"""User Access Sharing Permissions Router."""

import uuid

from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_active_user
from app.models.user import User
from app.schemas.common import APIResponse
from app.schemas.sharing import ShareCreate, ShareListResponse, ShareResponse, ShareUpdate
from app.services.share_service import ShareService

router = APIRouter(tags=["Sharing"])


@router.post(
    "/shares",
    response_model=APIResponse[ShareResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Grant Resource Share Permission",
)
async def create_share(
    payload: ShareCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> APIResponse[ShareResponse]:
    """Grants Editor or Viewer permission on a file or folder to a target user email."""
    service = ShareService(db)
    result = await service.grant_share(
        grantor=current_user,
        grantee_email=payload.grantee_email,
        permission=payload.permission,
        file_id=payload.file_id,
        folder_id=payload.folder_id,
    )
    return APIResponse(
        success=True,
        data=result,
        message="Resource access permission granted successfully",
    )


@router.post(
    "/files/{file_id}/shares",
    response_model=APIResponse[ShareResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Grant File Share Permission",
)
async def create_file_share(
    file_id: uuid.UUID,
    payload: ShareCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> APIResponse[ShareResponse]:
    """Grants Editor or Viewer permission on a file to a target user email."""
    service = ShareService(db)
    result = await service.grant_share(
        grantor=current_user,
        grantee_email=payload.grantee_email,
        permission=payload.permission,
        file_id=file_id,
        folder_id=None,
    )
    return APIResponse(
        success=True,
        data=result,
        message="File access permission granted successfully",
    )


@router.post(
    "/folders/{folder_id}/shares",
    response_model=APIResponse[ShareResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Grant Folder Share Permission",
)
async def create_folder_share(
    folder_id: uuid.UUID,
    payload: ShareCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> APIResponse[ShareResponse]:
    """Grants Editor or Viewer permission on a folder to a target user email."""
    service = ShareService(db)
    result = await service.grant_share(
        grantor=current_user,
        grantee_email=payload.grantee_email,
        permission=payload.permission,
        file_id=None,
        folder_id=folder_id,
    )
    return APIResponse(
        success=True,
        data=result,
        message="Folder access permission granted successfully",
    )


@router.get(
    "/shares",
    response_model=APIResponse[ShareListResponse],
    summary="List Items Shared With Me",
)
async def list_shares_received(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> APIResponse[ShareListResponse]:
    """Returns list of resources shared with the authenticated user."""
    service = ShareService(db)
    shares = await service.list_shares_received(current_user)
    return APIResponse(
        success=True,
        data=ShareListResponse(shares=shares),
        message="Shared items retrieved successfully",
    )


@router.get(
    "/files/{file_id}/shares",
    response_model=APIResponse[ShareListResponse],
    summary="List File Shares",
)
async def list_file_shares(
    file_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> APIResponse[ShareListResponse]:
    """Lists all active user shares for a target file."""
    service = ShareService(db)
    shares = await service.list_shares_for_resource(current_user, file_id=file_id)
    return APIResponse(
        success=True,
        data=ShareListResponse(shares=shares),
        message="File shares retrieved successfully",
    )


@router.get(
    "/folders/{folder_id}/shares",
    response_model=APIResponse[ShareListResponse],
    summary="List Folder Shares",
)
async def list_folder_shares(
    folder_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> APIResponse[ShareListResponse]:
    """Lists all active user shares for a target folder."""
    service = ShareService(db)
    shares = await service.list_shares_for_resource(current_user, folder_id=folder_id)
    return APIResponse(
        success=True,
        data=ShareListResponse(shares=shares),
        message="Folder shares retrieved successfully",
    )


@router.patch(
    "/shares/{share_id}",
    response_model=APIResponse[ShareResponse],
    summary="Update Share Permission Level",
)
async def update_share(
    share_id: uuid.UUID,
    payload: ShareUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> APIResponse[ShareResponse]:
    """Updates access permission (EDITOR <-> VIEWER) on an existing share."""
    service = ShareService(db)
    result = await service.update_share(current_user, share_id, payload.permission)
    return APIResponse(
        success=True,
        data=result,
        message="Share permission updated successfully",
    )


@router.delete(
    "/shares/{share_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Revoke Shared Access Permission",
)
async def delete_share(
    share_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> JSONResponse:
    """Revokes access permission grant for a target user."""
    service = ShareService(db)
    await service.revoke_share(current_user, share_id)
    return JSONResponse(status_code=status.HTTP_204_NO_CONTENT, content=None)
