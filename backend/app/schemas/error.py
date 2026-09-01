"""Pydantic v2 Error Response Schemas."""

from typing import Any

from pydantic import BaseModel


class ValidationErrorDetail(BaseModel):
    field: str
    message: str


class ErrorPayload(BaseModel):
    code: str
    message: str
    details: list[ValidationErrorDetail] | list[Any] | None = None
