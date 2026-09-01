"""File Preview Pydantic v2 Data Transfer Objects."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class PreviewResponse(BaseModel):
    """File representation payload for inline preview."""

    file_id: uuid.UUID = Field(..., description="Target file identifier")
    version_id: uuid.UUID | None = Field(
        default=None, description="Previewed file version identifier"
    )
    preview_type: str = Field(..., description="Preview strategy: IMAGE, PDF, TEXT, UNSUPPORTED")
    mime_type: str = Field(..., description="Validated MIME content type")
    preview_url: str | None = Field(
        default=None, description="Temporary presigned URL for binary media preview"
    )
    text_content: str | None = Field(
        default=None, description="Sanitized text snippet for plain text/code files"
    )
    expires_at: datetime | None = Field(
        default=None, description="Expiration timestamp of preview URL"
    )
    is_truncated: bool = Field(
        default=False, description="True if text snippet was truncated due to size limits"
    )
    message: str | None = Field(
        default=None, description="Status summary or unsupported format notice"
    )

    model_config = ConfigDict(from_attributes=True)
