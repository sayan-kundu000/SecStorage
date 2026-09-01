"""Add allow_download and permission columns to link_shares table.

Revision ID: 005_add_link_share_allow_download
Revises: 004_add_search_and_filter_indexes
Create Date: 2026-08-28 15:28:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "005_add_link_share_allow_download"
down_revision: str | None = "004_add_search_and_filter_indexes"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "link_shares",
        sa.Column(
            "allow_download",
            sa.Boolean(),
            nullable=False,
            server_default="true",
        ),
    )
    op.add_column(
        "link_shares",
        sa.Column(
            "permission",
            sa.String(length=20),
            nullable=False,
            server_default="VIEWER",
        ),
    )


def downgrade() -> None:
    op.drop_column("link_shares", "permission")
    op.drop_column("link_shares", "allow_download")
