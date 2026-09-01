"""File Preview Service providing safe, controlled representations for media, PDF, and text files."""

import html
import os
import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ForbiddenError, ResourceNotFoundError, ValidationError
from app.core.permissions import Action, ResourceType
from app.models.file import File
from app.models.user import User
from app.repositories.file_repository import FileRepository
from app.repositories.version_repository import VersionRepository
from app.schemas.preview import PreviewResponse
from app.services.activity_service import ActivityService
from app.services.authorization_service import AuthorizationService
from app.services.public_link_service import PublicLinkService
from app.services.storage_service import StorageService

IMAGE_MIME_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/bmp",
    "image/svg+xml",
}

PDF_MIME_TYPES = {
    "application/pdf",
}

VIDEO_MIME_TYPES = {
    "video/mp4",
    "video/webm",
    "video/ogg",
    "video/quicktime",
    "video/x-msvideo",
    "video/x-matroska",
}
VIDEO_EXTENSIONS = {".mp4", ".webm", ".mov", ".mkv", ".avi"}

AUDIO_MIME_TYPES = {
    "audio/mpeg",
    "audio/mp3",
    "audio/wav",
    "audio/ogg",
    "audio/aac",
    "audio/flac",
    "audio/webm",
}
AUDIO_EXTENSIONS = {".mp3", ".wav", ".ogg", ".m4a", ".flac", ".aac"}

TEXT_MIME_TYPES = {
    "text/plain",
    "text/markdown",
    "text/csv",
    "text/html",
    "text/xml",
    "application/json",
    "application/xml",
    "application/javascript",
    "text/x-python",
    "text/css",
}

TEXT_EXTENSIONS = {
    ".txt", ".md", ".csv", ".json", ".xml", ".py", ".js", ".ts", ".css", ".html", ".log", ".yaml", ".yml", ".ini", ".conf", ".sh"
}

MAX_TEXT_PREVIEW_BYTES = 100 * 1024  # 100 KB limit for inline text preview


