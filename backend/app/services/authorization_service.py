"""Authorization Service & Centralized Permission Evaluator."""

import uuid
from dataclasses import dataclass
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ForbiddenError
from app.core.permissions import (
    ROLE_PERMISSIONS_MAP,
    Action,
    Permission,
    ResourceType,
    Role,
)
from app.models.folder import Folder
from app.models.share import Share, ShareRole
from app.models.user import User
from app.repositories.share_repository import ShareRepository


@dataclass
class AuthorizationDecision:
    """Dataclass storing evaluation outcome, security source, and reason."""

    allowed: bool
    reason: str
    source: str  # "OWNERSHIP", "RBAC", "EXPLICIT_SHARE", "INHERITED_SHARE", "DENIED"


class PermissionEvaluator:
    """Evaluates fine-grained action permissions against user roles and resource ACLs."""

    @staticmethod
    def evaluate_global_permission(user: User, permission: Permission) -> bool:
        """Checks whether user's role maps to target global permission."""
        user_role = Role.ADMIN if getattr(user, "is_admin", False) else Role.USER
        allowed_permissions = ROLE_PERMISSIONS_MAP.get(user_role, set())
        return permission in allowed_permissions

    @staticmethod
    def evaluate_share_action(share_permission: str, action: Action) -> bool:
        """Evaluates whether share ACL role allows requested action."""
        if share_permission == ShareRole.EDITOR:
            return action in (
                Action.READ,
                Action.DOWNLOAD,
                Action.UPDATE,
                Action.CREATE,
                Action.SHARE,
            )
        if share_permission == ShareRole.VIEWER:
            return action in (Action.READ, Action.DOWNLOAD)
        return False


