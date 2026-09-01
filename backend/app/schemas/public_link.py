"""Public Link Sharing Pydantic v2 Schemas."""

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class PublicLinkCreate(BaseModel):
    """Schema for generating a public access share link token."""

    folder_id: uuid.UUID | None = Field(default=None)
    file_id: uuid.UUID | None = Field(default=None)
    password: str | None = Field(
        default=None, min_length=4, max_length=128, description="Optional password protection"
    )
    expires_at: datetime | None = Field(default=None, description="Optional UTC expiration timestamp")
    allow_download: bool = Field(default=True, description="True if binary download is permitted")
    permission: Literal["VIEWER"] = Field(default="VIEWER", description="Public permission level")

    @model_validator(mode="after")
    def validate_target_not_both(self) -> "PublicLinkCreate":
        """Ensures both folder_id and file_id are not specified simultaneously."""
        if self.folder_id is not None and self.file_id is not None:
            raise ValueError("Public link creation cannot specify both 'folder_id' and 'file_id'")
        return self


class PublicLinkResponse(BaseModel):
    """Schema representing public link metadata response."""

    id: uuid.UUID
    created_by: uuid.UUID
    folder_id: uuid.UUID | None = None
    file_id: uuid.UUID | None = None
    resource_id: uuid.UUID
    resource_type: Literal["file", "folder"]
    resource_name: str | None = None
    token: str | None = Field(default=None, description="Raw public token (returned on creation/resolution)")
    url: str | None = Field(default=None, description="Complete public share URL")
    has_password: bool = Field(default=False, description="True if link requires password verification")
    expires_at: datetime | None = None
    allow_download: bool = True
    permission: str = "VIEWER"
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PublicLinkVerifyPasswordRequest(BaseModel):
    """Schema for password verification request on protected public link."""

    password: str = Field(..., min_length=1, description="Password input for protected link")


class PublicLinkListResponse(BaseModel):
    """Schema representing list of active public links for a resource."""

    links: list[PublicLinkResponse] = Field(default_factory=list)


class PublicResourceMetadataResponse(BaseModel):
    """Schema returning scoped public resource details to anonymous/link visitors."""

    id: uuid.UUID
    name: str
    type: Literal["file", "folder"]
    mime_type: str | None = None
    size_bytes: int | None = None
    folder_id: uuid.UUID | None = None
    created_at: datetime
    updated_at: datetime
    has_password: bool = False
    requires_password: bool = False
    allow_download: bool = True
    permission: str = "VIEWER"
    download_url: str | None = None
