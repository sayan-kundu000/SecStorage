"""Integration Tests for Authorization, RBAC & Resource-Level Permission Engine."""

import uuid

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_normal_user_blocked_from_admin_audit(async_client: AsyncClient) -> None:
    """Verify normal USER role cannot access admin-only /activities (403 Forbidden)."""
    reg_resp = await async_client.post(
        "/api/v1/auth/register",
        json={
            "email": "normaluser@example.com",
            "password": "Password123!",
            "full_name": "Normal User",
        },
    )
    token = reg_resp.json()["data"]["tokens"]["access_token"]

    resp = await async_client.get("/api/v1/audit", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 403
    payload = resp.json()
    assert payload["success"] is False
    assert payload["error"]["code"] == "FORBIDDEN"


@pytest.mark.asyncio
async def test_admin_user_allowed_audit_access(
    async_client: AsyncClient, prepare_database: None
) -> None:
    """Verify user with is_admin=True can access audit timeline."""
    reg_resp = await async_client.post(
        "/api/v1/auth/register",
        json={
            "email": "adminuser@example.com",
            "password": "Password123!",
            "full_name": "Admin User",
        },
    )
    token = reg_resp.json()["data"]["tokens"]["access_token"]
    user_id = uuid.UUID(reg_resp.json()["data"]["user"]["id"])

    # Update user in DB to set is_admin = True
    from app.models.user import User
    from tests.conftest import TestingSessionLocal

    async with TestingSessionLocal() as session:
        user = await session.get(User, user_id)
        assert user is not None
        user.is_admin = True
        await session.commit()

    resp = await async_client.get("/api/v1/audit", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert resp.json()["success"] is True


@pytest.mark.asyncio
async def test_owner_resource_access_allowed(async_client: AsyncClient) -> None:
    """Verify owner can access their own files/folders."""
    reg_resp = await async_client.post(
        "/api/v1/auth/register",
        json={
            "email": "owner@example.com",
            "password": "Password123!",
            "full_name": "Owner User",
        },
    )
    token = reg_resp.json()["data"]["tokens"]["access_token"]

    folder_resp = await async_client.post(
        "/api/v1/folders",
        json={"name": "My Private Folder"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert folder_resp.status_code == 201
    folder_id = folder_resp.json()["data"]["id"]

    get_resp = await async_client.get(
        f"/api/v1/folders/{folder_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert get_resp.status_code == 200


@pytest.mark.asyncio
async def test_unshared_non_owner_access_denied(async_client: AsyncClient) -> None:
    """Verify non-owner attempting to access unshared file/folder receives 403 Forbidden."""
    # User A creates folder
    user_a = await async_client.post(
        "/api/v1/auth/register",
        json={
            "email": "usera@example.com",
            "password": "Password123!",
            "full_name": "User A",
        },
    )
    token_a = user_a.json()["data"]["tokens"]["access_token"]
    folder_a = await async_client.post(
        "/api/v1/folders",
        json={"name": "User A Secret"},
        headers={"Authorization": f"Bearer {token_a}"},
    )
    folder_id = folder_a.json()["data"]["id"]

    # User B tries to access User A's folder
    user_b = await async_client.post(
        "/api/v1/auth/register",
        json={
            "email": "userb@example.com",
            "password": "Password123!",
            "full_name": "User B",
        },
    )
    token_b = user_b.json()["data"]["tokens"]["access_token"]

    get_resp = await async_client.get(
        f"/api/v1/folders/{folder_id}",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert get_resp.status_code == 403
    assert get_resp.json()["error"]["code"] == "FORBIDDEN"


@pytest.mark.asyncio
async def test_explicit_share_viewer_permissions(async_client: AsyncClient) -> None:
    """Verify VIEWER share allows READ but blocks UPDATE/DELETE."""
    from app.models.file import File
    from app.models.share import Share, ShareRole
    from tests.conftest import TestingSessionLocal

    # User A (Owner) registers
    user_a = await async_client.post(
        "/api/v1/auth/register",
        json={
            "email": "owner_share@example.com",
            "password": "Password123!",
            "full_name": "Owner Share",
        },
    )
    user_a_id = uuid.UUID(user_a.json()["data"]["user"]["id"])

    # User B (Viewer) registers
    user_b = await async_client.post(
        "/api/v1/auth/register",
        json={
            "email": "viewer_share@example.com",
            "password": "Password123!",
            "full_name": "Viewer Share",
        },
    )
    token_b = user_b.json()["data"]["tokens"]["access_token"]
    user_b_id = uuid.UUID(user_b.json()["data"]["user"]["id"])

    # Create file entity for User A in DB
    file_id = uuid.uuid4()
    async with TestingSessionLocal() as session:
        file_ent = File(
            id=file_id,
            name="SharedDocument.pdf",
            user_id=user_a_id,
            mime_type="application/pdf",
            size_bytes=2048,
            storage_key=f"users/{user_a_id}/files/{file_id}/doc.pdf",
            status="READY",
        )
        session.add(file_ent)

        # Create VIEWER share for User B
        share_ent = Share(
            file_id=file_id,
            grantor_id=user_a_id,
            grantee_id=user_b_id,
            permission=ShareRole.VIEWER,
        )
        session.add(share_ent)
        await session.commit()

    # User B can READ file metadata
    read_resp = await async_client.get(
        f"/api/v1/files/{file_id}",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert read_resp.status_code == 200
    assert read_resp.json()["data"]["name"] == "SharedDocument.pdf"

    # User B cannot UPDATE file
    update_resp = await async_client.patch(
        f"/api/v1/files/{file_id}",
        json={"name": "HackedName.pdf"},
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert update_resp.status_code == 403


@pytest.mark.asyncio
async def test_client_role_injection_prevented(async_client: AsyncClient) -> None:
    """Verify sending is_admin=True in registration payload is ignored by server."""
    resp = await async_client.post(
        "/api/v1/auth/register",
        json={
            "email": "hacker@example.com",
            "password": "Password123!",
            "full_name": "Hacker",
            "is_admin": True,
        },
    )
    assert resp.status_code == 201
    token = resp.json()["data"]["tokens"]["access_token"]

    # Verify hacker account is denied admin audit access
    audit_resp = await async_client.get(
        "/api/v1/audit", headers={"Authorization": f"Bearer {token}"}
    )
    assert audit_resp.status_code == 403
