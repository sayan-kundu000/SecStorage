"""Folder Pydantic v2 Request/Response Schemas."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class FolderCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, description="Folder name")
    parent_id: uuid.UUID | None = Field(
        default=None, description="Parent folder ID (None for root)"
    )


class FolderUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    parent_id: uuid.UUID | None = Field(default=None)


class FolderResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    parent_id: uuid.UUID | None = None
    name: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class FolderListResponse(BaseModel):
    folders: list[FolderResponse] = Field(default_factory=list)
