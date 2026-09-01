"""Domain Share Service managing private user-to-user resource access grants."""

import json
import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictError, ResourceNotFoundError, ValidationError
from app.core.permissions import Action, ResourceType
from app.models.activity import Activity
from app.models.share import Share
from app.models.user import User
from app.repositories.file_repository import FileRepository
from app.repositories.folder_repository import FolderRepository
from app.repositories.share_repository import ShareRepository
from app.repositories.user_repository import UserRepository
from app.schemas.sharing import ShareResponse
from app.services.authorization_service import AuthorizationService


class ShareService:
    """Domain service managing user-to-user file and folder permission grants."""

    def __init__(self, db_session: AsyncSession) -> None:
        self.db_session = db_session
        self.share_repo = ShareRepository(db_session)
        self.user_repo = UserRepository(db_session)
        self.file_repo = FileRepository(db_session)
        self.folder_repo = FolderRepository(db_session)
        self.auth_service = AuthorizationService(db_session)

    async def grant_share(
        self,
        grantor: User,
        grantee_email: str,
        permission: str,
        file_id: uuid.UUID | None = None,
        folder_id: uuid.UUID | None = None,
    ) -> ShareResponse:
        """Grants or updates user permission share on a file or folder."""
        if (file_id is None and folder_id is None) or (file_id is not None and folder_id is not None):
            raise ValidationError("Exactly one of 'file_id' or 'folder_id' must be specified")

        # 1. Resolve grantee user by email
        grantee = await self.user_repo.get_by_email(grantee_email.strip().lower())
        if not grantee:
            raise ResourceNotFoundError(f"Recipient account '{grantee_email}' was not found")

        # 2. Reject self-sharing
        if grantee.id == grantor.id:
            raise ValidationError("Self-sharing is not permitted")

        # 3. Resolve target resource and check permissions
        if file_id is not None:
            file_ent = await self.file_repo.get_by_id(file_id)
            if not file_ent or file_ent.deleted_at is not None:
                raise ResourceNotFoundError("Target file entity not found or deleted")

            await self.auth_service.require_resource_permission(
                user=grantor,
                resource=file_ent,
                resource_type=ResourceType.FILE,
                action=Action.SHARE,
            )

            existing = await self.share_repo.get_file_share_for_user(file_id, grantee.id)
            if existing:
                existing.permission = permission
                await self.db_session.commit()
                saved_share = existing
            else:
                share_ent = Share(
                    grantor_id=grantor.id,
                    grantee_id=grantee.id,
                    file_id=file_id,
                    folder_id=None,
                    permission=permission,
                )
                saved_share = await self.share_repo.create(share_ent)
                await self.db_session.commit()

            # Refresh share entity for response formatting
            loaded_share = await self.share_repo.get_by_id(saved_share.id)

            # Audit log
            activity = Activity(
                user_id=grantor.id,
                action="RESOURCE_SHARED",
                resource_type="file",
                resource_id=file_id,
                metadata_json=json.dumps(
                    {"grantee_email": grantee_email, "permission": permission}
                ),
            )
            self.db_session.add(activity)
            await self.db_session.commit()

            return ShareResponse(
                id=loaded_share.id,
                grantor_id=grantor.id,
                grantee_id=grantee.id,
                grantee_email=grantee.email,
                grantee_name=grantee.full_name,
                file_id=file_id,
                folder_id=None,
                resource_id=file_id,
                resource_type="file",
                resource_name=file_ent.name,
                permission=permission,
                created_at=loaded_share.created_at,
                updated_at=loaded_share.updated_at,
            )

        else:
            folder_ent = await self.folder_repo.get_by_id(folder_id)
            if not folder_ent or folder_ent.deleted_at is not None:
                raise ResourceNotFoundError("Target folder entity not found or deleted")

            await self.auth_service.require_resource_permission(
                user=grantor,
                resource=folder_ent,
                resource_type=ResourceType.FOLDER,
                action=Action.SHARE,
            )

            existing = await self.share_repo.get_folder_share_for_user(folder_id, grantee.id)
            if existing:
                existing.permission = permission
                await self.db_session.commit()
                saved_share = existing
            else:
                share_ent = Share(
                    grantor_id=grantor.id,
                    grantee_id=grantee.id,
                    file_id=None,
                    folder_id=folder_id,
                    permission=permission,
                )
                saved_share = await self.share_repo.create(share_ent)
                await self.db_session.commit()

            loaded_share = await self.share_repo.get_by_id(saved_share.id)

            activity = Activity(
                user_id=grantor.id,
                action="RESOURCE_SHARED",
                resource_type="folder",
                resource_id=folder_id,
                metadata_json=json.dumps(
                    {"grantee_email": grantee_email, "permission": permission}
                ),
            )
            self.db_session.add(activity)
            await self.db_session.commit()

            return ShareResponse(
                id=loaded_share.id,
                grantor_id=grantor.id,
                grantee_id=grantee.id,
                grantee_email=grantee.email,
                grantee_name=grantee.full_name,
                file_id=None,
                folder_id=folder_id,
                resource_id=folder_id,
                resource_type="folder",
                resource_name=folder_ent.name,
                permission=permission,
                created_at=loaded_share.created_at,
                updated_at=loaded_share.updated_at,
            )

    async def update_share(self, user: User, share_id: uuid.UUID, permission: str) -> ShareResponse:
        """Updates permission level of an existing share."""
        share = await self.share_repo.get_by_id(share_id)
        if not share:
            raise ResourceNotFoundError("Target share record not found")

        # Verify caller has share authority
        resource = share.file or share.folder
        resource_type = ResourceType.FILE if share.file_id else ResourceType.FOLDER
        await self.auth_service.require_resource_permission(
            user=user,
            resource=resource,
            resource_type=resource_type,
            action=Action.SHARE,
        )

        share.permission = permission
        await self.db_session.commit()

        activity = Activity(
            user_id=user.id,
            action="SHARE_PERMISSION_CHANGED",
            resource_type=resource_type.value.lower(),
            resource_id=share.file_id or share.folder_id,
            metadata_json=json.dumps({"new_permission": permission}),
        )
        self.db_session.add(activity)
        await self.db_session.commit()

        return ShareResponse(
            id=share.id,
            grantor_id=share.grantor_id,
            grantee_id=share.grantee_id,
            grantee_email=share.grantee.email if share.grantee else None,
            grantee_name=share.grantee.full_name if share.grantee else None,
            file_id=share.file_id,
            folder_id=share.folder_id,
            resource_id=share.file_id or share.folder_id,
            resource_type="file" if share.file_id else "folder",
            resource_name=resource.name if resource else None,
            permission=share.permission,
            created_at=share.created_at,
            updated_at=share.updated_at,
        )

    async def revoke_share(self, user: User, share_id: uuid.UUID) -> None:
        """Revokes user access permission share."""
        share = await self.share_repo.get_by_id(share_id)
        if not share:
            return

        resource = share.file or share.folder
        resource_type = ResourceType.FILE if share.file_id else ResourceType.FOLDER
        await self.auth_service.require_resource_permission(
            user=user,
            resource=resource,
            resource_type=resource_type,
            action=Action.SHARE,
        )

        res_id = share.file_id or share.folder_id
        await self.share_repo.delete(share)

        activity = Activity(
            user_id=user.id,
            action="SHARE_REVOKED",
            resource_type=resource_type.value.lower(),
            resource_id=res_id,
        )
        self.db_session.add(activity)
        await self.db_session.commit()

    async def list_shares_for_resource(
        self, user: User, file_id: uuid.UUID | None = None, folder_id: uuid.UUID | None = None
    ) -> list[ShareResponse]:
        """Lists all user shares granted for a resource."""
        if file_id is not None:
            file_ent = await self.file_repo.get_by_id(file_id)
            if not file_ent or file_ent.deleted_at is not None:
                raise ResourceNotFoundError("File entity not found")
            await self.auth_service.require_resource_permission(
                user=user, resource=file_ent, resource_type=ResourceType.FILE, action=Action.SHARE
            )
            shares = await self.share_repo.list_shares_for_file(file_id)
            res = []
            for s in shares:
                res.append(
                    ShareResponse(
                        id=s.id,
                        grantor_id=s.grantor_id,
                        grantee_id=s.grantee_id,
                        grantee_email=s.grantee.email if s.grantee else None,
                        grantee_name=s.grantee.full_name if s.grantee else None,
                        file_id=file_id,
                        folder_id=None,
                        resource_id=file_id,
                        resource_type="file",
                        resource_name=file_ent.name,
                        permission=s.permission,
                        created_at=s.created_at,
                        updated_at=s.updated_at,
                    )
                )
            return res

        elif folder_id is not None:
            folder_ent = await self.folder_repo.get_by_id(folder_id)
            if not folder_ent or folder_ent.deleted_at is not None:
                raise ResourceNotFoundError("Folder entity not found")
            await self.auth_service.require_resource_permission(
                user=user, resource=folder_ent, resource_type=ResourceType.FOLDER, action=Action.SHARE
            )
            shares = await self.share_repo.list_shares_for_folder(folder_id)
            res = []
            for s in shares:
                res.append(
                    ShareResponse(
                        id=s.id,
                        grantor_id=s.grantor_id,
                        grantee_id=s.grantee_id,
                        grantee_email=s.grantee.email if s.grantee else None,
                        grantee_name=s.grantee.full_name if s.grantee else None,
                        file_id=None,
                        folder_id=folder_id,
                        resource_id=folder_id,
                        resource_type="folder",
                        resource_name=folder_ent.name,
                        permission=s.permission,
                        created_at=s.created_at,
                        updated_at=s.updated_at,
                    )
                )
            return res
        return []

    async def list_shares_received(self, user: User) -> list[ShareResponse]:
        """Lists active resources shared with current requesting user."""
        shares = await self.share_repo.list_shares_for_grantee(user.id)
        res = []
        for s in shares:
            res_name = s.file.name if s.file else (s.folder.name if s.folder else None)
            res.append(
                ShareResponse(
                    id=s.id,
                    grantor_id=s.grantor_id,
                    grantee_id=s.grantee_id,
                    grantee_email=user.email,
                    grantee_name=user.full_name,
                    file_id=s.file_id,
                    folder_id=s.folder_id,
                    resource_id=s.file_id or s.folder_id,
                    resource_type="file" if s.file_id else "folder",
                    resource_name=res_name,
                    permission=s.permission,
                    created_at=s.created_at,
                    updated_at=s.updated_at,
                )
            )
        return res
