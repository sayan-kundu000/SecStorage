"""Integration Test Suite for Activity & Security Audit Engine."""

import uuid
import pytest
from httpx import ASGITransport, AsyncClient

from app.core.security import create_access_token
from app.models.user import User
from app.services.activity_service import ActivityService
from tests.conftest import app_instance


@pytest.fixture
async def activity_test_setup(db_session):
    """Sets up standard user and admin user for activity/audit testing."""
    user = User(
        id=uuid.uuid4(),
        email="act_user@secstorage.io",
        full_name="Activity User",
        hashed_password="mock_password",
        is_admin=False,
        is_active=True,
    )
    admin = User(
        id=uuid.uuid4(),
        email="act_admin@secstorage.io",
        full_name="Activity Admin",
        hashed_password="mock_password",
        is_admin=True,
        is_active=True,
    )
    db_session.add_all([user, admin])
    await db_session.commit()

    act_svc = ActivityService(db_session)
    res_id = uuid.uuid4()
    await act_svc.log_activity(
        user_id=user.id,
        action="FILE_UPLOADED",
        resource_type="FILE",
        resource_id=res_id,
        metadata={"filename": "test.txt"},
    )
    await db_session.commit()

    return {"user": user, "admin": admin, "resource_id": res_id}


@pytest.mark.asyncio
async def test_user_activity_feed_retrieval(activity_test_setup):
    """Tests retrieving current user activity timeline via API."""
    user = activity_test_setup["user"]
    token = create_access_token(user.id)

    async with AsyncClient(
        transport=ASGITransport(app=app_instance), base_url="http://testserver"
    ) as ac:
        resp = await ac.get(
            "/api/v1/activities",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert data["total"] >= 1
        assert data["items"][0]["action"] == "FILE_UPLOADED"


@pytest.mark.asyncio
async def test_audit_log_access_control(activity_test_setup):
    """Tests that standard users are rejected (403) and admins allowed (200) on GET /api/v1/audit."""
    user = activity_test_setup["user"]
    admin = activity_test_setup["admin"]

    user_token = create_access_token(user.id)
    admin_token = create_access_token(admin.id)

    async with AsyncClient(
        transport=ASGITransport(app=app_instance), base_url="http://testserver"
    ) as ac:
        # Standard user attempt -> 403 Forbidden
        u_resp = await ac.get(
            "/api/v1/audit",
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert u_resp.status_code == 403

        # Admin attempt -> 200 OK
        a_resp = await ac.get(
            "/api/v1/audit",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert a_resp.status_code == 200
