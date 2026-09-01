"""Add status, checksum, and uploaded_at fields to files table.

Revision ID: 003_add_file_storage_fields
Revises: 002_create_sessions_table
Create Date: 2026-08-26 18:54:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "003_add_file_storage_fields"
down_revision: str | None = "002_create_sessions_table"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "files", sa.Column("status", sa.String(length=20), nullable=False, server_default="PENDING")
    )
    op.add_column("files", sa.Column("checksum", sa.String(length=64), nullable=True))
    op.add_column("files", sa.Column("uploaded_at", sa.DateTime(timezone=True), nullable=True))
    op.create_index("idx_files_status", "files", ["status"])


def downgrade() -> None:
    op.drop_index("idx_files_status", table_name="files")
    op.drop_column("files", "uploaded_at")
    op.drop_column("files", "checksum")
    op.drop_column("files", "status")
