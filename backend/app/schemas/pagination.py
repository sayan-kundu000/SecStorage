"""Cursor Pagination Pydantic v2 Schemas."""

from typing import Generic, TypeVar

from pydantic import BaseModel, Field

DataType = TypeVar("DataType")


class PaginationMeta(BaseModel):
    has_more: bool = Field(
        default=False, description="True if additional items exist beyond cursor"
    )
    next_cursor: str | None = Field(default=None, description="Opaque cursor token for next page")
    total_count: int | None = Field(
        default=None, description="Total items matching filter if computed"
    )


class PaginatedResponse(BaseModel, Generic[DataType]):  # noqa: UP046
    items: list[DataType] = Field(default_factory=list, description="Page item list")
    pagination: PaginationMeta = Field(default_factory=PaginationMeta)
