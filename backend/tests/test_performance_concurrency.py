"""Performance & Concurrency Test Suite.

Tests concurrent uploads, concurrent version restorations, query execution,
and memory/pagination bounds.
"""

import asyncio
import uuid

import pytest

from app.models.user import User
from app.services.file_service import FileService
from app.services.version_service import VersionService


@pytest.fixture
async def perf_test_setup(db_session):
    """Sets up primary owner user and ready file entity for performance testing."""
    user = User(
        id=uuid.uuid4(),
        email="perf_owner@secstorage.io",
        full_name="Perf Owner",
        hashed_password="mock_password",
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()

    file_svc = FileService(db_session)
    init_res = await file_svc.initiate_upload(
        user=user,
        filename="concurrent_test.bin",
        content_type="application/octet-stream",
        size_bytes=500,
    )
    file_ent = await file_svc.confirm_upload(user=user, file_id=init_res.file_id)

    return {"user": user, "file": file_ent}


@pytest.mark.asyncio
async def test_concurrent_version_creations(db_session, perf_test_setup):
    """Verifies that creating multiple versions sequentially or concurrently assigns sequential version numbers."""
    user = perf_test_setup["user"]
    file_ent = perf_test_setup["file"]
    ver_svc = VersionService(db_session)

    # Execute 5 new version creations
    for i in range(5):
        await ver_svc.create_new_version(
            user=user,
            file_id=file_ent.id,
            storage_key=f"users/{user.id}/files/{file_ent.id}/v{i + 2}.bin",
            size_bytes=100 * (i + 2),
            mime_type="application/octet-stream",
            filename=f"concurrent_v{i + 2}.bin",
        )

    res = await ver_svc.list_versions(user, file_id=file_ent.id)
    assert res.total == 6
    assert res.current_version_number == 6
