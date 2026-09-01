"""Folder SQLAlchemy 2.x Declarative Model."""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Index, String, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.file import File
    from app.models.link_share import LinkShare
    from app.models.share import Share
    from app.models.star import Star
    from app.models.user import User


class Folder(Base, TimestampMixin):
    """Logical directory folder hierarchy entity."""

    __tablename__ = "folders"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    parent_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("folders.id", ondelete="RESTRICT"),
        nullable=True,
        index=True,
    )
    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        index=True,
    )

    # Relationships
    owner: Mapped["User"] = relationship(
        "User",
        back_populates="folders",
    )
    parent: Mapped["Folder | None"] = relationship(
        "Folder",
        remote_side=[id],
        back_populates="subfolders",
    )
    subfolders: Mapped[list["Folder"]] = relationship(
        "Folder",
        back_populates="parent",
    )
    files: Mapped[list["File"]] = relationship(
        "File",
        back_populates="folder",
    )
    shares: Mapped[list["Share"]] = relationship(
        "Share",
        back_populates="folder",
        cascade="all, delete-orphan",
    )
    link_shares: Mapped[list["LinkShare"]] = relationship(
        "LinkShare",
        back_populates="folder",
        cascade="all, delete-orphan",
    )
    stars: Mapped[list["Star"]] = relationship(
        "Star",
        back_populates="folder",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        Index(
            "idx_folders_unique_active_name",
            "user_id",
            "parent_id",
            "name",
            unique=True,
            postgresql_where=text("deleted_at IS NULL"),
        ),
        Index("idx_folders_user_parent", "user_id", "parent_id", "deleted_at"),
    )
