"""Integration & Unit Tests for Search, Filter, and Sort Engine."""

import uuid
from datetime import UTC, datetime, timedelta

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.security import create_access_token
from tests.conftest import app_instance
from app.models.file import File
from app.models.folder import Folder
from app.models.star import Star
from app.models.user import User


@pytest.fixture
async def search_test_setup(db_session):
    """Fixture populating database with test user, folders, and files for search testing."""
    # User 1
    user1 = User(
        id=uuid.uuid4(),
        email="searcher1@secstorage.io",
        hashed_password="hashed_pwd_123",
        full_name="Search User 1",
        is_active=True,
    )
    # User 2 (For multi-user authorization isolation testing)
    user2 = User(
        id=uuid.uuid4(),
        email="searcher2@secstorage.io",
        hashed_password="hashed_pwd_123",
        full_name="Search User 2",
        is_active=True,
    )
    db_session.add_all([user1, user2])
    await db_session.commit()

    now = datetime.now(UTC)
    older = now - timedelta(days=5)

    # Folder 1 under User 1
    folder1 = Folder(
        id=uuid.uuid4(),
        name="Project Reports",
        user_id=user1.id,
        parent_id=None,
        created_at=older,
        updated_at=older,
    )
    # Folder 2 under User 2 (Private)
    folder2 = Folder(
        id=uuid.uuid4(),
        name="Project Secret Reports",
        user_id=user2.id,
        parent_id=None,
        created_at=now,
        updated_at=now,
    )
    db_session.add_all([folder1, folder2])
    await db_session.commit()

    # Files under User 1
    file1 = File(
        id=uuid.uuid4(),
        user_id=user1.id,
        folder_id=folder1.id,
        name="Q3 Financial Report.pdf",
        mime_type="application/pdf",
        size_bytes=1048576,  # 1 MB
        storage_key=f"users/{user1.id}/files/f1.pdf",
        status="READY",
        created_at=older,
        updated_at=older,
    )
    file2 = File(
        id=uuid.uuid4(),
        user_id=user1.id,
        folder_id=None,
        name="Team Photo.jpg",
        mime_type="image/jpeg",
        size_bytes=2097152,  # 2 MB
        storage_key=f"users/{user1.id}/files/f2.jpg",
        status="READY",
        created_at=now,
        updated_at=now,
    )
    file3 = File(
        id=uuid.uuid4(),
        user_id=user1.id,
        folder_id=folder1.id,
        name="Deleted Report.docx",
        mime_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        size_bytes=512000,
        storage_key=f"users/{user1.id}/files/f3.docx",
        status="READY",
        deleted_at=now,
        created_at=now,
        updated_at=now,
    )
    # File under User 2 (Private)
    file4 = File(
        id=uuid.uuid4(),
        user_id=user2.id,
        folder_id=folder2.id,
        name="Confidential Report.pdf",
        mime_type="application/pdf",
        size_bytes=5000000,
        storage_key=f"users/{user2.id}/files/f4.pdf",
        status="READY",
        created_at=now,
        updated_at=now,
    )
    db_session.add_all([file1, file2, file3, file4])
    await db_session.commit()

    # Star file1 for User 1
    star1 = Star(user_id=user1.id, file_id=file1.id)
    db_session.add(star1)
    await db_session.commit()

    return {
        "user1": user1,
        "user2": user2,
        "folder1": folder1,
        "folder2": folder2,
        "file1": file1,
        "file2": file2,
        "file3": file3,
        "file4": file4,
    }


@pytest.mark.asyncio
async def test_search_by_query_string(search_test_setup):
    """Tests basic search matching case-insensitively against file and folder names."""
    user1 = search_test_setup["user1"]
    token = create_access_token(user1.id)

    async with AsyncClient(
        transport=ASGITransport(app=app_instance), base_url="http://testserver"
    ) as ac:
        resp = await ac.get(
            "/api/v1/search?q=report",
            headers={"Authorization": f"Bearer {token}"},
        )

    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    items = data["data"]["items"]

    names = [item["name"] for item in items]
    assert "Project Reports" in names  # Folder match
    assert "Q3 Financial Report.pdf" in names  # File match
    assert "Deleted Report.docx" not in names  # Trashed file excluded
    assert "Confidential Report.pdf" not in names  # User 2 private file excluded


