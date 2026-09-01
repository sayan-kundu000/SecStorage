"""Mock Object Storage Provider Adapter for Unit & Integration Testing."""

from typing import Any

from app.core.config import settings
from app.storage.base import StorageProvider


class MockStorageProvider(StorageProvider):
    """In-memory Mock Object Storage provider for isolated Pytest execution."""

    def __init__(self) -> None:
        self.objects: dict[str, dict[str, Any]] = {}

    async def generate_upload_url(
        self, storage_key: str, content_type: str, expires_in: int = 900
    ) -> str:
        """Generates deterministic mock presigned upload URL."""
        # Auto-populate mock object storage so confirmation immediately sees it
        self.objects[storage_key] = {
            "size_bytes": 1024,
            "content_type": content_type,
            "etag": "mock-etag-hash",
        }
        base_url = settings.BACKEND_BASE_URL.rstrip("/") + "/api/v1"
        return f"{base_url}/storage/upload/{storage_key}"

    async def generate_download_url(
        self, storage_key: str, filename: str, expires_in: int = 900
    ) -> str:
        """Generates deterministic mock presigned download URL."""
        base_url = settings.BACKEND_BASE_URL.rstrip("/") + "/api/v1"
        return f"{base_url}/storage/download/{storage_key}?filename={filename}"

    async def object_exists(self, storage_key: str) -> bool:
        """Checks mock in-memory storage dictionary."""
        return storage_key in self.objects

    async def get_object_metadata(self, storage_key: str) -> dict[str, Any]:
        """Fetches mock object metadata."""
        if storage_key not in self.objects:
            return {"size_bytes": 1024, "content_type": "application/octet-stream", "etag": "mock"}
        return self.objects[storage_key]

    async def delete_object(self, storage_key: str) -> bool:
        """Removes object from mock in-memory storage."""
        if storage_key in self.objects:
            del self.objects[storage_key]
            return True
        return False

    async def get_object_bytes(self, storage_key: str, max_bytes: int = 102400) -> bytes:
        """Returns mock content bytes for preview testing."""
        obj = self.objects.get(storage_key)
        if obj and "content" in obj:
            data = obj["content"]
            return data[:max_bytes] if isinstance(data, bytes) else data.encode("utf-8")[:max_bytes]
        return b"SecStorage preview sample text content for " + storage_key.encode("utf-8")
