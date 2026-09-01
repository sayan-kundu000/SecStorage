"""User SQLAlchemy 2.x Declarative Model."""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.activity import Activity
    from app.models.file import File
    from app.models.folder import Folder
    from app.models.link_share import LinkShare
    from app.models.share import Share
    from app.models.star import Star


class User(Base, TimestampMixin):
    """User account identity and profile entity."""

    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
    )
    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        nullable=False,
        index=True,
    )
    hashed_password: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    full_name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    is_active: Mapped[bool] = mapped_column(
        default=True,
        nullable=False,
    )
    is_verified: Mapped[bool] = mapped_column(
        default=False,
        nullable=False,
    )
    is_admin: Mapped[bool] = mapped_column(
        default=False,
        nullable=False,
    )
    last_login_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # Relationships
    folders: Mapped[list["Folder"]] = relationship(
        "Folder",
        back_populates="owner",
        cascade="all, delete-orphan",
    )
    files: Mapped[list["File"]] = relationship(
        "File",
        back_populates="owner",
        cascade="all, delete-orphan",
    )
    shares_granted: Mapped[list["Share"]] = relationship(
        "Share",
        foreign_keys="Share.grantor_id",
        back_populates="grantor",
        cascade="all, delete-orphan",
    )
    shares_received: Mapped[list["Share"]] = relationship(
        "Share",
        foreign_keys="Share.grantee_id",
        back_populates="grantee",
        cascade="all, delete-orphan",
    )
    link_shares: Mapped[list["LinkShare"]] = relationship(
        "LinkShare",
        back_populates="creator",
        cascade="all, delete-orphan",
    )
    stars: Mapped[list["Star"]] = relationship(
        "Star",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    activities: Mapped[list["Activity"]] = relationship(
        "Activity",
        back_populates="user",
        cascade="all, delete-orphan",
    )
