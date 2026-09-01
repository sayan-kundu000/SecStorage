"""Local Disk Storage Provider Adapter for Development & Standalone Operation."""

import os
from pathlib import Path
from typing import Any

from app.core.config import settings
from app.storage.base import StorageProvider


class LocalStorageProvider(StorageProvider):
    """Local file-system based Storage Provider for development and standalone operation."""

    def __init__(self, base_dir: str | Path | None = None) -> None:
        if base_dir is None:
            self.base_dir = Path("./scratch/storage_data").resolve()
        else:
            self.base_dir = Path(base_dir).resolve()
        self.base_dir.mkdir(parents=True, exist_ok=True)

    def _get_path(self, storage_key: str) -> Path:
        """Sanitizes and resolves full local file path for storage key."""
        clean_key = storage_key.lstrip("/").replace("\\", "/")
        full_path = (self.base_dir / clean_key).resolve()
        return full_path

    async def generate_upload_url(
        self, storage_key: str, content_type: str, expires_in: int = 900
    ) -> str:
        """Generates local backend upload URL and prepares local storage path."""
        path = self._get_path(storage_key)
        path.parent.mkdir(parents=True, exist_ok=True)
        if not path.exists():
            path.write_bytes(b"")
        base_url = settings.BACKEND_BASE_URL.rstrip("/") + "/api/v1"
        return f"{base_url}/storage/upload/{storage_key}"

    async def generate_download_url(
        self, storage_key: str, filename: str, expires_in: int = 900
    ) -> str:
        """Generates local backend download URL."""
        base_url = settings.BACKEND_BASE_URL.rstrip("/") + "/api/v1"
        return f"{base_url}/storage/download/{storage_key}?filename={filename}"

    async def object_exists(self, storage_key: str) -> bool:
        """Checks if local binary file exists on disk."""
        path = self._get_path(storage_key)
        return path.exists() and path.is_file()

    async def get_object_metadata(self, storage_key: str) -> dict[str, Any]:
        """Fetches file size and metadata from disk."""
        path = self._get_path(storage_key)
        if not path.exists():
            return {"size_bytes": 0, "content_type": "application/octet-stream", "etag": "none"}
        stat = path.stat()
        return {
            "size_bytes": stat.st_size,
            "content_type": "application/octet-stream",
            "etag": f"local-{stat.st_mtime}",
        }

    async def save_object_bytes(self, storage_key: str, data: bytes) -> bool:
        """Saves binary data bytes to local disk."""
        path = self._get_path(storage_key)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
        return True

    async def delete_object(self, storage_key: str) -> bool:
        """Deletes binary object file from local disk."""
        path = self._get_path(storage_key)
        if path.exists():
            path.unlink()
            return True
        return False

    async def get_object_bytes(self, storage_key: str, max_bytes: int = 102400) -> bytes:
        """Reads content bytes from local file."""
        path = self._get_path(storage_key)
        if not path.exists():
            return b"SecStorage local sample content for " + storage_key.encode("utf-8")
        with open(path, "rb") as f:
            data = f.read(max_bytes)
            return (
                data
                if data
                else b"SecStorage local sample content for " + storage_key.encode("utf-8")
            )
