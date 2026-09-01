"""Audit Trail Activity & Security Audit Pydantic v2 Schemas."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ActivityResponse(BaseModel):
    """Single user activity / security audit event payload."""

    id: uuid.UUID = Field(..., description="Unique event identifier")
    user_id: uuid.UUID = Field(..., description="Actor user identifier")
    action: str = Field(..., description="Action name or event type")
    resource_type: str = Field(
        ..., description="Target resource domain type (FILE, FOLDER, USER, SYSTEM)"
    )
    resource_id: uuid.UUID = Field(..., description="Target resource identifier")
    metadata_json: str | None = Field(default=None, description="Structured JSON event metadata")
    ip_address: str | None = Field(default=None, description="Actor IP address if logged")
    created_at: datetime = Field(..., description="Timestamp when event occurred")

    model_config = ConfigDict(from_attributes=True)


class ActivityListResponse(BaseModel):
    """Paginated list of activity or security audit records."""

    items: list[ActivityResponse] = Field(default_factory=list, description="Activity records")
    total: int = Field(..., description="Total matching activity records")
    page: int = Field(default=1, description="Current page index")
    page_size: int = Field(default=50, description="Items per page")

    model_config = ConfigDict(from_attributes=True)
