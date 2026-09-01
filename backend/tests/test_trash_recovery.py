"""Integration & Unit Tests for Trash Soft-Delete, Restoration & Permanent Purging."""

import uuid
from unittest.mock import AsyncMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.security import create_access_token
from tests.conftest import app_instance
from app.models.file import File
from app.models.folder import Folder
from app.models.user import User


@pytest.fixture
async def trash_test_setup(db_session):
    """Fixture creating user, folder hierarchy, and files for trash testing."""
    user = User(
        id=uuid.uuid4(),
        email="trashuser@secstorage.io",
        hashed_password="hashed_pwd_123",
        full_name="Trash User",
        is_active=True,
    )
    user2 = User(
        id=uuid.uuid4(),
        email="trashuser2@secstorage.io",
        hashed_password="hashed_pwd_123",
        full_name="Trash User 2",
        is_active=True,
    )
    db_session.add_all([user, user2])
    await db_session.commit()

    parent_folder = Folder(
        id=uuid.uuid4(),
        name="Archive Directory",
        user_id=user.id,
    )
    db_session.add(parent_folder)
    await db_session.commit()

    file1 = File(
        id=uuid.uuid4(),
        user_id=user.id,
        folder_id=parent_folder.id,
        name="Old_Doc.pdf",
        mime_type="application/pdf",
        size_bytes=4096,
        storage_key=f"users/{user.id}/files/old_doc.pdf",
        status="READY",
    )
    file2 = File(
        id=uuid.uuid4(),
        user_id=user.id,
        folder_id=parent_folder.id,
        name="Contract.pdf",
        mime_type="application/pdf",
        size_bytes=8192,
        storage_key=f"users/{user.id}/files/contract.pdf",
        status="READY",
    )
    db_session.add_all([file1, file2])
    await db_session.commit()

    return {
        "user": user,
        "user2": user2,
        "parent_folder": parent_folder,
        "file1": file1,
        "file2": file2,
    }


@pytest.mark.asyncio
async def test_trash_file_and_list_trash(trash_test_setup):
    """Tests moving a file to trash and listing trash items."""
    user = trash_test_setup["user"]
    file1 = trash_test_setup["file1"]
    token = create_access_token(user.id)

    async with AsyncClient(
        transport=ASGITransport(app=app_instance), base_url="http://testserver"
    ) as ac:
        # 1. Soft-delete file
        trash_resp = await ac.delete(
            f"/api/v1/files/{file1.id}",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert trash_resp.status_code == 204

        # 2. List Trash
        list_resp = await ac.get(
            "/api/v1/trash",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert list_resp.status_code == 200
        items = list_resp.json()["data"]["items"]
        assert len(items) == 1
        assert items[0]["id"] == str(file1.id)
        assert items[0]["name"] == "Old_Doc.pdf"


@pytest.mark.asyncio
async def test_restore_file(trash_test_setup):
    """Tests restoring a soft-deleted file back to active state."""
    user = trash_test_setup["user"]
    file1 = trash_test_setup["file1"]
    token = create_access_token(user.id)

    async with AsyncClient(
        transport=ASGITransport(app=app_instance), base_url="http://testserver"
    ) as ac:
        # Move to trash
        await ac.delete(
            f"/api/v1/files/{file1.id}",
            headers={"Authorization": f"Bearer {token}"},
        )

        # Restore file
        restore_resp = await ac.post(
            f"/api/v1/trash/files/{file1.id}/restore",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert restore_resp.status_code == 200
        data = restore_resp.json()["data"]
        assert data["id"] == str(file1.id)
        assert data["restored"] is True

        # Verify trash is now empty
        list_resp = await ac.get(
            "/api/v1/trash",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert len(list_resp.json()["data"]["items"]) == 0


@pytest.mark.asyncio
async def test_restore_name_conflict(trash_test_setup, db_session):
    """Tests that restoring a file fails with 409 CONFLICT if an active file with same name exists."""
    user = trash_test_setup["user"]
    parent = trash_test_setup["parent_folder"]
    file1 = trash_test_setup["file1"]
    token = create_access_token(user.id)

    async with AsyncClient(
        transport=ASGITransport(app=app_instance), base_url="http://testserver"
    ) as ac:
        # Move file1 to trash
        await ac.delete(
            f"/api/v1/files/{file1.id}",
            headers={"Authorization": f"Bearer {token}"},
        )

        # Create a new active file with the EXACT same name in the same parent folder
        conflicting_file = File(
            id=uuid.uuid4(),
            user_id=user.id,
            folder_id=parent.id,
            name=file1.name,  # "Old_Doc.pdf"
            mime_type="application/pdf",
            size_bytes=1000,
            storage_key=f"users/{user.id}/files/conflicting.pdf",
            status="READY",
        )
        db_session.add(conflicting_file)
        await db_session.commit()

        # Attempt restore
        restore_resp = await ac.post(
            f"/api/v1/trash/files/{file1.id}/restore",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert restore_resp.status_code == 409
        assert "RESOURCE_NAME_CONFLICT" in restore_resp.json()["error"]["message"]


@pytest.mark.asyncio
async def test_permanent_delete_file(trash_test_setup):
    """Tests permanently purging a file, ensuring StorageService.delete_object is called."""
    user = trash_test_setup["user"]
    file1 = trash_test_setup["file1"]
    token = create_access_token(user.id)

    async with AsyncClient(
        transport=ASGITransport(app=app_instance), base_url="http://testserver"
    ) as ac:
        # Move to trash
        await ac.delete(
            f"/api/v1/files/{file1.id}",
            headers={"Authorization": f"Bearer {token}"},
        )

        # Permanent purge
        with patch("app.services.trash_service.StorageService.delete_object", new_callable=AsyncMock) as mock_del:
            purge_resp = await ac.delete(
                f"/api/v1/trash/files/{file1.id}",
                headers={"Authorization": f"Bearer {token}"},
            )
            assert purge_resp.status_code == 204
            mock_del.assert_called_once_with(file1.storage_key)


@pytest.mark.asyncio
async def test_recursive_trash_and_permanent_delete_folder(trash_test_setup):
    """Tests recursive trash and permanent deletion of folder subtree."""
    user = trash_test_setup["user"]
    parent = trash_test_setup["parent_folder"]
    token = create_access_token(user.id)

    async with AsyncClient(
        transport=ASGITransport(app=app_instance), base_url="http://testserver"
    ) as ac:
        # Soft-delete parent folder (which contains file1 and file2)
        trash_resp = await ac.delete(
            f"/api/v1/folders/{parent.id}",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert trash_resp.status_code == 204

        # Permanent delete folder
        with patch("app.services.trash_service.StorageService.delete_object", new_callable=AsyncMock) as mock_del:
            purge_resp = await ac.delete(
                f"/api/v1/trash/folders/{parent.id}",
                headers={"Authorization": f"Bearer {token}"},
            )
            assert purge_resp.status_code == 204
            # Storage delete called for contained files
            assert mock_del.call_count == 2
