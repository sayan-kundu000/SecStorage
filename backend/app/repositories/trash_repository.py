"""Trash Repository for Soft-Delete Lifecycle & Recovery Management."""

import uuid
from datetime import UTC, datetime

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.file import File
from app.models.folder import Folder


class TrashRepository:
    """Data access repository managing soft-deletion, restoration, conflict checks, and permanent purging."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def check_active_file_name_conflict(
        self, user_id: uuid.UUID, folder_id: uuid.UUID | None, name: str
    ) -> bool:
        """Returns True if an active (non-deleted) file with same name exists in parent folder."""
        stmt = select(File.id).where(
            File.user_id == user_id,
            File.folder_id == folder_id,
            File.name == name,
            File.deleted_at.is_(None),
        )
        res = await self.session.execute(stmt)
        return res.scalar_one_or_none() is not None

    async def check_active_folder_name_conflict(
        self, user_id: uuid.UUID, parent_id: uuid.UUID | None, name: str
    ) -> bool:
        """Returns True if an active (non-deleted) folder with same name exists in parent directory."""
        stmt = select(Folder.id).where(
            Folder.user_id == user_id,
            Folder.parent_id == parent_id,
            Folder.name == name,
            Folder.deleted_at.is_(None),
        )
        res = await self.session.execute(stmt)
        return res.scalar_one_or_none() is not None

    async def soft_delete_file(self, file_id: uuid.UUID) -> datetime:
        """Marks file entity soft-deleted with current timestamp."""
        file_ent = await self.session.get(File, file_id)
        if file_ent and file_ent.deleted_at is None:
            now = datetime.now(UTC)
            file_ent.deleted_at = now
            await self.session.flush()
            return now
        return file_ent.deleted_at if file_ent else datetime.now(UTC)

    async def get_folder_subtree_ids(
        self, root_folder_id: uuid.UUID
    ) -> tuple[list[uuid.UUID], list[uuid.UUID]]:
        """BFS traversal retrieving all descendant folder IDs and file IDs under root folder."""
        folder_ids: list[uuid.UUID] = [root_folder_id]
        file_ids: list[uuid.UUID] = []

        queue = [root_folder_id]
        while queue:
            current_id = queue.pop(0)
            # Find subfolders
            sf_stmt = select(Folder.id).where(Folder.parent_id == current_id)
            sf_res = await self.session.execute(sf_stmt)
            sub_ids = list(sf_res.scalars().all())

            for sub_id in sub_ids:
                folder_ids.append(sub_id)
                queue.append(sub_id)

            # Find files in current folder
            f_stmt = select(File.id).where(File.folder_id == current_id)
            f_res = await self.session.execute(f_stmt)
            file_ids.extend(list(f_res.scalars().all()))

        return folder_ids, file_ids

    async def soft_delete_folder_tree(
        self, folder_id: uuid.UUID
    ) -> tuple[list[uuid.UUID], list[uuid.UUID]]:
        """Recursively soft-deletes target folder and all descendant subfolders and files."""
        folder_ids, file_ids = await self.get_folder_subtree_ids(folder_id)
        now = datetime.now(UTC)

        if folder_ids:
            stmt_f = select(Folder).where(
                Folder.id.in_(folder_ids),
                Folder.deleted_at.is_(None),
            )
            res_f = await self.session.execute(stmt_f)
            for folder_ent in res_f.scalars().all():
                folder_ent.deleted_at = now

        if file_ids:
            stmt_file = select(File).where(
                File.id.in_(file_ids),
                File.deleted_at.is_(None),
            )
            res_file = await self.session.execute(stmt_file)
            for file_ent in res_file.scalars().all():
                file_ent.deleted_at = now

        await self.session.flush()
        return file_ids, folder_ids

    async def restore_file(self, file_id: uuid.UUID) -> bool:
        """Restores soft-deleted file back to active state."""
        file_ent = await self.session.get(File, file_id)
        if file_ent and file_ent.deleted_at is not None:
            file_ent.deleted_at = None
            file_ent.updated_at = datetime.now(UTC)
            await self.session.flush()
            return True
        return False

    async def restore_folder_tree(
        self, folder_id: uuid.UUID
    ) -> tuple[list[uuid.UUID], list[uuid.UUID]]:
        """Recursively restores target folder and descendant soft-deleted items."""
        folder_ids, file_ids = await self.get_folder_subtree_ids(folder_id)
        now = datetime.now(UTC)

        restored_folder_ids: list[uuid.UUID] = []
        restored_file_ids: list[uuid.UUID] = []

        if folder_ids:
            stmt_f = select(Folder).where(
                Folder.id.in_(folder_ids),
                Folder.deleted_at.is_not(None),
            )
            res_f = await self.session.execute(stmt_f)
            for folder_ent in res_f.scalars().all():
                folder_ent.deleted_at = None
                folder_ent.updated_at = now
                restored_folder_ids.append(folder_ent.id)

        if file_ids:
            stmt_file = select(File).where(
                File.id.in_(file_ids),
                File.deleted_at.is_not(None),
            )
            res_file = await self.session.execute(stmt_file)
            for file_ent in res_file.scalars().all():
                file_ent.deleted_at = None
                file_ent.updated_at = now
                restored_file_ids.append(file_ent.id)

        await self.session.flush()
        return restored_file_ids, restored_folder_ids

    async def list_trash_items(
        self,
        user_id: uuid.UUID,
        offset: int = 0,
        limit: int = 20,
        sort_by: str = "deletedAt",
        sort_order: str = "desc",
    ) -> tuple[list[dict], int]:
        """Lists soft-deleted files and folders in user trash."""
        file_stmt = select(File).where(
            File.user_id == user_id,
            File.deleted_at.is_not(None),
        )
        folder_stmt = select(Folder).where(
            Folder.user_id == user_id,
            Folder.deleted_at.is_not(None),
        )

        res_files = await self.session.execute(file_stmt)
        res_folders = await self.session.execute(folder_stmt)

        items: list[dict] = []
        for file_ent in res_files.scalars().all():
            items.append(
                {
                    "id": file_ent.id,
                    "name": file_ent.name,
                    "type": "file",
                    "folder_id": file_ent.folder_id,
                    "mime_type": file_ent.mime_type,
                    "size_bytes": file_ent.size_bytes,
                    "starred": False,
                    "deleted_at": file_ent.deleted_at,
                    "created_at": file_ent.created_at,
                    "updated_at": file_ent.updated_at,
                }
            )

        for folder_ent in res_folders.scalars().all():
            items.append(
                {
                    "id": folder_ent.id,
                    "name": folder_ent.name,
                    "type": "folder",
                    "folder_id": folder_ent.parent_id,
                    "mime_type": None,
                    "size_bytes": None,
                    "starred": False,
                    "deleted_at": folder_ent.deleted_at,
                    "created_at": folder_ent.created_at,
                    "updated_at": folder_ent.updated_at,
                }
            )

        # Sorting logic
        reverse = sort_order.lower() == "desc"
        if sort_by == "name":
            items.sort(key=lambda x: x["name"].lower(), reverse=reverse)
        elif sort_by == "size":
            items.sort(key=lambda x: x["size_bytes"] or 0, reverse=reverse)
        else:  # default deletedAt / createdAt
            items.sort(key=lambda x: x["deleted_at"] or x["created_at"], reverse=reverse)

        total_count = len(items)
        paginated = items[offset : offset + limit]
        return paginated, total_count

    async def get_folder_subtree_entities(
        self, root_folder_id: uuid.UUID
    ) -> tuple[list[File], list[Folder]]:
        """Retrieves entity lists for all descendant files and folders in subtree for hard deletion."""
        folder_ids, file_ids = await self.get_folder_subtree_ids(root_folder_id)

        folders: list[Folder] = []
        files: list[File] = []

        if folder_ids:
            res_f = await self.session.execute(select(Folder).where(Folder.id.in_(folder_ids)))
            folders = list(res_f.scalars().all())

        if file_ids:
            res_file = await self.session.execute(select(File).where(File.id.in_(file_ids)))
            files = list(res_file.scalars().all())

        return files, folders

    async def hard_delete_file(self, file_id: uuid.UUID) -> bool:
        """Permanently purges file record from database."""
        stmt = delete(File).where(File.id == file_id)
        res = await self.session.execute(stmt)
        await self.session.flush()
        return res.rowcount > 0

    async def hard_delete_folder(self, folder_id: uuid.UUID) -> bool:
        """Permanently purges folder record from database."""
        stmt = delete(Folder).where(Folder.id == folder_id)
        res = await self.session.execute(stmt)
        await self.session.flush()
        return res.rowcount > 0
