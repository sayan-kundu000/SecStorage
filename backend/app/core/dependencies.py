"""FastAPI Dependency Injection & Security Hooks."""

import uuid
from collections.abc import AsyncGenerator, Callable

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.exceptions import AuthenticationError, ForbiddenError
from app.core.permissions import Permission
from app.core.security import decode_jwt_token
from app.models.user import User
from app.repositories.user_repository import UserRepository

# HTTP Bearer security scheme for Swagger UI & ReDoc OpenAPI specs
security_scheme = HTTPBearer(auto_error=True)


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """Dependency alias for database session injection."""
    async for session in get_db():
        yield session


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),  # noqa: B008
    db: AsyncSession = Depends(get_db),  # noqa: B008
) -> User:
    """Authentication dependency validating Bearer JWT access token and returning active User."""
    token = credentials.credentials
    payload = decode_jwt_token(token, expected_type="access")

    user_id_str = payload.get("sub")
    if not user_id_str:
        raise AuthenticationError("Invalid authentication token payload")

    try:
        user_id = uuid.UUID(user_id_str)
    except ValueError:
        raise AuthenticationError("Invalid user identity format in token") from None

    user_repo = UserRepository(db)
    user = await user_repo.get_by_id(user_id)

    if not user:
        raise AuthenticationError("User account no longer exists")

    if not user.is_active:
        raise AuthenticationError("User account is inactive")

    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user),  # noqa: B008
) -> User:
    """Dependency alias for active authenticated user."""
    return current_user


def require_permission(permission: Permission) -> Callable:
    """Dependency factory producing a FastAPI dependency that verifies global RBAC permission."""

    async def permission_dependency(
        current_user: User = Depends(get_current_user),  # noqa: B008
    ) -> User:
        from app.services.authorization_service import PermissionEvaluator

        if not PermissionEvaluator.evaluate_global_permission(current_user, permission):
            raise ForbiddenError(
                f"You do not have permission to perform this action ({permission})"
            )
        return current_user

    return permission_dependency


async def require_admin(
    current_user: User = Depends(get_current_user),  # noqa: B008
) -> User:
    """Dependency enforcing System Administrator authority."""
    if not getattr(current_user, "is_admin", False):
        raise ForbiddenError("Administrative authority is required for this operation")
    return current_user
