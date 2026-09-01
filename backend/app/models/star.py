"""Resource Favorite Star SQLAlchemy 2.x Declarative Model."""

import uuid
from datetime import UTC, datetime
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.file import File
    from app.models.folder import Folder
    from app.models.user import User


class Star(Base):
    """Starred favorite resource marker for files and folders."""

    __tablename__ = "stars"

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
    file_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("files.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )

    # Relationships
    user: Mapped["User"] = relationship(
        "User",
        back_populates="stars",
    )
    folder: Mapped["Folder | None"] = relationship(
        "Folder",
        back_populates="stars",
    )
    file: Mapped["File | None"] = relationship(
        "File",
        back_populates="stars",
    )

    __table_args__ = (
        CheckConstraint(
            "(folder_id IS NOT NULL AND file_id IS NULL) OR (folder_id IS NULL AND file_id IS NOT NULL)",
            name="chk_star_target_xor",
        ),
        UniqueConstraint("user_id", "folder_id", name="uq_star_user_folder"),
        UniqueConstraint("user_id", "file_id", name="uq_star_user_file"),
        Index("idx_stars_user_lookup", "user_id"),
    )
