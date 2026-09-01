"""File Metadata & Storage Pydantic v2 Schemas."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class UploadInitiateRequest(BaseModel):
    filename: str = Field(..., min_length=1, max_length=255, description="Original file name")
    content_type: str = Field(default="application/octet-stream", description="MIME content type")
    size_bytes: int = Field(..., ge=0, description="Declared binary file size in bytes")
    folder_id: uuid.UUID | None = Field(default=None, description="Target parent folder UUID")
    checksum: str | None = Field(default=None, description="Optional SHA-256 checksum digest")


class UploadInitiateResponse(BaseModel):
    file_id: uuid.UUID = Field(..., description="Generated file entity UUID")
    upload_url: str = Field(..., description="Short-lived presigned upload URL")
    expires_at: datetime = Field(..., description="Presigned URL expiration timestamp")
    storage_key: str = Field(..., description="Server-assigned object storage key")


class UploadConfirmRequest(BaseModel):
    file_id: uuid.UUID = Field(..., description="Target file entity UUID to confirm")


class DownloadUrlResponse(BaseModel):
    file_id: uuid.UUID = Field(..., description="Target file entity UUID")
    download_url: str = Field(..., description="Short-lived presigned download URL")
    expires_at: datetime = Field(..., description="Presigned URL expiration timestamp")


class FileCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    folder_id: uuid.UUID | None = None
    mime_type: str = Field(default="application/octet-stream")
    size_bytes: int = Field(default=0, ge=0)


class FileUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    folder_id: uuid.UUID | None = None


class FileResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    folder_id: uuid.UUID | None
    name: str
    mime_type: str
    size_bytes: int
    storage_key: str
    status: str
    checksum: str | None = None
    uploaded_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class FileVersionResponse(BaseModel):
    id: uuid.UUID
    file_id: uuid.UUID
    version_number: int
    size_bytes: int
    storage_key: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class FileListResponse(BaseModel):
    files: list[FileResponse]
    total_count: int
