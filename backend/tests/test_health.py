"""Unit & Integration Tests for Health, Readiness & Middleware Pipeline."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_liveness_endpoint(async_client: AsyncClient) -> None:
    """Verify GET /health returns 200 OK liveness status."""
    response = await async_client.get("/health")
    assert response.status_code == 200
    payload = response.json()
    assert payload["success"] is True
    assert payload["data"]["status"] == "ok"
    assert "version" in payload["data"]


@pytest.mark.asyncio
async def test_readiness_probe_endpoint(async_client: AsyncClient) -> None:
    """Verify GET /ready performs DB probe and returns 200 OK readiness status."""
    response = await async_client.get("/ready")
    assert response.status_code == 200
    payload = response.json()
    assert payload["success"] is True
    assert payload["data"]["status"] == "ready"
    assert payload["data"]["database"] == "connected"


@pytest.mark.asyncio
async def test_api_v1_health_and_readiness(async_client: AsyncClient) -> None:
    """Verify GET /api/v1/health and /api/v1/ready under versioned namespace."""
    health_resp = await async_client.get("/api/v1/health")
    assert health_resp.status_code == 200
    assert health_resp.json()["success"] is True

    ready_resp = await async_client.get("/api/v1/ready")
    assert ready_resp.status_code == 200
    assert ready_resp.json()["success"] is True


@pytest.mark.asyncio
async def test_request_id_middleware_generated(async_client: AsyncClient) -> None:
    """Verify X-Request-ID header is automatically generated if missing."""
    response = await async_client.get("/health")
    assert "x-request-id" in response.headers
    assert len(response.headers["x-request-id"]) > 0


@pytest.mark.asyncio
async def test_request_id_middleware_preserved(async_client: AsyncClient) -> None:
    """Verify incoming X-Request-ID header is preserved in response."""
    custom_id = "test-custom-request-id-12345"
    response = await async_client.get("/health", headers={"X-Request-ID": custom_id})
    assert response.headers.get("x-request-id") == custom_id


@pytest.mark.asyncio
async def test_process_time_middleware(async_client: AsyncClient) -> None:
    """Verify X-Process-Time header is included in response."""
    response = await async_client.get("/health")
    assert "x-process-time" in response.headers


@pytest.mark.asyncio
async def test_security_headers_middleware(async_client: AsyncClient) -> None:
    """Verify standard security headers are present in response."""
    response = await async_client.get("/health")
    assert response.headers.get("x-content-type-options") == "nosniff"
    assert response.headers.get("x-frame-options") == "DENY"
    assert response.headers.get("referrer-policy") == "strict-origin-when-cross-origin"
