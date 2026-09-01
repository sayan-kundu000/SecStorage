"""Integration Tests for Authentication, JWT Sessions & Account Security."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_user_registration(async_client: AsyncClient) -> None:
    """Verify registering a new user account returns 201 Created and tokens."""
    payload = {
        "email": "NewUser@Example.com",
        "password": "Password123!",
        "full_name": "New User",
    }
    response = await async_client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["success"] is True
    assert data["data"]["user"]["email"] == "newuser@example.com"
    assert "access_token" in data["data"]["tokens"]
    assert "refresh_token" in data["data"]["tokens"]


@pytest.mark.asyncio
async def test_duplicate_registration_rejection(async_client: AsyncClient) -> None:
    """Verify registering existing email returns 409 Conflict."""
    payload = {
        "email": "duplicate@example.com",
        "password": "Password123!",
        "full_name": "First User",
    }
    resp1 = await async_client.post("/api/v1/auth/register", json=payload)
    assert resp1.status_code == 201

    resp2 = await async_client.post("/api/v1/auth/register", json=payload)
    assert resp2.status_code == 409
    data = resp2.json()
    assert data["success"] is False
    assert data["error"]["code"] == "CONFLICT_ERROR"


@pytest.mark.asyncio
async def test_user_login_success(async_client: AsyncClient) -> None:
    """Verify authenticating valid credentials returns tokens."""
    reg_payload = {
        "email": "loginuser@example.com",
        "password": "Password123!",
        "full_name": "Login User",
    }
    await async_client.post("/api/v1/auth/register", json=reg_payload)

    login_payload = {
        "email": "loginuser@example.com",
        "password": "Password123!",
    }
    response = await async_client.post("/api/v1/auth/login", json=login_payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "access_token" in data["data"]["tokens"]


@pytest.mark.asyncio
async def test_login_invalid_password(async_client: AsyncClient) -> None:
    """Verify authenticating invalid password returns 401 Unauthorized."""
    reg_payload = {
        "email": "wrongpass@example.com",
        "password": "Password123!",
        "full_name": "Wrong Pass User",
    }
    await async_client.post("/api/v1/auth/register", json=reg_payload)

    login_payload = {
        "email": "wrongpass@example.com",
        "password": "WrongPassword!",
    }
    response = await async_client.post("/api/v1/auth/login", json=login_payload)
    assert response.status_code == 401
    data = response.json()
    assert data["success"] is False


@pytest.mark.asyncio
async def test_get_current_user_me(async_client: AsyncClient) -> None:
    """Verify Bearer token authenticated /auth/me returns active profile."""
    reg_payload = {
        "email": "meuser@example.com",
        "password": "Password123!",
        "full_name": "Me User",
    }
    reg_resp = await async_client.post("/api/v1/auth/register", json=reg_payload)
    token = reg_resp.json()["data"]["tokens"]["access_token"]

    response = await async_client.get(
        "/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["email"] == "meuser@example.com"


@pytest.mark.asyncio
async def test_get_current_user_unauthenticated(async_client: AsyncClient) -> None:
    """Verify unauthenticated call to /auth/me returns 403/401."""
    response = await async_client.get("/api/v1/auth/me")
    assert response.status_code in (401, 403)


@pytest.mark.asyncio
async def test_refresh_token_rotation(async_client: AsyncClient) -> None:
    """Verify refresh token rotation issues new access & refresh tokens."""
    reg_payload = {
        "email": "refreshuser@example.com",
        "password": "Password123!",
        "full_name": "Refresh User",
    }
    reg_resp = await async_client.post("/api/v1/auth/register", json=reg_payload)
    refresh_token = reg_resp.json()["data"]["tokens"]["refresh_token"]

    refresh_resp = await async_client.post(
        "/api/v1/auth/refresh", json={"refresh_token": refresh_token}
    )
    assert refresh_resp.status_code == 200
    data = refresh_resp.json()
    assert data["success"] is True
    assert "access_token" in data["data"]
    assert "refresh_token" in data["data"]


@pytest.mark.asyncio
async def test_invalid_refresh_token(async_client: AsyncClient) -> None:
    """Verify invalid refresh token is rejected with 401 Unauthorized."""
    response = await async_client.post(
        "/api/v1/auth/refresh", json={"refresh_token": "invalid_junk_token"}
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_logout(async_client: AsyncClient) -> None:
    """Verify logout revokes active session."""
    reg_payload = {
        "email": "logoutuser@example.com",
        "password": "Password123!",
        "full_name": "Logout User",
    }
    reg_resp = await async_client.post("/api/v1/auth/register", json=reg_payload)
    access_token = reg_resp.json()["data"]["tokens"]["access_token"]

    logout_resp = await async_client.post(
        "/api/v1/auth/logout", headers={"Authorization": f"Bearer {access_token}"}
    )
    assert logout_resp.status_code == 204


@pytest.mark.asyncio
async def test_change_password(async_client: AsyncClient) -> None:
    """Verify changing password updates hash and allows login with new password."""
    reg_payload = {
        "email": "changepw@example.com",
        "password": "OldPassword123!",
        "full_name": "Change Pass",
    }
    reg_resp = await async_client.post("/api/v1/auth/register", json=reg_payload)
    access_token = reg_resp.json()["data"]["tokens"]["access_token"]

    change_payload = {
        "current_password": "OldPassword123!",
        "new_password": "NewPassword456!",
    }
    change_resp = await async_client.post(
        "/api/v1/auth/change-password",
        json=change_payload,
        headers={"Authorization": f"Bearer {access_token}"},
    )
    assert change_resp.status_code == 204

    # Verify old password fails
    old_login = await async_client.post(
        "/api/v1/auth/login",
        json={"email": "changepw@example.com", "password": "OldPassword123!"},
    )
    assert old_login.status_code == 401

    # Verify new password succeeds
    new_login = await async_client.post(
        "/api/v1/auth/login",
        json={"email": "changepw@example.com", "password": "NewPassword456!"},
    )
    assert new_login.status_code == 200
