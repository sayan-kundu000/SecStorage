"""Public Link Sharing Service managing secure token generation, hashing, password protection, and access resolution."""

import hashlib
import json
import secrets
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import ForbiddenError, ResourceNotFoundError, ValidationError
from app.core.permissions import Action, ResourceType
from app.core.security import hash_password, verify_password
from app.models.activity import Activity
from app.models.link_share import LinkShare
from app.models.user import User
from app.repositories.file_repository import FileRepository
from app.repositories.folder_repository import FolderRepository
from app.repositories.public_link_repository import PublicLinkRepository
from app.schemas.public_link import PublicLinkResponse, PublicResourceMetadataResponse
from app.services.authorization_service import AuthorizationService
from app.services.storage_service import StorageService


def hash_public_token(token: str) -> str:
    """Computes SHA-256 hash digest of a raw public token string."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


class PublicLinkService:
    """Service managing public link generation, password hashing, expiration, and download isolation."""

    def __init__(self, db_session: AsyncSession) -> None:
        self.db_session = db_session
        self.public_link_repo = PublicLinkRepository(db_session)
        self.file_repo = FileRepository(db_session)
        self.folder_repo = FolderRepository(db_session)
        self.auth_service = AuthorizationService(db_session)
        self.storage_service = StorageService()

    async def create_public_link(
        self,
        creator: User,
        permission: str = "VIEWER",
        file_id: uuid.UUID | None = None,
        folder_id: uuid.UUID | None = None,
        password: str | None = None,
        expires_at: datetime | None = None,
        allow_download: bool = True,
    ) -> PublicLinkResponse:
        """Creates an expirable, optional password-protected public share link. Returns raw token once."""
        if (file_id is None and folder_id is None) or (file_id is not None and folder_id is not None):
            raise ValidationError("Exactly one of 'file_id' or 'folder_id' must be specified")

        if expires_at is not None:
            # Ensure timezone awareness
            now_utc = datetime.now(timezone.utc)
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            if expires_at <= now_utc:
                raise ValidationError("Expiration timestamp must be in the future")

        # 1. Check authorization on target resource
        res_id = file_id or folder_id
        if file_id is not None:
            file_ent = await self.file_repo.get_by_id(file_id)
            if not file_ent or file_ent.deleted_at is not None:
                raise ResourceNotFoundError("Target file entity not found or deleted")
            await self.auth_service.require_resource_permission(
                user=creator, resource=file_ent, resource_type=ResourceType.FILE, action=Action.SHARE
            )
            res_name = file_ent.name
        else:
            folder_ent = await self.folder_repo.get_by_id(folder_id)
            if not folder_ent or folder_ent.deleted_at is not None:
                raise ResourceNotFoundError("Target folder entity not found or deleted")
            await self.auth_service.require_resource_permission(
                user=creator, resource=folder_ent, resource_type=ResourceType.FOLDER, action=Action.SHARE
            )
            res_name = folder_ent.name

        # 2. Cryptographic token generation and hashing
        raw_token = secrets.token_urlsafe(32)
        token_hash = hash_public_token(raw_token)

        hashed_pwd = hash_password(password) if password else None

        link_ent = LinkShare(
            created_by=creator.id,
            folder_id=folder_id,
            file_id=file_id,
            token=token_hash,
            hashed_password=hashed_pwd,
            expires_at=expires_at,
            allow_download=allow_download,
            permission=permission,
            is_active=True,
        )

        saved_link = await self.public_link_repo.create(link_ent)
        await self.db_session.commit()

        # Audit event
        activity = Activity(
            user_id=creator.id,
            action="PUBLIC_LINK_CREATED",
            resource_type="file" if file_id else "folder",
            resource_id=res_id,
            metadata_json=json.dumps(
                {
                    "link_id": str(saved_link.id),
                    "has_password": bool(password),
                    "allow_download": allow_download,
                }
            ),
        )
        self.db_session.add(activity)
        await self.db_session.commit()

        base_url = settings.FRONTEND_BASE_URL.rstrip("/")
        full_url = f"{base_url}/share/{raw_token}"

        return PublicLinkResponse(
            id=saved_link.id,
            created_by=creator.id,
            folder_id=folder_id,
            file_id=file_id,
            resource_id=res_id,
            resource_type="file" if file_id else "folder",
            resource_name=res_name,
            token=raw_token,  # Expose raw token only on creation!
            url=full_url,
            has_password=bool(password),
            expires_at=expires_at,
            allow_download=allow_download,
            permission=permission,
            is_active=True,
            created_at=saved_link.created_at,
        )

    async def get_valid_public_link(
        self, raw_token: str, password: str | None = None
    ) -> LinkShare:
        """Validates token, active status, expiration, and password requirements, returning LinkShare model entity."""
        token_hash = hash_public_token(raw_token)
        link = await self.public_link_repo.get_by_token(token_hash)

        if not link or not link.is_active:
            raise ResourceNotFoundError("Public share link is invalid or has been revoked")

        if link.expires_at is not None:
            now_utc = datetime.now(timezone.utc)
            exp = link.expires_at if link.expires_at.tzinfo else link.expires_at.replace(tzinfo=timezone.utc)
            if exp <= now_utc:
                raise ResourceNotFoundError("Public share link has expired")

        if link.hashed_password is not None:
            if not password or not verify_password(password, link.hashed_password):
                raise ForbiddenError("Password verification required to access this resource")

        return link

    async def get_public_link_by_token(
        self, raw_token: str, password: str | None = None
    ) -> PublicResourceMetadataResponse:
        """Validates public token, checks expiration & password protection, returns resource metadata."""
        token_hash = hash_public_token(raw_token)
        link = await self.public_link_repo.get_by_token(token_hash)

        if not link or not link.is_active:
            raise ResourceNotFoundError("Public share link is invalid or has been revoked")

        # Expiration check
        if link.expires_at is not None:
            now_utc = datetime.now(timezone.utc)
            exp = link.expires_at if link.expires_at.tzinfo else link.expires_at.replace(tzinfo=timezone.utc)
            if exp <= now_utc:
                raise ResourceNotFoundError("Public share link has expired")

        # Password check
        has_password = link.hashed_password is not None
        requires_password = False
        if has_password:
            if not password:
                requires_password = True
            elif not verify_password(password, link.hashed_password):
                raise ForbiddenError("Invalid password for protected public share link")

        # Validate resource existence & active lifecycle
        if link.file_id:
            file_ent = link.file or await self.file_repo.get_by_id(link.file_id)
            if not file_ent or file_ent.deleted_at is not None:
                raise ResourceNotFoundError("Publicly shared resource is unavailable")

            download_url = None
            if not requires_password and link.allow_download:
                download_url = await self.storage_service.generate_download_url(
                    storage_key=file_ent.storage_key, filename=file_ent.name
                )

            return PublicResourceMetadataResponse(
                id=file_ent.id,
                name=file_ent.name if not requires_password else "Protected File",
                type="file",
                mime_type=file_ent.mime_type if not requires_password else None,
                size_bytes=file_ent.size_bytes if not requires_password else None,
                folder_id=file_ent.folder_id,
                created_at=file_ent.created_at,
                updated_at=file_ent.updated_at,
                has_password=has_password,
                requires_password=requires_password,
                allow_download=link.allow_download,
                permission=link.permission,
                download_url=download_url,
            )
        else:
            folder_ent = link.folder or await self.folder_repo.get_by_id(link.folder_id)
            if not folder_ent or folder_ent.deleted_at is not None:
                raise ResourceNotFoundError("Publicly shared folder is unavailable")

            return PublicResourceMetadataResponse(
                id=folder_ent.id,
                name=folder_ent.name if not requires_password else "Protected Folder",
                type="folder",
                mime_type=None,
                size_bytes=None,
                folder_id=folder_ent.parent_id,
                created_at=folder_ent.created_at,
                updated_at=folder_ent.updated_at,
                has_password=has_password,
                requires_password=requires_password,
                allow_download=link.allow_download,
                permission=link.permission,
                download_url=None,
            )

    async def generate_public_download_url(
        self, raw_token: str, password: str | None = None
    ) -> tuple[str, datetime, uuid.UUID]:
        """Generates a short-lived storage download signed URL for a valid public link."""
        token_hash = hash_public_token(raw_token)
        link = await self.public_link_repo.get_by_token(token_hash)

        if not link or not link.is_active:
            raise ResourceNotFoundError("Public share link is invalid or has been revoked")

        if link.expires_at is not None:
            now_utc = datetime.now(timezone.utc)
            exp = link.expires_at if link.expires_at.tzinfo else link.expires_at.replace(tzinfo=timezone.utc)
            if exp <= now_utc:
                raise ResourceNotFoundError("Public share link has expired")

        if link.hashed_password is not None:
            if not password or not verify_password(password, link.hashed_password):
                raise ForbiddenError("Password verification required to download this resource")

        if not link.allow_download:
            raise ForbiddenError("Download is restricted on this public share link")

        if not link.file_id:
            raise ValidationError("Download signed URLs can only be generated for file entities")

        file_ent = link.file or await self.file_repo.get_by_id(link.file_id)
        if not file_ent or file_ent.deleted_at is not None:
            raise ResourceNotFoundError("Publicly shared file is unavailable")

        download_url = await self.storage_service.generate_download_url(
            storage_key=file_ent.storage_key, filename=file_ent.name
        )
        expires_at = datetime.now(timezone.utc) + timedelta(seconds=900)
        return download_url, expires_at, file_ent.id

    async def revoke_public_link(self, user: User, link_id: uuid.UUID) -> None:
        """Revokes an active public share link."""
        link = await self.public_link_repo.get_by_id(link_id)
        if not link or not link.is_active:
            return

        res_id = link.file_id or link.folder_id
        res_type = ResourceType.FILE if link.file_id else ResourceType.FOLDER
        res = link.file or link.folder

        await self.auth_service.require_resource_permission(
            user=user, resource=res, resource_type=res_type, action=Action.SHARE
        )

        await self.public_link_repo.deactivate(link)
        await self.db_session.commit()

        activity = Activity(
            user_id=user.id,
            action="PUBLIC_LINK_REVOKED",
            resource_type=res_type.value.lower(),
            resource_id=res_id,
            metadata_json=json.dumps({"link_id": str(link_id)}),
        )
        self.db_session.add(activity)
        await self.db_session.commit()

    async def list_public_links_for_resource(
        self, user: User, file_id: uuid.UUID | None = None, folder_id: uuid.UUID | None = None
    ) -> list[PublicLinkResponse]:
        """Lists active public share links for resource owner."""
        base_url = settings.FRONTEND_BASE_URL.rstrip("/")
        if file_id is not None:
            file_ent = await self.file_repo.get_by_id(file_id)
            if not file_ent or file_ent.deleted_at is not None:
                raise ResourceNotFoundError("File entity not found")
            await self.auth_service.require_resource_permission(
                user=user, resource=file_ent, resource_type=ResourceType.FILE, action=Action.SHARE
            )
            links = await self.public_link_repo.list_active_links_for_file(file_id)
            return [
                PublicLinkResponse(
                    id=l.id,
                    created_by=l.created_by,
                    file_id=file_id,
                    folder_id=None,
                    resource_id=file_id,
                    resource_type="file",
                    resource_name=file_ent.name,
                    token=None,  # Do not expose tokens in listings!
                    url=f"{base_url}/share/link-{l.id.hex[:8]}",
                    has_password=l.hashed_password is not None,
                    expires_at=l.expires_at,
                    allow_download=l.allow_download,
                    permission=l.permission,
                    is_active=l.is_active,
                    created_at=l.created_at,
                )
                for l in links
            ]
        elif folder_id is not None:
            folder_ent = await self.folder_repo.get_by_id(folder_id)
            if not folder_ent or folder_ent.deleted_at is not None:
                raise ResourceNotFoundError("Folder entity not found")
            await self.auth_service.require_resource_permission(
                user=user, resource=folder_ent, resource_type=ResourceType.FOLDER, action=Action.SHARE
            )
            links = await self.public_link_repo.list_active_links_for_folder(folder_id)
            return [
                PublicLinkResponse(
                    id=l.id,
                    created_by=l.created_by,
                    file_id=None,
                    folder_id=folder_id,
                    resource_id=folder_id,
                    resource_type="folder",
                    resource_name=folder_ent.name,
                    token=None,
                    url=f"{base_url}/share/link-{l.id.hex[:8]}",
                    has_password=l.hashed_password is not None,
                    expires_at=l.expires_at,
                    allow_download=l.allow_download,
                    permission=l.permission,
                    is_active=l.is_active,
                    created_at=l.created_at,
                )
                for l in links
            ]
        return []
