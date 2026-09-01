"""File Preview API Router."""

import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_active_user
from app.models.user import User
from app.schemas.common import APIResponse
from app.schemas.preview import PreviewResponse
from app.services.preview_service import PreviewService

router = APIRouter(prefix="", tags=["File Preview"])


@router.get(
    "/files/{file_id}/preview",
    response_model=APIResponse[PreviewResponse],
    summary="Generate Current File Preview",
)
async def get_current_file_preview(
    file_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> APIResponse[PreviewResponse]:
    """Generates an inline preview payload or signed preview URL for the current active file version."""
    service = PreviewService(db)
    result = await service.get_file_preview(current_user, file_id=file_id)
    return APIResponse(
        success=True,
        data=result,
        message="File preview generated successfully",
    )


@router.get(
    "/files/{file_id}/versions/{version_id}/preview",
    response_model=APIResponse[PreviewResponse],
    summary="Generate Version File Preview",
)
async def get_version_file_preview(
    file_id: uuid.UUID,
    version_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> APIResponse[PreviewResponse]:
    """Generates an inline preview payload or signed preview URL for a specific historical file version."""
    service = PreviewService(db)
    result = await service.get_file_preview(current_user, file_id=file_id, version_id=version_id)
    return APIResponse(
        success=True,
        data=result,
        message="Version file preview generated successfully",
    )
