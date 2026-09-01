"""Metadata Search, Filter & Sort Router."""

import uuid
from datetime import datetime
from typing import Literal

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import require_permission
from app.core.permissions import Permission
from app.models.user import User
from app.schemas.common import APIResponse
from app.schemas.search import SearchQueryParams, SearchResponseData
from app.services.search_service import SearchService

router = APIRouter(prefix="/search", tags=["Search"])


@router.get(
    "",
    response_model=APIResponse[SearchResponseData],
    status_code=status.HTTP_200_OK,
    summary="Search & Filter Resources by Metadata",
)
async def search_resources(
    q: str = Query(..., min_length=1, max_length=255, description="Search query string"),
    type: Literal["file", "folder", "all"] = Query("all", description="Resource type filter"),
    mime_type: str | None = Query(None, alias="mimeType", description="MIME content type filter"),
    extension: str | None = Query(None, description="File extension filter"),
    min_size: int | None = Query(
        None, alias="minSize", ge=0, description="Minimum size bytes filter"
    ),
    max_size: int | None = Query(
        None, alias="maxSize", ge=0, description="Maximum size bytes filter"
    ),
    created_after: datetime | None = Query(
        None, alias="createdAfter", description="Created after UTC timestamp"
    ),
    created_before: datetime | None = Query(
        None, alias="createdBefore", description="Created before UTC timestamp"
    ),
    updated_after: datetime | None = Query(
        None, alias="updatedAfter", description="Updated after UTC timestamp"
    ),
    updated_before: datetime | None = Query(
        None, alias="updatedBefore", description="Updated before UTC timestamp"
    ),
    folder_id: uuid.UUID | None = Query(
        None, alias="folderId", description="Container folder ID filter"
    ),
    starred: bool | None = Query(None, description="Filter by user starred status"),
    sort_by: Literal["name", "createdAt", "updatedAt", "size"] = Query(
        "name", alias="sortBy", description="Sort by field"
    ),
    sort_order: Literal["asc", "desc"] = Query(
        "asc", alias="sortOrder", description="Sort direction ('asc' or 'desc')"
    ),
    cursor: str | None = Query(None, description="Pagination cursor token"),
    limit: int = Query(20, ge=1, le=100, description="Page limit"),
    current_user: User = Depends(require_permission(Permission.FILES_READ)),  # noqa: B008
    db: AsyncSession = Depends(get_db),  # noqa: B008
) -> APIResponse[SearchResponseData]:
    """Executes metadata search, filtering, and sorting across authorized user resources."""
    query_params = SearchQueryParams(
        q=q,
        type=type,
        mime_type=mime_type,
        extension=extension,
        min_size=min_size,
        max_size=max_size,
        created_after=created_after,
        created_before=created_before,
        updated_after=updated_after,
        updated_before=updated_before,
        folder_id=folder_id,
        starred=starred,
        sort_by=sort_by,
        sort_order=sort_order,
        cursor=cursor,
        limit=limit,
    )

    service = SearchService(db)
    res_data = await service.search_resources(user=current_user, params=query_params)
    return APIResponse(
        success=True,
        data=res_data,
        message="Search completed successfully",
    )
