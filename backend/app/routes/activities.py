"""Audit Activity & Security Log Router."""

import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_active_user
from app.models.user import User
from app.schemas.activity import ActivityListResponse
from app.schemas.common import APIResponse
from app.services.activity_service import ActivityService
from app.services.audit_service import AuditService

router = APIRouter(prefix="", tags=["Activities"])


@router.get(
    "/activities",
    response_model=APIResponse[ActivityListResponse],
    summary="Get Current User Activity Feed",
)
async def list_user_activities(
    page: int = Query(default=1, ge=1, description="Page index"),
    page_size: int = Query(default=50, ge=1, le=100, description="Page size"),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> APIResponse[ActivityListResponse]:
    """Returns chronological activity timeline feed for current active user."""
    service = ActivityService(db)
    result = await service.list_user_activities(current_user, page=page, page_size=page_size)
    return APIResponse(
        success=True,
        data=result,
        message="Activity timeline retrieved successfully",
    )


@router.get(
    "/files/{file_id}/activity",
    response_model=APIResponse[ActivityListResponse],
    summary="Get File Activity History",
)
async def list_file_activities(
    file_id: uuid.UUID,
    page: int = Query(default=1, ge=1, description="Page index"),
    page_size: int = Query(default=50, ge=1, le=100, description="Page size"),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> APIResponse[ActivityListResponse]:
    """Lists event timeline for a specific file resource."""
    service = ActivityService(db)
    result = await service.list_resource_activities(
        current_user, resource_type="FILE", resource_id=file_id, page=page, page_size=page_size
    )
    return APIResponse(
        success=True,
        data=result,
        message="File activity history retrieved successfully",
    )


@router.get(
    "/folders/{folder_id}/activity",
    response_model=APIResponse[ActivityListResponse],
    summary="Get Folder Activity History",
)
async def list_folder_activities(
    folder_id: uuid.UUID,
    page: int = Query(default=1, ge=1, description="Page index"),
    page_size: int = Query(default=50, ge=1, le=100, description="Page size"),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> APIResponse[ActivityListResponse]:
    """Lists event timeline for a specific folder resource."""
    service = ActivityService(db)
    result = await service.list_resource_activities(
        current_user, resource_type="FOLDER", resource_id=folder_id, page=page, page_size=page_size
    )
    return APIResponse(
        success=True,
        data=result,
        message="Folder activity history retrieved successfully",
    )


@router.get(
    "/audit",
    response_model=APIResponse[ActivityListResponse],
    summary="Get Security Audit Trail",
)
async def list_security_audit_logs(
    page: int = Query(default=1, ge=1, description="Page index"),
    page_size: int = Query(default=50, ge=1, le=100, description="Page size"),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> APIResponse[ActivityListResponse]:
    """Returns system-wide security audit logs (Admin restricted)."""
    service = AuditService(db)
    result = await service.list_audit_trail(current_user, page=page, page_size=page_size)
    return APIResponse(
        success=True,
        data=result,
        message="Security audit logs retrieved successfully",
    )
