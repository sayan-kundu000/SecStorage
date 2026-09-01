"""S3-Compatible Object Storage Provider Adapter (AWS S3, Supabase Storage, MinIO, R2)."""

from typing import Any

from app.core.config import settings
from app.core.exceptions import SecStorageException
from app.storage.base import StorageProvider


class S3StorageProvider(StorageProvider):
    """S3-compatible Object Storage provider using Boto3 / Botocore."""

    def __init__(self) -> None:
        try:
            import boto3
            from botocore.config import Config
        except ImportError as e:
            raise SecStorageException(
                code="STORAGE_ERROR",
                message="boto3 and botocore packages are required for S3 storage provider. Install via 'pip install boto3 botocore'.",
                status_code=500,
            ) from e

        self.bucket = settings.STORAGE_BUCKET_NAME
        self.client = boto3.client(
            "s3",
            endpoint_url=settings.STORAGE_ENDPOINT_URL,
            aws_access_key_id=settings.STORAGE_ACCESS_KEY_ID,
            aws_secret_access_key=settings.STORAGE_SECRET_ACCESS_KEY,
            region_name=settings.STORAGE_REGION,
            config=Config(signature_version="s3v4", s3={"addressing_style": "path"}),
        )

    async def generate_upload_url(
        self, storage_key: str, content_type: str, expires_in: int = 900
    ) -> str:
        """Generates S3 presigned PUT URL for direct client binary upload."""
        try:
            url = self.client.generate_presigned_url(
                ClientMethod="put_object",
                Params={
                    "Bucket": self.bucket,
                    "Key": storage_key,
                    "ContentType": content_type,
                },
                ExpiresIn=expires_in,
            )
            return str(url)
        except Exception as e:
            raise SecStorageException(
                code="STORAGE_ERROR",
                message=f"Failed to generate upload URL: {e!s}",
                status_code=500,
            ) from e

    async def generate_download_url(
        self, storage_key: str, filename: str, expires_in: int = 900
    ) -> str:
        """Generates S3 presigned GET URL for direct client binary download."""
        try:
            disposition = f'attachment; filename="{filename}"'
            url = self.client.generate_presigned_url(
                ClientMethod="get_object",
                Params={
                    "Bucket": self.bucket,
                    "Key": storage_key,
                    "ResponseContentDisposition": disposition,
                },
                ExpiresIn=expires_in,
            )
            return str(url)
        except Exception as e:
            raise SecStorageException(
                code="STORAGE_ERROR",
                message=f"Failed to generate download URL: {e!s}",
                status_code=500,
            ) from e

    async def object_exists(self, storage_key: str) -> bool:
        """Verifies if object exists in S3 bucket using head_object."""
        try:
            self.client.head_object(Bucket=self.bucket, Key=storage_key)
            return True
        except Exception:
            return False

    async def get_object_metadata(self, storage_key: str) -> dict[str, Any]:
        """Fetches size and content-type metadata from S3 head_object."""
        try:
            resp = self.client.head_object(Bucket=self.bucket, Key=storage_key)
            return {
                "size_bytes": resp.get("ContentLength", 0),
                "content_type": resp.get("ContentType", "application/octet-stream"),
                "etag": resp.get("ETag", "").strip('"'),
            }
        except Exception as e:
            raise SecStorageException(
                code="OBJECT_NOT_FOUND",
                message="Object metadata unavailable",
                status_code=404,
            ) from e

    async def delete_object(self, storage_key: str) -> bool:
        """Deletes object from S3 bucket."""
        try:
            self.client.delete_object(Bucket=self.bucket, Key=storage_key)
            return True
        except Exception:
            return False