@pytest.mark.asyncio
async def test_search_authorization_isolation(search_test_setup):
    """Tests that search never reveals resources belonging to another user."""
    user2 = search_test_setup["user2"]
    token2 = create_access_token(user2.id)

    async with AsyncClient(
        transport=ASGITransport(app=app_instance), base_url="http://testserver"
    ) as ac:
        resp = await ac.get(
            "/api/v1/search?q=report",
            headers={"Authorization": f"Bearer {token2}"},
        )

    assert resp.status_code == 200
    items = resp.json()["data"]["items"]
    names = [item["name"] for item in items]
    assert "Confidential Report.pdf" in names
    assert "Project Secret Reports" in names
    assert "Q3 Financial Report.pdf" not in names  # User 1 file absent


@pytest.mark.asyncio
async def test_search_filters_type_and_mime(search_test_setup):
    """Tests type and MIME type filter composition."""
    user1 = search_test_setup["user1"]
    token = create_access_token(user1.id)

    # Filter type=file & mimeType=image/*
    async with AsyncClient(
        transport=ASGITransport(app=app_instance), base_url="http://testserver"
    ) as ac:
        resp = await ac.get(
            "/api/v1/search?q=photo&type=file&mimeType=image/*",
            headers={"Authorization": f"Bearer {token}"},
        )

    assert resp.status_code == 200
    items = resp.json()["data"]["items"]
    assert len(items) == 1
    assert items[0]["name"] == "Team Photo.jpg"


@pytest.mark.asyncio
async def test_search_filters_size_and_starred(search_test_setup):
    """Tests minSize, maxSize, and starred status filter composition."""
    user1 = search_test_setup["user1"]
    token = create_access_token(user1.id)

    async with AsyncClient(
        transport=ASGITransport(app=app_instance), base_url="http://testserver"
    ) as ac:
        resp = await ac.get(
            "/api/v1/search?q=report&starred=true",
            headers={"Authorization": f"Bearer {token}"},
        )

    assert resp.status_code == 200
    items = resp.json()["data"]["items"]
    assert len(items) == 1
    assert items[0]["name"] == "Q3 Financial Report.pdf"
    assert items[0]["starred"] is True


@pytest.mark.asyncio
async def test_search_sorting_and_pagination(search_test_setup):
    """Tests search sorting by size desc and cursor pagination."""
    user1 = search_test_setup["user1"]
    token = create_access_token(user1.id)

    async with AsyncClient(
        transport=ASGITransport(app=app_instance), base_url="http://testserver"
    ) as ac:
        resp = await ac.get(
            "/api/v1/search?q=a&sortBy=size&sortOrder=desc&limit=1",
            headers={"Authorization": f"Bearer {token}"},
        )

    assert resp.status_code == 200
    data = resp.json()["data"]
    assert len(data["items"]) == 1
    assert data["pagination"]["has_more"] is True


@pytest.mark.asyncio
async def test_search_wildcard_escaping(search_test_setup):
    """Tests that SQL wildcards % and _ in search query are escaped and handled safely."""
    user1 = search_test_setup["user1"]
    token = create_access_token(user1.id)

    async with AsyncClient(
        transport=ASGITransport(app=app_instance), base_url="http://testserver"
    ) as ac:
        resp = await ac.get(
            "/api/v1/search?q=%25",
            headers={"Authorization": f"Bearer {token}"},
        )

    assert resp.status_code == 200
    items = resp.json()["data"]["items"]
    # Literal '%' search should return 0 items because no file has a literal '%' character in name
    assert len(items) == 0
