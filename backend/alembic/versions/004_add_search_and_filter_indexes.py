"""Add Search, Filter & Soft-Delete Indexes Migration.

Revision ID: 004_add_search_and_filter_indexes
Revises: 003_add_file_storage_fields
Create Date: 2026-08-28 15:20:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "004_add_search_and_filter_indexes"
down_revision: str | None = "003_add_file_storage_fields"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 1. Functional indexes on lower(name) for case-insensitive metadata search
    op.create_index(
        "idx_files_lower_name",
        "files",
        [sa.text("lower(name)")],
        unique=False,
    )
    op.create_index(
        "idx_folders_lower_name",
        "folders",
        [sa.text("lower(name)")],
        unique=False,
    )

    # 2. Composite indexes for active / trashed resource filtering and sorting
    op.create_index(
        "idx_files_user_active_updated",
        "files",
        ["user_id", "deleted_at", "updated_at"],
        unique=False,
    )
    op.create_index(
        "idx_folders_user_active_updated",
        "folders",
        ["user_id", "deleted_at", "updated_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("idx_folders_user_active_updated", table_name="folders")
    op.drop_index("idx_files_user_active_updated", table_name="files")
    op.drop_index("idx_folders_lower_name", table_name="folders")
    op.drop_index("idx_files_lower_name", table_name="files")
