"""Search, Filter & Sort Pydantic v2 Schemas."""

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.schemas.pagination import PaginationMeta


class SearchQueryParams(BaseModel):
    """Validated query parameters for discovery search, filtering, and sorting."""

    q: str = Field(
        min_length=1,
        max_length=255,
        description="Search query string matching file or folder names",
    )
    type: Literal["file", "folder", "all"] = Field(
        default="all",
        description="Resource type filter ('file', 'folder', or 'all')",
    )
    mime_type: str | None = Field(
        default=None,
        description="MIME type filter (exact string or wildcard, e.g. 'image/*')",
    )
    extension: str | None = Field(
        default=None,
        description="File extension filter (e.g. 'pdf', 'jpg')",
    )
    min_size: int | None = Field(
        default=None,
        ge=0,
        description="Minimum size in bytes filter",
    )
    max_size: int | None = Field(
        default=None,
        ge=0,
        description="Maximum size in bytes filter",
    )
    created_after: datetime | None = Field(
        default=None,
        description="Filter resources created at or after UTC timestamp",
    )
    created_before: datetime | None = Field(
        default=None,
        description="Filter resources created at or before UTC timestamp",
    )
    updated_after: datetime | None = Field(
        default=None,
        description="Filter resources updated at or after UTC timestamp",
    )
    updated_before: datetime | None = Field(
        default=None,
        description="Filter resources updated at or before UTC timestamp",
    )
    folder_id: uuid.UUID | None = Field(
        default=None,
        description="Filter resources contained inside specified folder ID",
    )
    starred: bool | None = Field(
        default=None,
        description="Filter by user starred status",
    )
    sort_by: Literal["name", "createdAt", "updatedAt", "size"] = Field(
        default="name",
        description="Field to sort search results by",
    )
    sort_order: Literal["asc", "desc"] = Field(
        default="asc",
        description="Sort direction ('asc' or 'desc')",
    )
    cursor: str | None = Field(
        default=None,
        description="Opaque cursor token for pagination",
    )
    limit: int = Field(
        default=20,
        ge=1,
        le=100,
        description="Maximum items per page",
    )

    @model_validator(mode="after")
    def validate_range_bounds(self) -> "SearchQueryParams":
        """Validates numerical and timestamp range boundaries."""
        if self.min_size is not None and self.max_size is not None:
            if self.min_size > self.max_size:
                raise ValueError("min_size cannot exceed max_size")

        if self.created_after is not None and self.created_before is not None:
            if self.created_after > self.created_before:
                raise ValueError("created_after cannot be later than created_before")

        if self.updated_after is not None and self.updated_before is not None:
            if self.updated_after > self.updated_before:
                raise ValueError("updated_after cannot be later than updated_before")

        return self


class SearchResultItem(BaseModel):
    """Schema representing a discovered resource (file or folder)."""

    id: uuid.UUID
    name: str
    type: Literal["file", "folder"]
    folder_id: uuid.UUID | None = Field(
        default=None,
        description="Parent folder ID (folder_id for files, parent_id for folders)",
    )
    mime_type: str | None = Field(
        default=None,
        description="MIME content type for files, null for folders",
    )
    size_bytes: int | None = Field(
        default=None,
        description="Size in bytes for files, null for folders",
    )
    starred: bool = Field(
        default=False,
        description="True if starred by requesting user",
    )
    trashed: bool = Field(
        default=False,
        description="True if resource is soft-deleted in trash",
    )
    created_at: datetime
    updated_at: datetime
    deleted_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class SearchResponseData(BaseModel):
    """Inner data envelope for search results with items and pagination."""

    items: list[SearchResultItem] = Field(default_factory=list)
    pagination: PaginationMeta = Field(default_factory=PaginationMeta)
