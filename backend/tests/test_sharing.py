"""Integration & Unit Tests for User-to-User Sharing & Permission Inheritance Engine."""

import uuid

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.security import create_access_token
from app.models.file import File
from app.models.folder import Folder
from app.models.user import User
from tests.conftest import app_instance


@pytest.fixture
async def sharing_test_setup(db_session):
    """Fixture initializing grantor, grantee, folders, and files for sharing tests."""
    user1 = User(
        id=uuid.uuid4(),
        email="grantor@secstorage.io",
        hashed_password="hashed_pwd_123",
        full_name="Grantor User",
        is_active=True,
    )
    user2 = User(
        id=uuid.uuid4(),
        email="grantee@secstorage.io",
        hashed_password="hashed_pwd_123",
        full_name="Grantee User",
        is_active=True,
    )
    db_session.add_all([user1, user2])
    await db_session.commit()

    parent_folder = Folder(
        id=uuid.uuid4(),
        name="Shared Project",
        user_id=user1.id,
    )
    child_file = File(
        id=uuid.uuid4(),
        user_id=user1.id,
        folder_id=parent_folder.id,
        name="Architecture Diagram.png",
        mime_type="image/png",
        size_bytes=4096,
        storage_key=f"users/{user1.id}/files/arch.png",
        status="READY",
    )
    standalone_file = File(
        id=uuid.uuid4(),
        user_id=user1.id,
        folder_id=None,
        name="Private Notes.txt",
        mime_type="text/plain",
        size_bytes=1024,
        storage_key=f"users/{user1.id}/files/notes.txt",
        status="READY",
    )
    db_session.add_all([parent_folder, child_file, standalone_file])
    await db_session.commit()

    return {
        "user1": user1,
        "user2": user2,
        "parent_folder": parent_folder,
        "child_file": child_file,
        "standalone_file": standalone_file,
    }


@pytest.mark.asyncio
async def test_user_file_sharing_lifecycle(sharing_test_setup):
    """Tests granting, listing, updating, and revoking a direct file share."""
    user1 = sharing_test_setup["user1"]
    user2 = sharing_test_setup["user2"]
    file1 = sharing_test_setup["standalone_file"]

    token1 = create_access_token(user1.id)
    token2 = create_access_token(user2.id)

    async with AsyncClient(
        transport=ASGITransport(app=app_instance), base_url="http://testserver"
    ) as ac:
        # 1. User 1 grants VIEWER share to User 2
        grant_resp = await ac.post(
            f"/api/v1/files/{file1.id}/shares",
            json={"grantee_email": user2.email, "permission": "VIEWER"},
            headers={"Authorization": f"Bearer {token1}"},
        )
        assert grant_resp.status_code == 201
        share_data = grant_resp.json()["data"]
        share_id = share_data["id"]
        assert share_data["permission"] == "VIEWER"
        assert share_data["grantee_email"] == user2.email

        # 2. User 2 lists received shares
        list_resp = await ac.get(
            "/api/v1/shares",
            headers={"Authorization": f"Bearer {token2}"},
        )
        assert list_resp.status_code == 200
        shares = list_resp.json()["data"]["shares"]
        assert len(shares) == 1
        assert shares[0]["resource_name"] == "Private Notes.txt"

        # 3. User 2 generates download URL for shared file
        dl_resp = await ac.get(
            f"/api/v1/files/{file1.id}/download",
            headers={"Authorization": f"Bearer {token2}"},
        )
        assert dl_resp.status_code == 200
        assert "download_url" in dl_resp.json()["data"]

        # 4. User 1 upgrades share to EDITOR
        update_resp = await ac.patch(
            f"/api/v1/shares/{share_id}",
            json={"permission": "EDITOR"},
            headers={"Authorization": f"Bearer {token1}"},
        )
        assert update_resp.status_code == 200
        assert update_resp.json()["data"]["permission"] == "EDITOR"

        # 5. User 1 revokes share
        revoke_resp = await ac.delete(
            f"/api/v1/shares/{share_id}",
            headers={"Authorization": f"Bearer {token1}"},
        )
        assert revoke_resp.status_code == 204

        # 6. User 2 download attempt is now forbidden
        dl_resp_2 = await ac.get(
            f"/api/v1/files/{file1.id}/download",
            headers={"Authorization": f"Bearer {token2}"},
        )
        assert dl_resp_2.status_code in (403, 404)


@pytest.mark.asyncio
async def test_folder_sharing_inheritance(sharing_test_setup):
    """Tests that sharing a folder implicitly grants permission to contained descendant files."""
    user1 = sharing_test_setup["user1"]
    user2 = sharing_test_setup["user2"]
    parent = sharing_test_setup["parent_folder"]
    child = sharing_test_setup["child_file"]

    token1 = create_access_token(user1.id)
    token2 = create_access_token(user2.id)

    async with AsyncClient(
        transport=ASGITransport(app=app_instance), base_url="http://testserver"
    ) as ac:
        # User 1 shares parent folder with User 2
        grant_resp = await ac.post(
            f"/api/v1/folders/{parent.id}/shares",
            json={"grantee_email": user2.email, "permission": "VIEWER"},
            headers={"Authorization": f"Bearer {token1}"},
        )
        assert grant_resp.status_code == 201

        # User 2 downloads child file inside parent folder via inherited permission
        dl_resp = await ac.get(
            f"/api/v1/files/{child.id}/download",
            headers={"Authorization": f"Bearer {token2}"},
        )
        assert dl_resp.status_code == 200
        assert "download_url" in dl_resp.json()["data"]


@pytest.mark.asyncio
async def test_self_sharing_rejection(sharing_test_setup):
    """Tests that self-sharing attempts are rejected."""
    user1 = sharing_test_setup["user1"]
    file1 = sharing_test_setup["standalone_file"]
    token1 = create_access_token(user1.id)

    async with AsyncClient(
        transport=ASGITransport(app=app_instance), base_url="http://testserver"
    ) as ac:
        resp = await ac.post(
            f"/api/v1/files/{file1.id}/shares",
            json={"grantee_email": user1.email, "permission": "VIEWER"},
            headers={"Authorization": f"Bearer {token1}"},
        )
        assert resp.status_code in (400, 422)


@pytest.mark.asyncio
async def test_share_nonexistent_recipient(sharing_test_setup):
    """Tests sharing with a non-existent email returns 404 Not Found."""
    user1 = sharing_test_setup["user1"]
    file1 = sharing_test_setup["standalone_file"]
    token1 = create_access_token(user1.id)

    async with AsyncClient(
        transport=ASGITransport(app=app_instance), base_url="http://testserver"
    ) as ac:
        resp = await ac.post(
            f"/api/v1/files/{file1.id}/shares",
            json={"grantee_email": "nonexistent@secstorage.io", "permission": "VIEWER"},
            headers={"Authorization": f"Bearer {token1}"},
        )
        assert resp.status_code == 404


@pytest.mark.asyncio
async def test_share_idor_prevention(sharing_test_setup):
    """Tests that unauthorized users cannot share files they do not own or manage."""
    user1 = sharing_test_setup["user1"]
    user2 = sharing_test_setup["user2"]
    file1 = sharing_test_setup["standalone_file"]
    token2 = create_access_token(user2.id)

    async with AsyncClient(
        transport=ASGITransport(app=app_instance), base_url="http://testserver"
    ) as ac:
        resp = await ac.post(
            f"/api/v1/files/{file1.id}/shares",
            json={"grantee_email": user1.email, "permission": "VIEWER"},
            headers={"Authorization": f"Bearer {token2}"},
        )
        assert resp.status_code == 403
