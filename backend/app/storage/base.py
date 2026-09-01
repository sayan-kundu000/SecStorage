"""Abstract StorageProvider Base Class defining Object Storage API Contract."""

from abc import ABC, abstractmethod
from typing import Any


class StorageProvider(ABC):
    """Abstract Base Class for provider-agnostic Object Storage adapters."""

    @abstractmethod
    async def generate_upload_url(
        self, storage_key: str, content_type: str, expires_in: int = 900
    ) -> str:
        """Generates short-lived presigned URL for direct client object upload (PUT)."""
        pass

    @abstractmethod
    async def generate_download_url(
        self, storage_key: str, filename: str, expires_in: int = 900
    ) -> str:
        """Generates short-lived presigned URL for direct client object download (GET)."""
        pass

    @abstractmethod
    async def object_exists(self, storage_key: str) -> bool:
        """Checks whether binary object exists at storage key."""
        pass

    @abstractmethod
    async def get_object_metadata(self, storage_key: str) -> dict[str, Any]:
        """Fetches object size, content-type, and ETag/checksum metadata."""
        pass

    @abstractmethod
    async def delete_object(self, storage_key: str) -> bool:
        """Deletes object from storage provider."""
        pass
