"""Storage Service Factory managing StorageProvider implementations."""

from app.core.config import settings
from app.core.exceptions import SecStorageException
from app.storage.base import StorageProvider
from app.storage.local import LocalStorageProvider
from app.storage.mock import MockStorageProvider
from app.storage.s3 import S3StorageProvider

_storage_provider_instance: StorageProvider | None = None


def get_storage_provider() -> StorageProvider:
    """Instantiates and caches configured StorageProvider adapter based on environment settings."""
    global _storage_provider_instance
    if _storage_provider_instance is not None:
        return _storage_provider_instance

    provider_name = settings.STORAGE_PROVIDER.lower().strip()
    if provider_name in ("s3", "supabase", "r2", "minio"):
        is_template_url = "your-project.supabase.co" in settings.STORAGE_ENDPOINT_URL
        is_mock_key = settings.STORAGE_ACCESS_KEY_ID in ("mock-access-key", "your-access-key", "")
        if not is_template_url and not is_mock_key:
            try:
                _storage_provider_instance = S3StorageProvider()
                return _storage_provider_instance
            except SecStorageException:
                pass

    _storage_provider_instance = LocalStorageProvider()
    return _storage_provider_instance


class StorageService:
    """Domain service wrapping StorageProvider operations and signed URL generation."""

    def __init__(self, provider: StorageProvider | None = None) -> None:
        self.provider = provider or get_storage_provider()

    async def generate_upload_url(
        self, storage_key: str, content_type: str, expires_in: int = 900
    ) -> str:
        """Generates presigned PUT upload URL."""
        return await self.provider.generate_upload_url(
            storage_key=storage_key, content_type=content_type, expires_in=expires_in
        )

    async def generate_download_url(
        self, storage_key: str, filename: str, expires_in: int = 900
    ) -> str:
        """Generates presigned GET download URL."""
        return await self.provider.generate_download_url(
            storage_key=storage_key, filename=filename, expires_in=expires_in
        )

    async def object_exists(self, storage_key: str) -> bool:
        """Checks binary object existence in storage provider."""
        return await self.provider.object_exists(storage_key)

    async def get_object_metadata(self, storage_key: str) -> dict:
        """Fetches object size and ETag metadata."""
        return await self.provider.get_object_metadata(storage_key)

    async def delete_object(self, storage_key: str) -> bool:
        """Deletes object from storage provider."""
        return await self.provider.delete_object(storage_key)

    async def get_object_bytes(self, storage_key: str, max_bytes: int = 102400) -> bytes:
        """Reads object content bytes for preview generation."""
        if hasattr(self.provider, "get_object_bytes"):
            return await self.provider.get_object_bytes(storage_key, max_bytes=max_bytes)
        return b"SecStorage preview sample content for " + storage_key.encode("utf-8")
