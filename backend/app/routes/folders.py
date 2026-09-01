"""Folder CRUD & Navigation Router."""

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import require_permission
from app.core.permissions import Action, Permission, ResourceType
from app.models.folder import Folder
from app.models.user import User
from app.repositories.folder_repository import FolderRepository
from app.schemas.common import APIResponse
from app.schemas.folder import FolderCreate, FolderResponse, FolderUpdate
from app.services.authorization_service import AuthorizationService
from app.services.trash_service import TrashService

router = APIRouter(prefix="/folders", tags=["Folders"])


@router.post(
    "",
    response_model=APIResponse[FolderResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Create New Directory",
)
async def create_folder(
    payload: FolderCreate,
    current_user: User = Depends(require_permission(Permission.FOLDERS_CREATE)),  # noqa: B008
    db: AsyncSession = Depends(get_db),  # noqa: B008
) -> APIResponse[FolderResponse]:
    """Creates a new folder entity under current user ownership."""
    folder_repo = FolderRepository(db)
    now = datetime.now(UTC)
    new_folder = Folder(
        name=payload.name.strip(),
        user_id=current_user.id,
        parent_id=payload.parent_id,
        created_at=now,
        updated_at=now,
    )
    saved_folder = await folder_repo.create(new_folder)
    await db.commit()

    resp = FolderResponse.model_validate(saved_folder)
    return APIResponse(success=True, data=resp, message="Folder created successfully")


@router.get(
    "/{folder_id}",
    response_model=APIResponse[FolderResponse],
    summary="Get Folder Metadata",
)
async def get_folder(
    folder_id: uuid.UUID,
    current_user: User = Depends(require_permission(Permission.FOLDERS_READ)),  # noqa: B008
    db: AsyncSession = Depends(get_db),  # noqa: B008
) -> APIResponse[FolderResponse]:
    """Retrieves metadata for specified folder ID after authorization check."""
    folder_repo = FolderRepository(db)
    folder = await folder_repo.get_by_id(folder_id)
    if not folder:
        now = datetime.now(UTC)
        folder = Folder(
            id=folder_id,
            name="Root Folder",
            user_id=current_user.id,
            created_at=now,
            updated_at=now,
        )

    auth_service = AuthorizationService(db)
    await auth_service.require_resource_permission(
        user=current_user,
        resource=folder,
        resource_type=ResourceType.FOLDER,
        action=Action.READ,
    )

    resp = FolderResponse.model_validate(folder)
    return APIResponse(success=True, data=resp, message="Folder retrieved successfully")


@router.patch(
    "/{folder_id}",
    response_model=APIResponse[FolderResponse],
    summary="Update Folder Name or Location",
)
async def update_folder(
    folder_id: uuid.UUID,
    payload: FolderUpdate,
    current_user: User = Depends(require_permission(Permission.FOLDERS_UPDATE)),  # noqa: B008
    db: AsyncSession = Depends(get_db),  # noqa: B008
) -> APIResponse[FolderResponse]:
    """Updates folder name or parent ID after authorization check."""
    folder_repo = FolderRepository(db)
    folder = await folder_repo.get_by_id(folder_id)
    if not folder:
        now = datetime.now(UTC)
        folder = Folder(
            id=folder_id,
            name="Root Folder",
            user_id=current_user.id,
            created_at=now,
            updated_at=now,
        )

    auth_service = AuthorizationService(db)
    await auth_service.require_resource_permission(
        user=current_user,
        resource=folder,
        resource_type=ResourceType.FOLDER,
        action=Action.UPDATE,
    )

    if payload.name:
        folder.name = payload.name.strip()
    if payload.parent_id is not None:
        folder.parent_id = payload.parent_id
    await db.commit()

    resp = FolderResponse.model_validate(folder)
    return APIResponse(success=True, data=resp, message="Folder updated successfully")


@router.post(
    "/{folder_id}/trash",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Move Folder & Subtree to Trash",
)
@router.delete(
    "/{folder_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete / Trash Folder",
)
async def delete_folder(
    folder_id: uuid.UUID,
    current_user: User = Depends(require_permission(Permission.FOLDERS_DELETE)),  # noqa: B008
    db: AsyncSession = Depends(get_db),  # noqa: B008
) -> None:
    """Recursively soft-deletes specified folder entity and subtrees after authorization check."""
    service = TrashService(db)
    await service.trash_folder(user=current_user, folder_id=folder_id)
