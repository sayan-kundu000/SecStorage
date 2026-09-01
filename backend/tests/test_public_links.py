"""Integration & Unit Tests for Public Share Link Engine."""

import uuid

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.security import create_access_token
from app.models.file import File
from app.models.folder import Folder
from app.models.user import User
from tests.conftest import app_instance


@pytest.fixture
async def public_link_test_setup(db_session):
    """Fixture initializing user, folder, and files for public link tests."""
    user = User(
        id=uuid.uuid4(),
        email="publicowner@secstorage.io",
        hashed_password="hashed_pwd_123",
        full_name="Public Link Owner",
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()

    folder = Folder(
        id=uuid.uuid4(),
        name="Public Folder",
        user_id=user.id,
    )
    file1 = File(
        id=uuid.uuid4(),
        user_id=user.id,
        folder_id=folder.id,
        name="Public Document.pdf",
        mime_type="application/pdf",
        size_bytes=3072,
        storage_key=f"users/{user.id}/files/pubdoc.pdf",
        status="READY",
    )
    db_session.add_all([folder, file1])
    await db_session.commit()

    return {"user": user, "folder": folder, "file1": file1}


@pytest.mark.asyncio
async def test_create_and_access_public_link(public_link_test_setup):
    """Tests creating a public share link, accessing metadata, and generating public download URL."""
    user = public_link_test_setup["user"]
    file1 = public_link_test_setup["file1"]
    token_auth = create_access_token(user.id)

    async with AsyncClient(
        transport=ASGITransport(app=app_instance), base_url="http://testserver"
    ) as ac:
        # 1. Owner generates public share link
        create_resp = await ac.post(
            f"/api/v1/files/{file1.id}/public-links",
            json={"allow_download": True, "permission": "VIEWER"},
            headers={"Authorization": f"Bearer {token_auth}"},
        )
        assert create_resp.status_code == 201
        data = create_resp.json()["data"]
        raw_token = data["token"]
        assert raw_token is not None
        assert data["allow_download"] is True

        # 2. Anonymous visitor resolves public link metadata
        access_resp = await ac.get(f"/api/v1/public-links/{raw_token}")
        assert access_resp.status_code == 200
        meta = access_resp.json()["data"]
        assert meta["name"] == "Public Document.pdf"
        assert meta["size_bytes"] == 3072
        assert meta["requires_password"] is False
        assert "download_url" in meta

        # 3. Anonymous visitor generates signed download URL
        dl_resp = await ac.get(f"/api/v1/public-links/{raw_token}/download")
        assert dl_resp.status_code == 200
        assert "download_url" in dl_resp.json()["data"]


@pytest.mark.asyncio
async def test_public_link_password_protection(public_link_test_setup):
    """Tests optional password protection on public share links."""
    user = public_link_test_setup["user"]
    file1 = public_link_test_setup["file1"]
    token_auth = create_access_token(user.id)

    async with AsyncClient(
        transport=ASGITransport(app=app_instance), base_url="http://testserver"
    ) as ac:
        # Create password-protected public link
        create_resp = await ac.post(
            f"/api/v1/files/{file1.id}/public-links",
            json={"password": "SuperSecretPassword123!", "allow_download": True},
            headers={"Authorization": f"Bearer {token_auth}"},
        )
        assert create_resp.status_code == 201
        raw_token = create_resp.json()["data"]["token"]

        # Access without password shows password challenge requirement
        meta_resp = await ac.get(f"/api/v1/public-links/{raw_token}")
        assert meta_resp.status_code == 200
        assert meta_resp.json()["data"]["requires_password"] is True
        assert meta_resp.json()["data"]["download_url"] is None

        # Verify with wrong password returns 403 Forbidden
        wrong_resp = await ac.post(
            f"/api/v1/public-links/{raw_token}/verify",
            json={"password": "WrongPassword!"},
        )
        assert wrong_resp.status_code == 403

        # Verify with correct password unlocks metadata
        correct_resp = await ac.post(
            f"/api/v1/public-links/{raw_token}/verify",
            json={"password": "SuperSecretPassword123!"},
        )
        assert correct_resp.status_code == 200
        assert correct_resp.json()["data"]["requires_password"] is False
        assert correct_resp.json()["data"]["name"] == "Public Document.pdf"


@pytest.mark.asyncio
async def test_public_link_download_restriction(public_link_test_setup):
    """Tests that allow_download=False restricts binary download URL generation."""
    user = public_link_test_setup["user"]
    file1 = public_link_test_setup["file1"]
    token_auth = create_access_token(user.id)

    async with AsyncClient(
        transport=ASGITransport(app=app_instance), base_url="http://testserver"
    ) as ac:
        create_resp = await ac.post(
            f"/api/v1/files/{file1.id}/public-links",
            json={"allow_download": False},
            headers={"Authorization": f"Bearer {token_auth}"},
        )
        assert create_resp.status_code == 201
        raw_token = create_resp.json()["data"]["token"]

        dl_resp = await ac.get(f"/api/v1/public-links/{raw_token}/download")
        assert dl_resp.status_code == 403


@pytest.mark.asyncio
async def test_public_link_revocation(public_link_test_setup):
    """Tests revoking a public link immediately invalidates access."""
    user = public_link_test_setup["user"]
    file1 = public_link_test_setup["file1"]
    token_auth = create_access_token(user.id)

    async with AsyncClient(
        transport=ASGITransport(app=app_instance), base_url="http://testserver"
    ) as ac:
        create_resp = await ac.post(
            f"/api/v1/files/{file1.id}/public-links",
            json={"allow_download": True},
            headers={"Authorization": f"Bearer {token_auth}"},
        )
        data = create_resp.json()["data"]
        link_id = data["id"]
        raw_token = data["token"]

        # Revoke public link
        revoke_resp = await ac.delete(
            f"/api/v1/public-links/{link_id}",
            headers={"Authorization": f"Bearer {token_auth}"},
        )
        assert revoke_resp.status_code == 204

        # Access attempt returns 404 Not Found
        access_resp = await ac.get(f"/api/v1/public-links/{raw_token}")
        assert access_resp.status_code == 404
