"""Search Repository for Authorization-Aware Metadata Search & Filtering."""

import re
import uuid
from typing import Any

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.file import File
from app.models.folder import Folder
from app.models.star import Star
from app.schemas.search import SearchQueryParams


def escape_sql_wildcards(val: str) -> str:
    """Escapes SQL ILIKE wildcard characters (% and _) in user queries."""
    val = val.replace("\\", "\\\\")
    val = val.replace("%", "\\%")
    val = val.replace("_", "\\_")
    return val


class SearchRepository:
    """Data access repository executing unified, authorization-scoped metadata queries."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def search_resources(
        self,
        user_id: uuid.UUID,
        params: SearchQueryParams,
        shared_file_ids: set[uuid.UUID] | None = None,
        shared_folder_ids: set[uuid.UUID] | None = None,
        offset: int = 0,
        limit: int = 20,
    ) -> tuple[list[dict[str, Any]], int]:
        """Performs authorization-aware search across files and folders based on metadata parameters."""
        shared_file_ids = shared_file_ids or set()
        shared_folder_ids = shared_folder_ids or set()

        query_files = params.type in ("file", "all")
        query_folders = params.type in ("folder", "all")

        # If filtering by file-only metadata (mime_type, extension, size), exclude folders
        if (
            params.mime_type
            or params.extension
            or params.min_size is not None
            or params.max_size is not None
        ):
            query_folders = False

        raw_q = params.q.strip()
        is_match_all = raw_q in ("*", "")
        escaped_q = escape_sql_wildcards(raw_q)
        pattern = f"%{escaped_q}%"

        results: list[dict[str, Any]] = []

        # -------------------------------------------------------------
        # 1. Search Files
        # -------------------------------------------------------------
        if query_files:
            file_conds = [File.deleted_at.is_(None)]

            # Authorization filter: Owned OR Shared
            auth_conds = [File.user_id == user_id]
            if shared_file_ids:
                auth_conds.append(File.id.in_(shared_file_ids))
            file_conds.append(or_(*auth_conds))

            # Query string matching (skip for match-all queries like "*")
            if not is_match_all:
                file_conds.append(File.name.ilike(pattern))

            # Additional filters
            if params.mime_type:
                clean_mime = escape_sql_wildcards(params.mime_type.strip())
                if "*" in clean_mime:
                    mime_pat = clean_mime.replace("*", "%")
                    file_conds.append(File.mime_type.ilike(mime_pat))
                else:
                    file_conds.append(File.mime_type == params.mime_type.strip())

            if params.extension:
                ext = params.extension.strip().lstrip(".")
                escaped_ext = escape_sql_wildcards(ext)
                file_conds.append(File.name.ilike(f"%.{escaped_ext}"))

            if params.min_size is not None:
                file_conds.append(File.size_bytes >= params.min_size)

            if params.max_size is not None:
                file_conds.append(File.size_bytes <= params.max_size)

            if params.created_after:
                file_conds.append(File.created_at >= params.created_after)

            if params.created_before:
                file_conds.append(File.created_at <= params.created_before)

            if params.updated_after:
                file_conds.append(File.updated_at >= params.updated_after)

            if params.updated_before:
                file_conds.append(File.updated_at <= params.updated_before)

            if params.folder_id is not None:
                file_conds.append(File.folder_id == params.folder_id)

            file_stmt = select(File).where(*file_conds)

            if params.starred is not None:
                file_stmt = file_stmt.join(Star, Star.file_id == File.id).where(
                    Star.user_id == user_id
                )

            res_f = await self.session.execute(file_stmt)
            for f_ent in res_f.scalars().all():
                results.append(
                    {
                        "id": f_ent.id,
                        "name": f_ent.name,
                        "type": "file",
                        "folder_id": f_ent.folder_id,
                        "mime_type": f_ent.mime_type,
                        "size_bytes": f_ent.size_bytes,
                        "starred": False,  # Will be populated via batch star check
                        "trashed": False,
                        "created_at": f_ent.created_at,
                        "updated_at": f_ent.updated_at,
                        "deleted_at": f_ent.deleted_at,
                    }
                )

        # -------------------------------------------------------------
        # 2. Search Folders
        # -------------------------------------------------------------
        if query_folders:
            folder_conds = [Folder.deleted_at.is_(None)]

            # Authorization filter: Owned OR Shared
            auth_fold_conds = [Folder.user_id == user_id]
            if shared_folder_ids:
                auth_fold_conds.append(Folder.id.in_(shared_folder_ids))
            folder_conds.append(or_(*auth_fold_conds))

            # Query string matching (skip for match-all queries like "*")
            if not is_match_all:
                folder_conds.append(Folder.name.ilike(pattern))

            if params.created_after:
                folder_conds.append(Folder.created_at >= params.created_after)

            if params.created_before:
                folder_conds.append(Folder.created_at <= params.created_before)

            if params.updated_after:
                folder_conds.append(Folder.updated_at >= params.updated_after)

            if params.updated_before:
                folder_conds.append(Folder.updated_at <= params.updated_before)

            if params.folder_id is not None:
                folder_conds.append(Folder.parent_id == params.folder_id)

            folder_stmt = select(Folder).where(*folder_conds)

            if params.starred is not None:
                folder_stmt = folder_stmt.join(Star, Star.folder_id == Folder.id).where(
                    Star.user_id == user_id
                )

            res_fold = await self.session.execute(folder_stmt)
            for fold_ent in res_fold.scalars().all():
                results.append(
                    {
                        "id": fold_ent.id,
                        "name": fold_ent.name,
                        "type": "folder",
                        "folder_id": fold_ent.parent_id,
                        "mime_type": None,
                        "size_bytes": None,
                        "starred": False,
                        "trashed": False,
                        "created_at": fold_ent.created_at,
                        "updated_at": fold_ent.updated_at,
                        "deleted_at": fold_ent.deleted_at,
                    }
                )

        # -------------------------------------------------------------
        # 3. Sorting & Pagination
        # -------------------------------------------------------------
        reverse = params.sort_order == "desc"
        if params.sort_by == "name":
            results.sort(
                key=lambda x: (x["type"] != "folder", x["name"].lower(), str(x["id"])),
                reverse=reverse,
            )
        elif params.sort_by == "size":
            results.sort(key=lambda x: (x["size_bytes"] or 0, str(x["id"])), reverse=reverse)
        elif params.sort_by == "createdAt":
            results.sort(key=lambda x: (x["created_at"], str(x["id"])), reverse=reverse)
        elif params.sort_by == "updatedAt":
            results.sort(key=lambda x: (x["updated_at"], str(x["id"])), reverse=reverse)

        total_count = len(results)
        paginated_items = results[offset : offset + limit]
        return paginated_items, total_count
