"""File Metadata SQLAlchemy 2.x Declarative Model."""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.file_version import FileVersion
    from app.models.folder import Folder
    from app.models.link_share import LinkShare
    from app.models.share import Share
    from app.models.star import Star
    from app.models.user import User


class File(Base, TimestampMixin):
    """File metadata entity tracking object lifecycle, storage key, and checksum."""

    __tablename__ = "files"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    folder_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("folders.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    mime_type: Mapped[str] = mapped_column(
        String(127),
        nullable=False,
        default="application/octet-stream",
    )
    size_bytes: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )
    storage_key: Mapped[str] = mapped_column(
        String(512),
        unique=True,
        nullable=False,
        index=True,
    )
    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="PENDING",
        index=True,
    )
    checksum: Mapped[str | None] = mapped_column(
        String(64),
        nullable=True,
    )
    uploaded_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        index=True,
    )

    # Relationships
    owner: Mapped["User"] = relationship(
        "User",
        back_populates="files",
    )
    folder: Mapped["Folder | None"] = relationship(
        "Folder",
        back_populates="files",
    )
    versions: Mapped[list["FileVersion"]] = relationship(
        "FileVersion",
        back_populates="file",
        cascade="all, delete-orphan",
    )
    shares: Mapped[list["Share"]] = relationship(
        "Share",
        back_populates="file",
        cascade="all, delete-orphan",
    )
    link_shares: Mapped[list["LinkShare"]] = relationship(
        "LinkShare",
        back_populates="file",
        cascade="all, delete-orphan",
    )
    stars: Mapped[list["Star"]] = relationship(
        "Star",
        back_populates="file",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        Index("idx_files_owner_active", "user_id", "folder_id", "deleted_at"),
        Index("idx_files_status", "status"),
    )
