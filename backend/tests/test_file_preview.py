"""Integration Test Suite for File Preview Engine."""

import uuid
import pytest
from httpx import ASGITransport, AsyncClient

from app.core.security import create_access_token
from app.models.file import File
from app.models.user import User
from app.services.file_service import FileService
from app.services.public_link_service import PublicLinkService
from tests.conftest import app_instance


@pytest.fixture
async def preview_test_setup(db_session):
    """Sets up user and sample files (image, text, pdf) for preview testing."""
    user1 = User(
        id=uuid.uuid4(),
        email="preview_owner@secstorage.io",
        full_name="Preview Owner",
        hashed_password="mock_password",
        is_active=True,
    )
    user2 = User(
        id=uuid.uuid4(),
        email="preview_other@secstorage.io",
        full_name="Preview Other",
        hashed_password="mock_password",
        is_active=True,
    )
    db_session.add_all([user1, user2])
    await db_session.commit()

    file_svc = FileService(db_session)

    # Image File
    img_init = await file_svc.initiate_upload(
        user=user1, filename="photo.png", content_type="image/png", size_bytes=500
    )
    img_file = await file_svc.confirm_upload(user=user1, file_id=img_init.file_id)

    # Text File
    txt_init = await file_svc.initiate_upload(
        user=user1, filename="notes.txt", content_type="text/plain", size_bytes=200
    )
    txt_file = await file_svc.confirm_upload(user=user1, file_id=txt_init.file_id)

    # Public Link for Image File
    pub_svc = PublicLinkService(db_session)
    pub_link = await pub_svc.create_public_link(creator=user1, file_id=img_file.id)

    return {
        "user1": user1,
        "user2": user2,
        "img_file": img_file,
        "txt_file": txt_file,
        "pub_token": pub_link.token,
    }


@pytest.mark.asyncio
async def test_image_preview(preview_test_setup):
    """Verifies image file preview returns preview_type="IMAGE" and signed URL."""
    user1 = preview_test_setup["user1"]
    img_file = preview_test_setup["img_file"]
    token1 = create_access_token(user1.id)

    async with AsyncClient(
        transport=ASGITransport(app=app_instance), base_url="http://testserver"
    ) as ac:
        resp = await ac.get(
            f"/api/v1/files/{img_file.id}/preview",
            headers={"Authorization": f"Bearer {token1}"},
        )
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert data["preview_type"] == "IMAGE"
        assert data["preview_url"] is not None


@pytest.mark.asyncio
async def test_text_preview(preview_test_setup):
    """Verifies text file preview returns preview_type="TEXT" and text_content."""
    user1 = preview_test_setup["user1"]
    txt_file = preview_test_setup["txt_file"]
    token1 = create_access_token(user1.id)

    async with AsyncClient(
        transport=ASGITransport(app=app_instance), base_url="http://testserver"
    ) as ac:
        resp = await ac.get(
            f"/api/v1/files/{txt_file.id}/preview",
            headers={"Authorization": f"Bearer {token1}"},
        )
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert data["preview_type"] == "TEXT"
        assert data["text_content"] is not None


@pytest.mark.asyncio
async def test_public_link_preview(preview_test_setup):
    """Verifies public link preview endpoint returns valid image preview."""
    pub_token = preview_test_setup["pub_token"]

    async with AsyncClient(
        transport=ASGITransport(app=app_instance), base_url="http://testserver"
    ) as ac:
        resp = await ac.get(f"/api/v1/public-links/{pub_token}/preview")
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert data["preview_type"] == "IMAGE"


@pytest.mark.asyncio
async def test_preview_idor_protection(preview_test_setup):
    """Verifies unauthorized user cannot preview another user's private file."""
    user2 = preview_test_setup["user2"]
    img_file = preview_test_setup["img_file"]
    token2 = create_access_token(user2.id)

    async with AsyncClient(
        transport=ASGITransport(app=app_instance), base_url="http://testserver"
    ) as ac:
        resp = await ac.get(
            f"/api/v1/files/{img_file.id}/preview",
            headers={"Authorization": f"Bearer {token2}"},
        )
        assert resp.status_code == 403
