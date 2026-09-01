"""File Version Pydantic v2 Data Transfer Objects."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class FileVersionResponse(BaseModel):
    """File version details payload."""

    id: uuid.UUID = Field(..., description="Unique version identifier")
    file_id: uuid.UUID = Field(..., description="Parent logical file identifier")
    version_number: int = Field(..., description="Monotonically increasing version number")
    size_bytes: int = Field(..., description="Storage size in bytes")
    mime_type: str | None = Field(default=None, description="MIME content type")
    original_filename: str | None = Field(default=None, description="Original filename snapshot")
    checksum: str | None = Field(default=None, description="SHA-256 binary checksum")
    created_by: uuid.UUID | None = Field(default=None, description="User ID of version creator")
    created_at: datetime = Field(..., description="Version creation timestamp")
    is_current: bool = Field(default=False, description="True if this version is the active file version")

    model_config = ConfigDict(from_attributes=True)


class FileVersionListResponse(BaseModel):
    """Paginated file version history list."""

    versions: list[FileVersionResponse] = Field(default_factory=list, description="List of file versions")
    total: int = Field(..., description="Total count of historical versions")
    current_version_number: int = Field(..., description="Active current version number")

    model_config = ConfigDict(from_attributes=True)


class VersionRestoreResponse(BaseModel):
    """Result of restoring a historical file version."""

    message: str = Field(..., description="Human-readable result summary")
    new_version: FileVersionResponse = Field(..., description="Newly created active version")

    model_config = ConfigDict(from_attributes=True)
