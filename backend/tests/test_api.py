"""Integration & Schema Validation Tests for SecStorage REST API."""

import uuid

import pytest
from httpx import AsyncClient


async def get_authed_headers(
    async_client: AsyncClient, email: str = "api_user@example.com"
) -> dict[str, str]:
    """Helper creating registered user and returning Authorization Bearer header."""
    reg_resp = await async_client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": "Password123!",
            "full_name": "API Test User",
        },
    )
    token = reg_resp.json()["data"]["tokens"]["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_openapi_json_generation(async_client: AsyncClient) -> None:
    """Verify GET /openapi.json produces valid OpenAPI 3.0 specification."""
    response = await async_client.get("/openapi.json")
    assert response.status_code == 200
    schema = response.json()
    assert schema["openapi"].startswith("3.")
    assert schema["info"]["title"] == "SecStorage API"
    assert "paths" in schema
    assert "/api/v1/health" in schema["paths"]
    assert "/api/v1/folders" in schema["paths"]


@pytest.mark.asyncio
async def test_health_and_ready_api_v1(async_client: AsyncClient) -> None:
    """Verify versioned health and readiness endpoints."""
    health_resp = await async_client.get("/api/v1/health")
    assert health_resp.status_code == 200
    assert health_resp.json()["success"] is True

    ready_resp = await async_client.get("/api/v1/ready")
    assert ready_resp.status_code == 200
    assert ready_resp.json()["success"] is True


@pytest.mark.asyncio
async def test_users_me_endpoint_contract(async_client: AsyncClient) -> None:
    """Verify GET /api/v1/users/me authenticated response contract."""
    headers = await get_authed_headers(async_client, "apime@example.com")
    response = await async_client.get("/api/v1/users/me", headers=headers)
    assert response.status_code == 200
    payload = response.json()
    assert payload["success"] is True
    assert payload["data"]["email"] == "apime@example.com"


@pytest.mark.asyncio
async def test_folder_validation_error(async_client: AsyncClient) -> None:
    """Verify Pydantic validation rejects empty folder name with 400 Bad Request."""
    headers = await get_authed_headers(async_client, "folder_val@example.com")
    response = await async_client.post("/api/v1/folders", json={"name": ""}, headers=headers)
    assert response.status_code == 400
    payload = response.json()
    assert payload["success"] is False
    assert payload["error"]["code"] == "VALIDATION_ERROR"
    assert len(payload["error"]["details"]) > 0


@pytest.mark.asyncio
async def test_folder_crud_contracts(async_client: AsyncClient) -> None:
    """Verify folder API route contracts."""
    headers = await get_authed_headers(async_client, "folder_crud@example.com")
    folder_id = uuid.uuid4()

    create_resp = await async_client.post(
        "/api/v1/folders", json={"name": "Documents"}, headers=headers
    )
    assert create_resp.status_code == 201

    get_resp = await async_client.get(f"/api/v1/folders/{folder_id}", headers=headers)
    assert get_resp.status_code == 200

    del_resp = await async_client.delete(f"/api/v1/folders/{folder_id}", headers=headers)
    assert del_resp.status_code == 204


@pytest.mark.asyncio
async def test_file_crud_contracts(async_client: AsyncClient) -> None:
    """Verify file API route contracts."""
    headers = await get_authed_headers(async_client, "file_crud@example.com")
    file_id = uuid.uuid4()

    get_resp = await async_client.get(f"/api/v1/files/{file_id}", headers=headers)
    assert get_resp.status_code == 200

    del_resp = await async_client.delete(f"/api/v1/files/{file_id}", headers=headers)
    assert del_resp.status_code == 204


@pytest.mark.asyncio
async def test_shares_and_public_links_contracts(async_client: AsyncClient) -> None:
    """Verify shares and public links route contracts."""
    headers = await get_authed_headers(async_client, "shares_test@example.com")
    shares_resp = await async_client.get("/api/v1/shares", headers=headers)
    assert shares_resp.status_code == 200

    folder_resp = await async_client.post(
        "/api/v1/folders", json={"name": "Public Shared Folder"}, headers=headers
    )
    folder_id = folder_resp.json()["data"]["id"]

    link_resp = await async_client.post(
        "/api/v1/public-links", json={"folder_id": folder_id}, headers=headers
    )
    assert link_resp.status_code == 201


@pytest.mark.asyncio
async def test_trash_and_activities_contracts(async_client: AsyncClient) -> None:
    """Verify trash listing and activities route contracts."""
    headers = await get_authed_headers(async_client, "trash_test@example.com")
    trash_resp = await async_client.get("/api/v1/trash", headers=headers)
    assert trash_resp.status_code == 200
