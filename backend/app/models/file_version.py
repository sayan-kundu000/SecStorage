"""File Version SQLAlchemy 2.x Declarative Model."""

import uuid
from datetime import UTC, datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.file import File
    from app.models.user import User


class FileVersion(Base):
    """File version entity for tracking file revisions."""

    __tablename__ = "file_versions"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
    )
    file_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("files.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    version_number: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )
    storage_key: Mapped[str] = mapped_column(
        String(512),
        nullable=False,
    )
    size_bytes: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False,
    )
    checksum: Mapped[str | None] = mapped_column(
        String(64),
        nullable=True,
    )
    mime_type: Mapped[str | None] = mapped_column(
        String(127),
        nullable=True,
        default="application/octet-stream",
    )
    original_filename: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )

    # Relationships
    file: Mapped["File"] = relationship(
        "File",
        back_populates="versions",
    )
    creator: Mapped["User | None"] = relationship(
        "User",
    )

    __table_args__ = (
        UniqueConstraint("file_id", "version_number", name="uq_file_version_number"),
        CheckConstraint("version_number >= 1", name="chk_file_version_number_positive"),
        CheckConstraint("size_bytes >= 0", name="chk_file_version_size_positive"),
        Index("idx_file_versions_lookup", "file_id", "version_number"),
    )
