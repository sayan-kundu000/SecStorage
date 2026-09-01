"""Add mime_type and original_filename columns to file_versions.

Revision ID: 006
Revises: 005
Create Date: 2026-08-28

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "006_add_version_mime_and_filename"
down_revision: Union[str, None] = "005_add_link_share_allow_download"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "file_versions",
        sa.Column(
            "mime_type",
            sa.String(length=127),
            nullable=True,
            server_default="application/octet-stream",
        ),
    )
    op.add_column(
        "file_versions",
        sa.Column("original_filename", sa.String(length=255), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("file_versions", "original_filename")
    op.drop_column("file_versions", "mime_type")
