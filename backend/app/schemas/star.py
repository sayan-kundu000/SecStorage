"""Favorite Star Pydantic v2 Schemas."""

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.schemas.pagination import PaginationMeta


class StarCreate(BaseModel):
    """Schema for creating a favorite star marker."""

    folder_id: uuid.UUID | None = Field(default=None)
    file_id: uuid.UUID | None = Field(default=None)

    @model_validator(mode="after")
    def validate_xor_target(self) -> "StarCreate":
        """Ensures exactly one target (folder_id OR file_id) is provided."""
        if (self.folder_id is None and self.file_id is None) or (
            self.folder_id is not None and self.file_id is not None
        ):
            raise ValueError("Star operation requires exactly one of 'folder_id' or 'file_id'")
        return self


class StarResponse(BaseModel):
    """Schema for star operation response."""

    id: uuid.UUID
    user_id: uuid.UUID
    folder_id: uuid.UUID | None = None
    file_id: uuid.UUID | None = None
    resource_id: uuid.UUID
    resource_type: Literal["file", "folder"]
    starred: bool = True
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class StarredItemResponse(BaseModel):
    """Schema representing a starred file or folder in user's starred listing."""

    id: uuid.UUID
    name: str
    type: Literal["file", "folder"]
    folder_id: uuid.UUID | None = Field(default=None)
    mime_type: str | None = Field(default=None)
    size_bytes: int | None = Field(default=None)
    starred: bool = True
    trashed: bool = False
    created_at: datetime
    updated_at: datetime
    starred_at: datetime

    model_config = ConfigDict(from_attributes=True)


class StarredListResponseData(BaseModel):
    """Inner data envelope for starred items listing."""

    items: list[StarredItemResponse] = Field(default_factory=list)
    pagination: PaginationMeta = Field(default_factory=PaginationMeta)
