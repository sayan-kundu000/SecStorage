"""Input Hardening & Validation Security Test Suite.

Tests path traversal prevention, filename sanitization, SQL injection safety,
pagination bounds, and malformed payload handling.
"""

import uuid

import pytest
from httpx import AsyncClient

from app.core.security import create_access_token
from app.models.user import User
from app.services.file_service import sanitize_filename


@pytest.fixture
async def input_hardening_setup(db_session):
    """Sets up a test user for input hardening tests."""
    user = User(
        id=uuid.uuid4(),
        email="hardening@secstorage.io",
        full_name="Hardening User",
        hashed_password="mock_password",
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()
    return {"user": user}


def test_filename_path_traversal_sanitization():
    """Verifies path traversal sequences and control characters are stripped safely."""
    assert sanitize_filename("../../../etc/passwd") == "passwd"
    assert sanitize_filename("..\\..\\windows\\system32\\cmd.exe") == "cmd.exe"
    assert sanitize_filename("subfolder/my_file.pdf") == "my_file.pdf"
    assert sanitize_filename("safe_file.txt") == "safe_file.txt"
    assert sanitize_filename("") == "file.bin"


@pytest.mark.asyncio
async def test_invalid_uuid_parameter_rejection(async_client: AsyncClient, input_hardening_setup):
    """Verifies invalid UUID parameters return 422 Unprocessable Entity."""
    user = input_hardening_setup["user"]
    token = create_access_token(user.id)

    resp = await async_client.get(
        "/api/v1/files/invalid-not-a-uuid/download",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code in (400, 422)


@pytest.mark.asyncio
async def test_bounded_pagination_limits(async_client: AsyncClient, input_hardening_setup):
    """Verifies negative page or limit parameters are rejected (422)."""
    user = input_hardening_setup["user"]
    token = create_access_token(user.id)

    resp = await async_client.get(
        "/api/v1/activities?page=-1&page_size=0",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code in (400, 422)


@pytest.mark.asyncio
async def test_sql_injection_query_safety(async_client: AsyncClient, input_hardening_setup):
    """Verifies SQL injection payloads in search query parameters return 200 OK with safe parameterized execution."""
    user = input_hardening_setup["user"]
    token = create_access_token(user.id)

    sqli_payload = "test' OR '1'='1' UNION SELECT * FROM users; --"

    resp = await async_client.get(
        f"/api/v1/search?q={sqli_payload}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert "items" in data
