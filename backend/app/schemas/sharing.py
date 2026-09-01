"""User Access Sharing Pydantic v2 Schemas."""

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator


class ShareCreate(BaseModel):
    """Schema for granting a user access share."""

    grantee_email: EmailStr = Field(..., description="Email address of user receiving access")
    folder_id: uuid.UUID | None = Field(default=None)
    file_id: uuid.UUID | None = Field(default=None)
    permission: Literal["EDITOR", "VIEWER"] = Field(..., description="Access permission level")

    @model_validator(mode="after")
    def validate_target_not_both(self) -> "ShareCreate":
        """Ensures both folder_id and file_id are not specified simultaneously."""
        if self.folder_id is not None and self.file_id is not None:
            raise ValueError("Share operation cannot specify both 'folder_id' and 'file_id'")
        return self


class ShareUpdate(BaseModel):
    """Schema for updating an existing share permission."""

    permission: Literal["EDITOR", "VIEWER"] = Field(..., description="Updated permission level")


class ShareResponse(BaseModel):
    """Schema representing a resource share record."""

    id: uuid.UUID
    grantor_id: uuid.UUID
    grantee_id: uuid.UUID
    grantee_email: str | None = Field(default=None)
    grantee_name: str | None = Field(default=None)
    folder_id: uuid.UUID | None = None
    file_id: uuid.UUID | None = None
    resource_id: uuid.UUID
    resource_type: Literal["file", "folder"]
    resource_name: str | None = Field(default=None)
    permission: Literal["EDITOR", "VIEWER"]
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ShareListResponse(BaseModel):
    """Schema representing a list of shares."""

    shares: list[ShareResponse] = Field(default_factory=list)
