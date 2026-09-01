"""Public Link Sharing SQLAlchemy 2.x Declarative Model."""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.file import File
    from app.models.folder import Folder
    from app.models.user import User


class LinkShare(Base, TimestampMixin):
    """Public access link token share entity."""

    __tablename__ = "link_shares"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
    )
    created_by: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    folder_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("folders.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    file_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("files.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    token: Mapped[str] = mapped_column(
        String(64),
        unique=True,
        nullable=False,
        index=True,
    )
    hashed_password: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )
    expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        index=True,
    )
    allow_download: Mapped[bool] = mapped_column(
        default=True,
        nullable=False,
    )
    permission: Mapped[str] = mapped_column(
        String(20),
        default="VIEWER",
        nullable=False,
    )
    is_active: Mapped[bool] = mapped_column(
        default=True,
        nullable=False,
    )

    # Relationships
    creator: Mapped["User"] = relationship(
        "User",
        back_populates="link_shares",
    )
    folder: Mapped["Folder | None"] = relationship(
        "Folder",
        back_populates="link_shares",
    )
    file: Mapped["File | None"] = relationship(
        "File",
        back_populates="link_shares",
    )

    __table_args__ = (
        CheckConstraint(
            "(folder_id IS NOT NULL AND file_id IS NULL) OR (folder_id IS NULL AND file_id IS NOT NULL)",
            name="chk_link_share_target_xor",
        ),
        Index("idx_link_shares_token_lookup", "token", "is_active", "expires_at"),
    )
