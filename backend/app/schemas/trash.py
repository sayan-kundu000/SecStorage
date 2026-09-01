"""Trash Soft-Delete & Recovery Pydantic v2 Schemas."""

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.pagination import PaginationMeta


class TrashItemResponse(BaseModel):
    """Schema representing a soft-deleted item in user trash."""

    id: uuid.UUID
    name: str
    type: Literal["file", "folder"]
    folder_id: uuid.UUID | None = Field(
        default=None,
        description="Original container folder ID",
    )
    mime_type: str | None = Field(default=None)
    size_bytes: int | None = Field(default=None)
    starred: bool = Field(default=False)
    deleted_at: datetime
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TrashListResponseData(BaseModel):
    """Inner data envelope for trash items listing."""

    items: list[TrashItemResponse] = Field(default_factory=list)
    pagination: PaginationMeta = Field(default_factory=PaginationMeta)


class RestoreResponse(BaseModel):
    """Schema representing the outcome of a resource restoration."""

    id: uuid.UUID
    name: str
    type: Literal["file", "folder"]
    folder_id: uuid.UUID | None = Field(default=None)
    restored: bool = True
    restored_at: datetime

    model_config = ConfigDict(from_attributes=True)
