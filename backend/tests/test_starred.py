"""Integration & Unit Tests for Starred Favorites Engine."""

import uuid

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.security import create_access_token
from tests.conftest import app_instance
from app.models.file import File
from app.models.folder import Folder
from app.models.user import User


@pytest.fixture
async def star_test_setup(db_session):
    """Fixture initializing user, folders, and files for starring tests."""
    user1 = User(
        id=uuid.uuid4(),
        email="staruser1@secstorage.io",
        hashed_password="hashed_pwd_123",
        full_name="Star User 1",
        is_active=True,
    )
    user2 = User(
        id=uuid.uuid4(),
        email="staruser2@secstorage.io",
        hashed_password="hashed_pwd_123",
        full_name="Star User 2",
        is_active=True,
    )
    db_session.add_all([user1, user2])
    await db_session.commit()

    folder1 = Folder(
        id=uuid.uuid4(),
        name="Star Folder",
        user_id=user1.id,
    )
    file1 = File(
        id=uuid.uuid4(),
        user_id=user1.id,
        folder_id=folder1.id,
        name="Favorite Document.pdf",
        mime_type="application/pdf",
        size_bytes=2048,
        storage_key=f"users/{user1.id}/files/fav.pdf",
        status="READY",
    )
    db_session.add_all([folder1, file1])
    await db_session.commit()

    return {"user1": user1, "user2": user2, "folder1": folder1, "file1": file1}


@pytest.mark.asyncio
async def test_star_and_unstar_file(star_test_setup):
    """Tests starring a file as favorite and unstarring it."""
    user1 = star_test_setup["user1"]
    file1 = star_test_setup["file1"]
    token = create_access_token(user1.id)

    async with AsyncClient(
        transport=ASGITransport(app=app_instance), base_url="http://testserver"
    ) as ac:
        # 1. Star File
        resp = await ac.post(
            f"/api/v1/files/{file1.id}/star",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 201
        data = resp.json()["data"]
        assert data["resource_id"] == str(file1.id)
        assert data["resource_type"] == "file"
        assert data["starred"] is True

        # 2. Verify in /starred list
        list_resp = await ac.get(
            "/api/v1/starred",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert list_resp.status_code == 200
        items = list_resp.json()["data"]["items"]
        assert len(items) == 1
        assert items[0]["name"] == "Favorite Document.pdf"

        # 3. Unstar File
        del_resp = await ac.delete(
            f"/api/v1/files/{file1.id}/star",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert del_resp.status_code == 204

        # 4. Verify unstarred list is empty
        list_resp_2 = await ac.get(
            "/api/v1/starred",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert len(list_resp_2.json()["data"]["items"]) == 0


@pytest.mark.asyncio
async def test_star_and_unstar_folder(star_test_setup):
    """Tests starring a folder as favorite and unstarring it."""
    user1 = star_test_setup["user1"]
    folder1 = star_test_setup["folder1"]
    token = create_access_token(user1.id)

    async with AsyncClient(
        transport=ASGITransport(app=app_instance), base_url="http://testserver"
    ) as ac:
        # Star Folder
        resp = await ac.post(
            f"/api/v1/folders/{folder1.id}/star",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 201
        assert resp.json()["data"]["resource_type"] == "folder"

        # Unstar Folder
        del_resp = await ac.delete(
            f"/api/v1/folders/{folder1.id}/star",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert del_resp.status_code == 204


@pytest.mark.asyncio
async def test_star_user_isolation(star_test_setup):
    """Tests that starring a resource is strictly user-isolated."""
    user1 = star_test_setup["user1"]
    user2 = star_test_setup["user2"]
    file1 = star_test_setup["file1"]

    token1 = create_access_token(user1.id)
    token2 = create_access_token(user2.id)

    async with AsyncClient(
        transport=ASGITransport(app=app_instance), base_url="http://testserver"
    ) as ac:
        # User 1 stars file
        await ac.post(
            f"/api/v1/files/{file1.id}/star",
            headers={"Authorization": f"Bearer {token1}"},
        )

        # User 2 listing should be empty
        resp2 = await ac.get(
            "/api/v1/starred",
            headers={"Authorization": f"Bearer {token2}"},
        )
        assert len(resp2.json()["data"]["items"]) == 0


@pytest.mark.asyncio
async def test_star_idempotency(star_test_setup):
    """Tests that starring an already starred resource is idempotent."""
    user1 = star_test_setup["user1"]
    file1 = star_test_setup["file1"]
    token = create_access_token(user1.id)

    async with AsyncClient(
        transport=ASGITransport(app=app_instance), base_url="http://testserver"
    ) as ac:
        resp1 = await ac.post(
            f"/api/v1/files/{file1.id}/star",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp1.status_code == 201

        resp2 = await ac.post(
            f"/api/v1/files/{file1.id}/star",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp2.status_code in (200, 201)
        assert resp2.json()["data"]["starred"] is True
