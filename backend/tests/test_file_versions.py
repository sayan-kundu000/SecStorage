"""Integration Test Suite for File Versioning Engine."""

import uuid
import pytest
from httpx import ASGITransport, AsyncClient

from app.core.security import create_access_token
from app.models.file import File
from app.models.user import User
from app.services.file_service import FileService
from app.services.version_service import VersionService
from tests.conftest import app_instance


@pytest.fixture
async def version_test_setup(db_session):
    """Sets up primary owner user, unauthorized user, and ready file entity for version testing."""
    user1 = User(
        id=uuid.uuid4(),
        email="version_owner@secstorage.io",
        full_name="Version Owner",
        hashed_password="mock_hashed_password",
        is_active=True,
    )
    user2 = User(
        id=uuid.uuid4(),
        email="version_other@secstorage.io",
        full_name="Version Other",
        hashed_password="mock_hashed_password",
        is_active=True,
    )
    db_session.add_all([user1, user2])
    await db_session.commit()

    file_svc = FileService(db_session)
    init_res = await file_svc.initiate_upload(
        user=user1,
        filename="report_v1.txt",
        content_type="text/plain",
        size_bytes=100,
    )
    file_ent = await file_svc.confirm_upload(user=user1, file_id=init_res.file_id)

    return {
        "user1": user1,
        "user2": user2,
        "file": file_ent,
    }


@pytest.mark.asyncio
async def test_initial_version_creation(db_session, version_test_setup):
    """Verifies confirming an upload automatically creates Version 1."""
    file_ent = version_test_setup["file"]
    user1 = version_test_setup["user1"]

    ver_svc = VersionService(db_session)
    res = await ver_svc.list_versions(user1, file_id=file_ent.id)

    assert res.total == 1
    assert len(res.versions) == 1
    assert res.versions[0].version_number == 1
    assert res.versions[0].is_current is True


@pytest.mark.asyncio
async def test_create_new_version_and_restore(db_session, version_test_setup):
    """Verifies creating Version 2 and restoring Version 1 creates Version 3."""
    file_ent = version_test_setup["file"]
    user1 = version_test_setup["user1"]
    token1 = create_access_token(user1.id)

    ver_svc = VersionService(db_session)

    # Create Version 2
    ver2 = await ver_svc.create_new_version(
        user=user1,
        file_id=file_ent.id,
        storage_key=f"users/{user1.id}/files/{file_ent.id}/v2.bin",
        size_bytes=200,
        mime_type="text/plain",
        filename="report_v2.txt",
    )
    assert ver2.version_number == 2

    # Query versions
    res = await ver_svc.list_versions(user1, file_id=file_ent.id)
    assert res.total == 2

    v1_dto = [v for v in res.versions if v.version_number == 1][0]

    # Restore Version 1 via API endpoint -> should create Version 3
    async with AsyncClient(
        transport=ASGITransport(app=app_instance), base_url="http://testserver"
    ) as ac:
        resp = await ac.post(
            f"/api/v1/files/{file_ent.id}/versions/{v1_dto.id}/restore",
            headers={"Authorization": f"Bearer {token1}"},
        )
        assert resp.status_code == 201
        data = resp.json()["data"]
        assert data["new_version"]["version_number"] == 3
        assert data["new_version"]["is_current"] is True


@pytest.mark.asyncio
async def test_version_idor_protection(version_test_setup):
    """Verifies unauthorized user cannot access file version history."""
    file_ent = version_test_setup["file"]
    user2 = version_test_setup["user2"]
    token2 = create_access_token(user2.id)

    async with AsyncClient(
        transport=ASGITransport(app=app_instance), base_url="http://testserver"
    ) as ac:
        resp = await ac.get(
            f"/api/v1/files/{file_ent.id}/versions",
            headers={"Authorization": f"Bearer {token2}"},
        )
        assert resp.status_code == 403
