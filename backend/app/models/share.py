"""User Access Sharing SQLAlchemy 2.x Declarative Model."""

import uuid
from enum import StrEnum
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, ForeignKey, Index, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.file import File
    from app.models.folder import Folder
    from app.models.user import User


class ShareRole(StrEnum):
    """Resource Share Access Permission Role."""

    EDITOR = "EDITOR"
    VIEWER = "VIEWER"


class Share(Base, TimestampMixin):
    """Resource sharing permission granted to a target user."""

    __tablename__ = "shares"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
    )
    grantor_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    grantee_id: Mapped[uuid.UUID] = mapped_column(
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
    permission: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
    )

    # Relationships
    grantor: Mapped["User"] = relationship(
        "User",
        foreign_keys=[grantor_id],
        back_populates="shares_granted",
    )
    grantee: Mapped["User"] = relationship(
        "User",
        foreign_keys=[grantee_id],
        back_populates="shares_received",
    )
    folder: Mapped["Folder | None"] = relationship(
        "Folder",
        back_populates="shares",
    )
    file: Mapped["File | None"] = relationship(
        "File",
        back_populates="shares",
    )

    __table_args__ = (
        CheckConstraint(
            "permission IN ('EDITOR', 'VIEWER')",
            name="chk_share_permission_valid",
        ),
        CheckConstraint(
            "(folder_id IS NOT NULL AND file_id IS NULL) OR (folder_id IS NULL AND file_id IS NOT NULL)",
            name="chk_share_target_xor",
        ),
        UniqueConstraint("grantee_id", "folder_id", name="uq_share_grantee_folder"),
        UniqueConstraint("grantee_id", "file_id", name="uq_share_grantee_file"),
        Index("idx_shares_grantee_lookup", "grantee_id", "permission"),
    )
