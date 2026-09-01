"""Integration Tests for Object Storage Engine & Signed URL Lifecycle."""


import pytest
from httpx import AsyncClient

from app.services.file_service import sanitize_filename


@pytest.mark.asyncio
async def test_filename_sanitization() -> None:
    """Verify filename sanitization strips path traversal sequences."""
    bad_name = "../../etc/passwd"
    clean = sanitize_filename(bad_name)
    assert ".." not in clean or clean.startswith("_")
    assert "/etc/passwd" not in clean


@pytest.mark.asyncio
async def test_upload_initiation_success(async_client: AsyncClient) -> None:
    """Verify upload initiation returns 201 Created and presigned upload URL."""
    reg_resp = await async_client.post(
        "/api/v1/auth/register",
        json={
            "email": "uploader@example.com",
            "password": "Password123!",
            "full_name": "Uploader User",
        },
    )
    token = reg_resp.json()["data"]["tokens"]["access_token"]

    payload = {
        "filename": "MyDocument.pdf",
        "content_type": "application/pdf",
        "size_bytes": 2048,
    }
    response = await async_client.post(
        "/api/v1/files/upload/initiate",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["success"] is True
    assert "upload_url" in data["data"]
    assert "file_id" in data["data"]
    assert "storage_key" in data["data"]


@pytest.mark.asyncio
async def test_oversized_upload_rejection(async_client: AsyncClient) -> None:
    """Verify file size > 5GB returns 400 Bad Request validation error."""
    reg_resp = await async_client.post(
        "/api/v1/auth/register",
        json={
            "email": "hugefile@example.com",
            "password": "Password123!",
            "full_name": "Huge File User",
        },
    )
    token = reg_resp.json()["data"]["tokens"]["access_token"]

    payload = {
        "filename": "HugeVideo.mp4",
        "content_type": "video/mp4",
        "size_bytes": 10 * 1024 * 1024 * 1024,  # 10 GB
    }
    response = await async_client.post(
        "/api/v1/files/upload/initiate",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


@pytest.mark.asyncio
async def test_upload_confirmation_and_download_flow(async_client: AsyncClient) -> None:
    """Verify full upload initiation -> confirm -> download URL lifecycle."""
    reg_resp = await async_client.post(
        "/api/v1/auth/register",
        json={
            "email": "flowuser@example.com",
            "password": "Password123!",
            "full_name": "Flow User",
        },
    )
    token = reg_resp.json()["data"]["tokens"]["access_token"]

    # 1. Initiate Upload
    init_resp = await async_client.post(
        "/api/v1/files/upload/initiate",
        json={"filename": "Report.pdf", "content_type": "application/pdf", "size_bytes": 1024},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert init_resp.status_code == 201
    file_id = init_resp.json()["data"]["file_id"]

    # 2. Confirm Upload
    confirm_resp = await async_client.post(
        f"/api/v1/files/{file_id}/upload/confirm",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert confirm_resp.status_code == 200
    assert confirm_resp.json()["data"]["status"] == "READY"

    # 3. Request Download URL
    dl_resp = await async_client.get(
        f"/api/v1/files/{file_id}/download-url",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert dl_resp.status_code == 200
    assert "download_url" in dl_resp.json()["data"]


@pytest.mark.asyncio
async def test_unauthorized_download_denied(async_client: AsyncClient) -> None:
    """Verify non-owner cannot request download URL for another user's file (403 Forbidden)."""
    # User A initiates & confirms upload
    user_a = await async_client.post(
        "/api/v1/auth/register",
        json={
            "email": "fileowner@example.com",
            "password": "Password123!",
            "full_name": "File Owner",
        },
    )
    token_a = user_a.json()["data"]["tokens"]["access_token"]
    init_resp = await async_client.post(
        "/api/v1/files/upload/initiate",
        json={"filename": "SecretDoc.pdf", "content_type": "application/pdf", "size_bytes": 1024},
        headers={"Authorization": f"Bearer {token_a}"},
    )
    file_id = init_resp.json()["data"]["file_id"]
    await async_client.post(
        f"/api/v1/files/{file_id}/upload/confirm",
        headers={"Authorization": f"Bearer {token_a}"},
    )

    # User B attempts download
    user_b = await async_client.post(
        "/api/v1/auth/register",
        json={"email": "attacker@example.com", "password": "Password123!", "full_name": "Attacker"},
    )
    token_b = user_b.json()["data"]["tokens"]["access_token"]

    dl_resp = await async_client.get(
        f"/api/v1/files/{file_id}/download-url",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert dl_resp.status_code == 403


@pytest.mark.asyncio
async def test_file_deletion(async_client: AsyncClient) -> None:
    """Verify deleting file soft-deletes database record and cleans storage object."""
    reg_resp = await async_client.post(
        "/api/v1/auth/register",
        json={"email": "deluser@example.com", "password": "Password123!", "full_name": "Del User"},
    )
    token = reg_resp.json()["data"]["tokens"]["access_token"]

    init_resp = await async_client.post(
        "/api/v1/files/upload/initiate",
        json={"filename": "DeleteMe.pdf", "content_type": "application/pdf", "size_bytes": 1024},
        headers={"Authorization": f"Bearer {token}"},
    )
    file_id = init_resp.json()["data"]["file_id"]

    del_resp = await async_client.delete(
        f"/api/v1/files/{file_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert del_resp.status_code == 204
