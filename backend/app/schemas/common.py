"""Common Pydantic v2 API Response Schemas."""

from typing import Generic, TypeVar

from pydantic import BaseModel

from app.schemas.error import ErrorPayload

DataType = TypeVar("DataType")


class APIResponse(BaseModel, Generic[DataType]):  # noqa: UP046
    success: bool = True
    data: DataType | None = None
    message: str | None = None
    error: ErrorPayload | None = None


class HealthStatus(BaseModel):
    status: str = "ok"
    version: str = "0.1.0"
    environment: str = "development"


class ReadinessStatus(BaseModel):
    status: str = "ready"
    database: str = "connected"
    environment: str = "development"