class PreviewService:
    """Domain service for generating safe, format-aware file previews."""

    def __init__(self, db_session: AsyncSession) -> None:
        self.db_session = db_session
        self.file_repo = FileRepository(db_session)
        self.version_repo = VersionRepository(db_session)
        self.auth_service = AuthorizationService(db_session)
        self.storage_service = StorageService()
        self.activity_service = ActivityService(db_session)
        self.public_link_service = PublicLinkService(db_session)

    async def get_file_preview(
        self, user: User, file_id: uuid.UUID, version_id: uuid.UUID | None = None
    ) -> PreviewResponse:
        """Generates a safe preview representation for an authorized user."""
        file_ent = await self.file_repo.get_by_id(file_id)
        if not file_ent or file_ent.deleted_at is not None:
            raise ResourceNotFoundError("File entity not found")

        await self.auth_service.require_resource_permission(
            user=user,
            resource=file_ent,
            resource_type=ResourceType.FILE,
            action=Action.READ,
        )

        if file_ent.status == "PENDING":
            return PreviewResponse(
                file_id=file_id,
                version_id=version_id,
                preview_type="UNSUPPORTED",
                mime_type=file_ent.mime_type,
                message="File upload is still pending or was not completed. Please finish or restart the upload.",
            )

        storage_key = file_ent.storage_key
        mime_type = file_ent.mime_type
        filename = file_ent.name

        if version_id is not None:
            ver = await self.version_repo.get_by_id(version_id)
            if not ver or ver.file_id != file_id:
                raise ResourceNotFoundError("Specified version was not found for this file")
            storage_key = ver.storage_key
            if ver.mime_type:
                mime_type = ver.mime_type
            if ver.original_filename:
                filename = ver.original_filename

        await self.activity_service.log_activity(
            user_id=user.id,
            action="FILE_PREVIEWED",
            resource_type="FILE",
            resource_id=file_id,
            metadata={"versionId": str(version_id) if version_id else "current"},
        )

        return await self._build_preview_response(
            file_id=file_id,
            version_id=version_id,
            storage_key=storage_key,
            mime_type=mime_type,
            filename=filename,
        )

    async def get_public_link_preview(
        self, raw_token: str, password: str | None = None
    ) -> PreviewResponse:
        """Generates a safe preview response for an active public share link (current version only)."""
        link = await self.public_link_service.get_valid_public_link(raw_token, password=password)
        if not link.file_id:
            raise ValidationError("Previews are only available for individual file share links")

        file_ent = link.file or await self.file_repo.get_by_id(link.file_id)
        if not file_ent or file_ent.deleted_at is not None:
            raise ResourceNotFoundError("Publicly shared file is unavailable")

        return await self._build_preview_response(
            file_id=file_ent.id,
            version_id=None,
            storage_key=file_ent.storage_key,
            mime_type=file_ent.mime_type,
            filename=file_ent.name,
        )

    async def _build_preview_response(
        self,
        file_id: uuid.UUID,
        version_id: uuid.UUID | None,
        storage_key: str,
        mime_type: str,
        filename: str,
    ) -> PreviewResponse:
        """Evaluates preview strategy based on content type and generates appropriate payload."""
        ext = os.path.splitext(filename)[1].lower()
        clean_mime = mime_type.lower().split(";")[0].strip()

        def _make_inline_url(raw_url: str) -> str:
            if "storage/download" in raw_url and "inline=" not in raw_url:
                separator = "&" if "?" in raw_url else "?"
                return f"{raw_url}{separator}inline=true"
            return raw_url

        # 1. Image Preview
        if clean_mime in IMAGE_MIME_TYPES or ext in {".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".svg"}:
            expires_in = 900
            now = datetime.now(UTC)
            url = await self.storage_service.generate_download_url(
                storage_key=storage_key, filename=filename, expires_in=expires_in
            )
            return PreviewResponse(
                file_id=file_id,
                version_id=version_id,
                preview_type="IMAGE",
                mime_type=clean_mime,
                preview_url=_make_inline_url(url),
                expires_at=now + timedelta(seconds=expires_in),
                message="Image preview URL generated successfully",
            )

        # 2. PDF Preview
        if clean_mime in PDF_MIME_TYPES or ext == ".pdf":
            expires_in = 900
            now = datetime.now(UTC)
            url = await self.storage_service.generate_download_url(
                storage_key=storage_key, filename=filename, expires_in=expires_in
            )
            return PreviewResponse(
                file_id=file_id,
                version_id=version_id,
                preview_type="PDF",
                mime_type="application/pdf",
                preview_url=_make_inline_url(url),
                expires_at=now + timedelta(seconds=expires_in),
                message="PDF preview URL generated successfully",
            )

        # 3. Video Preview
        if clean_mime in VIDEO_MIME_TYPES or ext in VIDEO_EXTENSIONS or clean_mime.startswith("video/"):
            expires_in = 900
            now = datetime.now(UTC)
            url = await self.storage_service.generate_download_url(
                storage_key=storage_key, filename=filename, expires_in=expires_in
            )
            return PreviewResponse(
                file_id=file_id,
                version_id=version_id,
                preview_type="VIDEO",
                mime_type=clean_mime or "video/mp4",
                preview_url=_make_inline_url(url),
                expires_at=now + timedelta(seconds=expires_in),
                message="Video stream preview URL generated successfully",
            )

        # 4. Audio Preview
        if clean_mime in AUDIO_MIME_TYPES or ext in AUDIO_EXTENSIONS or clean_mime.startswith("audio/"):
            expires_in = 900
            now = datetime.now(UTC)
            url = await self.storage_service.generate_download_url(
                storage_key=storage_key, filename=filename, expires_in=expires_in
            )
            return PreviewResponse(
                file_id=file_id,
                version_id=version_id,
                preview_type="AUDIO",
                mime_type=clean_mime or "audio/mpeg",
                preview_url=_make_inline_url(url),
                expires_at=now + timedelta(seconds=expires_in),
                message="Audio stream preview URL generated successfully",
            )

        # 5. Text/Code Preview
        if clean_mime in TEXT_MIME_TYPES or ext in TEXT_EXTENSIONS or clean_mime.startswith("text/"):
            try:
                raw_bytes = await self.storage_service.get_object_bytes(storage_key, max_bytes=MAX_TEXT_PREVIEW_BYTES)
                text = raw_bytes.decode("utf-8", errors="replace")
                
                # Security: Escape raw HTML tags so untrusted HTML content cannot execute in browser context
                if clean_mime == "text/html" or ext == ".html":
                    text = html.escape(text)

                is_truncated = len(raw_bytes) >= MAX_TEXT_PREVIEW_BYTES
                return PreviewResponse(
                    file_id=file_id,
                    version_id=version_id,
                    preview_type="TEXT",
                    mime_type=clean_mime,
                    text_content=text,
                    is_truncated=is_truncated,
                    message="Text content preview retrieved successfully",
                )
            except Exception:
                pass  # Fall through to UNSUPPORTED if reading/decoding fails

        # 6. Fallback: UNSUPPORTED
        return PreviewResponse(
            file_id=file_id,
            version_id=version_id,
            preview_type="UNSUPPORTED",
            mime_type=clean_mime,
            message="Inline preview is not supported for this file format. Please download the file.",
        )

