"""Public Access Link Tokens Router."""

import uuid

from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_active_user
from app.models.user import User
from app.schemas.common import APIResponse
from app.schemas.file import DownloadUrlResponse
from app.schemas.public_link import (
    PublicLinkCreate,
    PublicLinkListResponse,
    PublicLinkResponse,
    PublicLinkVerifyPasswordRequest,
    PublicResourceMetadataResponse,
)
from app.schemas.preview import PreviewResponse
from app.services.public_link_service import PublicLinkService

router = APIRouter(tags=["Public Links"])


@router.post(
    "/public-links",
    response_model=APIResponse[PublicLinkResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Generate Public Share Link Token",
)
async def create_public_link(
    payload: PublicLinkCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> APIResponse[PublicLinkResponse]:
    """Generates an expirable, optional password-protected public share link token."""
    service = PublicLinkService(db)
    result = await service.create_public_link(
        creator=current_user,
        permission=payload.permission,
        file_id=payload.file_id,
        folder_id=payload.folder_id,
        password=payload.password,
        expires_at=payload.expires_at,
        allow_download=payload.allow_download,
    )
    return APIResponse(
        success=True,
        data=result,
        message="Public share link generated successfully",
    )


@router.post(
    "/files/{file_id}/public-links",
    response_model=APIResponse[PublicLinkResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Generate File Public Share Link Token",
)
async def create_file_public_link(
    file_id: uuid.UUID,
    payload: PublicLinkCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> APIResponse[PublicLinkResponse]:
    """Generates an expirable, optional password-protected public share link token for a file."""
    service = PublicLinkService(db)
    result = await service.create_public_link(
        creator=current_user,
        permission=payload.permission,
        file_id=file_id,
        folder_id=None,
        password=payload.password,
        expires_at=payload.expires_at,
        allow_download=payload.allow_download,
    )
    return APIResponse(
        success=True,
        data=result,
        message="File public share link generated successfully",
    )


@router.post(
    "/folders/{folder_id}/public-links",
    response_model=APIResponse[PublicLinkResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Generate Folder Public Share Link Token",
)
async def create_folder_public_link(
    folder_id: uuid.UUID,
    payload: PublicLinkCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> APIResponse[PublicLinkResponse]:
    """Generates an expirable, optional password-protected public share link token for a folder."""
    service = PublicLinkService(db)
    result = await service.create_public_link(
        creator=current_user,
        permission=payload.permission,
        file_id=None,
        folder_id=folder_id,
        password=payload.password,
        expires_at=payload.expires_at,
        allow_download=payload.allow_download,
    )
    return APIResponse(
        success=True,
        data=result,
        message="Folder public share link generated successfully",
    )


@router.get(
    "/public-links/{token}",
    response_model=APIResponse[PublicResourceMetadataResponse],
    summary="Access Public Share Link Metadata",
)
async def get_public_link_by_token(
    token: str,
    password: str | None = Query(default=None, description="Optional password for protected link"),
    db: AsyncSession = Depends(get_db),
) -> APIResponse[PublicResourceMetadataResponse]:
    """Validates public link token, verifies optional password, and returns scoped public metadata."""
    service = PublicLinkService(db)
    result = await service.get_public_link_by_token(token, password=password)
    return APIResponse(
        success=True,
        data=result,
        message="Public share link resolved successfully",
    )


@router.post(
    "/public-links/{token}/verify",
    response_model=APIResponse[PublicResourceMetadataResponse],
    summary="Verify Password for Protected Public Link",
)
async def verify_public_link_password(
    token: str,
    payload: PublicLinkVerifyPasswordRequest,
    db: AsyncSession = Depends(get_db),
) -> APIResponse[PublicResourceMetadataResponse]:
    """Verifies password for protected public share link and returns unlocked metadata."""
    service = PublicLinkService(db)
    result = await service.get_public_link_by_token(token, password=payload.password)
    return APIResponse(
        success=True,
        data=result,
        message="Public share link password verified successfully",
    )


@router.get(
    "/public-links/{token}/download",
    response_model=APIResponse[DownloadUrlResponse],
    summary="Generate Public File Download Signed URL",
)
async def download_public_link_file(
    token: str,
    password: str | None = Query(default=None, description="Optional password for protected link"),
    db: AsyncSession = Depends(get_db),
) -> APIResponse[DownloadUrlResponse]:
    """Generates a temporary storage download signed URL for a valid public file link."""
    service = PublicLinkService(db)
    download_url, expires_at, file_id = await service.generate_public_download_url(
        token, password=password
    )
    return APIResponse(
        success=True,
        data=DownloadUrlResponse(file_id=file_id, download_url=download_url, expires_at=expires_at),
        message="Public download URL generated successfully",
    )


@router.get(
    "/public-links/{token}/preview",
    response_model=APIResponse[PreviewResponse],
    summary="Generate Public File Preview",
)
async def preview_public_link_file(
    token: str,
    password: str | None = Query(default=None, description="Optional password for protected link"),
    db: AsyncSession = Depends(get_db),
) -> APIResponse[PreviewResponse]:
    """Generates an inline preview payload or signed preview URL for a valid public share link."""
    from app.services.preview_service import PreviewService

    service = PreviewService(db)
    result = await service.get_public_link_preview(token, password=password)
    return APIResponse(
        success=True,
        data=result,
        message="Public link preview generated successfully",
    )


@router.get(
    "/files/{file_id}/public-links",
    response_model=APIResponse[PublicLinkListResponse],
    summary="List Active File Public Links",
)
async def list_file_public_links(
    file_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> APIResponse[PublicLinkListResponse]:
    """Lists all active public share links for a file."""
    service = PublicLinkService(db)
    links = await service.list_public_links_for_resource(current_user, file_id=file_id)
    return APIResponse(
        success=True,
        data=PublicLinkListResponse(links=links),
        message="File public links retrieved successfully",
    )


@router.get(
    "/folders/{folder_id}/public-links",
    response_model=APIResponse[PublicLinkListResponse],
    summary="List Active Folder Public Links",
)
async def list_folder_public_links(
    folder_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> APIResponse[PublicLinkListResponse]:
    """Lists all active public share links for a folder."""
    service = PublicLinkService(db)
    links = await service.list_public_links_for_resource(current_user, folder_id=folder_id)
    return APIResponse(
        success=True,
        data=PublicLinkListResponse(links=links),
        message="Folder public links retrieved successfully",
    )


@router.delete(
    "/public-links/{link_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Revoke Public Share Link",
)
async def revoke_public_link(
    link_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> JSONResponse:
    """Revokes an active public share link token."""
    service = PublicLinkService(db)
    await service.revoke_public_link(current_user, link_id)
    return JSONResponse(status_code=status.HTTP_204_NO_CONTENT, content=None)