class AuthorizationService:
    """Centralized security service enforcing RBAC, resource ownership, direct ACLs, and folder inheritance."""

    def __init__(self, db_session: AsyncSession) -> None:
        self.db_session = db_session
        self.share_repo = ShareRepository(db_session)

    def has_global_permission(self, user: User, permission: Permission) -> bool:
        """Returns True if user holds global RBAC permission."""
        return PermissionEvaluator.evaluate_global_permission(user, permission)

    def require_global_permission(self, user: User, permission: Permission) -> None:
        """Raises ForbiddenError if user lacks required global RBAC permission."""
        if not self.has_global_permission(user, permission):
            raise ForbiddenError(f"User does not possess required permission: '{permission}'")

    async def can_access_resource(
        self,
        user: User,
        resource: Any,
        resource_type: ResourceType,
        action: Action,
    ) -> AuthorizationDecision:
        """Evaluates authorization precedence for specific domain resource instance.

        Precedence Rules:
        1. Inactive account -> DENY
        2. Resource Ownership (resource.user_id == user.id) -> ALLOW (OWNERSHIP)
        3. Direct Share ACL record on entity -> ALLOW / DENY based on explicit permission (EXPLICIT_SHARE)
        4. Inherited Folder Share ACL record from parent tree -> ALLOW if role permits (INHERITED_SHARE)
        5. Admin override for system entities -> ALLOW (RBAC)
        6. Default -> DENY
        """
        if not user.is_active:
            return AuthorizationDecision(
                allowed=False, reason="Account is inactive", source="DENIED"
            )

        # 1. Ownership check
        owner_id = getattr(resource, "user_id", None)
        if owner_id and owner_id == user.id:
            return AuthorizationDecision(
                allowed=True,
                reason="User is explicit resource owner",
                source="OWNERSHIP",
            )

        # 2. Direct Share ACL check (Direct permission overrides inherited)
        resource_id = getattr(resource, "id", None)
        direct_share: Share | None = None
        if resource_id:
            if resource_type == ResourceType.FILE:
                direct_share = await self.share_repo.get_file_share_for_user(resource_id, user.id)
            elif resource_type == ResourceType.FOLDER:
                direct_share = await self.share_repo.get_folder_share_for_user(resource_id, user.id)

        if direct_share:
            if PermissionEvaluator.evaluate_share_action(direct_share.permission, action):
                return AuthorizationDecision(
                    allowed=True,
                    reason=f"Resource granted via direct share ({direct_share.permission})",
                    source="EXPLICIT_SHARE",
                )
            else:
                return AuthorizationDecision(
                    allowed=False,
                    reason=f"Action '{action.value}' restricted by direct share ({direct_share.permission})",
                    source="DENIED",
                )

        # 3. Inherited Folder Share ACL check
        parent_folder_id = None
        if resource_type == ResourceType.FILE:
            parent_folder_id = getattr(resource, "folder_id", None)
        elif resource_type == ResourceType.FOLDER:
            parent_folder_id = getattr(resource, "parent_id", None)

        visited_folder_ids: set[uuid.UUID] = set()
        curr_folder_id = parent_folder_id

        while curr_folder_id is not None and curr_folder_id not in visited_folder_ids:
            visited_folder_ids.add(curr_folder_id)
            folder_share = await self.share_repo.get_folder_share_for_user(curr_folder_id, user.id)
            if folder_share:
                if PermissionEvaluator.evaluate_share_action(folder_share.permission, action):
                    return AuthorizationDecision(
                        allowed=True,
                        reason=f"Resource granted via inherited folder share ({folder_share.permission})",
                        source="INHERITED_SHARE",
                    )
                else:
                    return AuthorizationDecision(
                        allowed=False,
                        reason=f"Action '{action.value}' restricted by inherited folder share ({folder_share.permission})",
                        source="DENIED",
                    )

            # Traverse to next parent folder
            stmt = select(Folder.parent_id, Folder.deleted_at).where(Folder.id == curr_folder_id)
            result = await self.db_session.execute(stmt)
            row = result.first()
            if not row or row.deleted_at is not None:
                break
            curr_folder_id = row.parent_id

        # 4. Administrative Override
        if getattr(user, "is_admin", False) and action in (
            Action.READ,
            Action.MANAGE,
        ):
            return AuthorizationDecision(
                allowed=True,
                reason="System administrator authority",
                source="RBAC",
            )

        # Default Deny-by-Default
        return AuthorizationDecision(
            allowed=False,
            reason="Access denied by resource authorization rules",
            source="DENIED",
        )

    async def require_resource_permission(
        self,
        user: User,
        resource: Any,
        resource_type: ResourceType,
        action: Action,
    ) -> None:
        """Raises ForbiddenError if resource authorization fails."""
        decision = await self.can_access_resource(
            user=user,
            resource=resource,
            resource_type=resource_type,
            action=action,
        )
        if not decision.allowed:
            raise ForbiddenError("You do not have permission to access this resource")

    async def get_accessible_shared_resource_ids(
        self, user_id: uuid.UUID
    ) -> tuple[set[uuid.UUID], set[uuid.UUID]]:
        """Returns sets of (shared_file_ids, shared_folder_ids) accessible to user via direct or inherited shares."""
        shares = await self.share_repo.list_shares_for_grantee(user_id)
        file_ids: set[uuid.UUID] = set()
        folder_ids: set[uuid.UUID] = set()

        for s in shares:
            if s.file_id:
                file_ids.add(s.file_id)
            elif s.folder_id:
                folder_ids.add(s.folder_id)
                # Recursively expand child folders & files under this shared folder
                await self._collect_descendant_ids(s.folder_id, file_ids, folder_ids)

        return file_ids, folder_ids

    async def _collect_descendant_ids(
        self, folder_id: uuid.UUID, file_ids: set[uuid.UUID], folder_ids: set[uuid.UUID]
    ) -> None:
        """Recursively collects descendant file and folder IDs for a shared folder subtree."""
        from app.models.file import File

        # Child files
        file_stmt = select(File.id).where(File.folder_id == folder_id, File.deleted_at.is_(None))
        file_rows = await self.db_session.execute(file_stmt)
        for fid in file_rows.scalars().all():
            file_ids.add(fid)

        # Child folders
        folder_stmt = select(Folder.id).where(
            Folder.parent_id == folder_id, Folder.deleted_at.is_(None)
        )
        folder_rows = await self.db_session.execute(folder_stmt)
        child_folder_ids = list(folder_rows.scalars().all())

        for cfid in child_folder_ids:
            if cfid not in folder_ids:
                folder_ids.add(cfid)
                await self._collect_descendant_ids(cfid, file_ids, folder_ids)
