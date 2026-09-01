"""Authentication & Session Management Business Service."""

import uuid
from datetime import UTC, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import AuthenticationError, ConflictError
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_jwt_token,
    hash_password,
    hash_token,
    verify_password,
)
from app.models.session import Session
from app.models.user import User
from app.repositories.session_repository import SessionRepository
from app.repositories.user_repository import UserRepository
from app.schemas.auth import AuthResponse, TokenResponse
from app.schemas.user import UserResponse


def _ensure_utc(dt: datetime) -> datetime:
    """Ensures datetime is timezone-aware UTC."""
    if dt.tzinfo is None:
        return dt.replace(tzinfo=UTC)
    return dt


class AuthService:
    """Business service orchestrating authentication, sessions, and token rotation."""

    def __init__(self, db_session: AsyncSession) -> None:
        self.db_session = db_session
        self.user_repo = UserRepository(db_session)
        self.session_repo = SessionRepository(db_session)

    async def register(
        self,
        email: str,
        password: str,
        full_name: str,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> AuthResponse:
        """Registers a new User account, creates session, and issues authentication tokens."""
        clean_email = email.lower().strip()
        existing = await self.user_repo.get_by_email(clean_email)
        if existing:
            raise ConflictError("An account with this email address already exists")

        new_user = User(
            email=clean_email,
            hashed_password=hash_password(password),
            full_name=full_name.strip(),
            is_active=True,
            is_verified=False,
        )
        saved_user = await self.user_repo.create(new_user)

        tokens, _ = await self._create_user_session_and_tokens(
            saved_user.id, ip_address, user_agent
        )
        await self.db_session.commit()

        user_resp = UserResponse.model_validate(saved_user)
        return AuthResponse(user=user_resp, tokens=tokens)

    async def authenticate(
        self,
        email: str,
        password: str,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> AuthResponse:
        """Verifies credentials, updates last login, creates session, and issues tokens."""
        clean_email = email.lower().strip()
        user = await self.user_repo.get_by_email(clean_email)
        if not user or not verify_password(password, user.hashed_password):
            raise AuthenticationError("Invalid email or password")

        if not user.is_active:
            raise AuthenticationError("Account is inactive")

        user.last_login_at = datetime.now(UTC)
        tokens, _ = await self._create_user_session_and_tokens(user.id, ip_address, user_agent)
        await self.db_session.commit()

        user_resp = UserResponse.model_validate(user)
        return AuthResponse(user=user_resp, tokens=tokens)

    async def refresh_session(
        self,
        raw_refresh_token: str,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> TokenResponse:
        """Rotates refresh token and issues new access token."""
        payload = decode_jwt_token(raw_refresh_token, expected_type="refresh")
        user_id = uuid.UUID(payload["sub"])
        session_id = uuid.UUID(payload["sid"])

        token_hash = hash_token(raw_refresh_token)
        session_entity = await self.session_repo.get_by_token_hash(token_hash)

        if not session_entity:
            # Refresh token reuse detection: revoke all sessions for safety
            await self.session_repo.revoke_all_for_user(user_id)
            await self.db_session.commit()
            raise AuthenticationError(
                "Suspicious refresh token reuse detected. All sessions revoked."
            )

        now = datetime.now(UTC)
        expires_at = _ensure_utc(session_entity.expires_at)

        if session_entity.revoked_at is not None or expires_at <= now:
            raise AuthenticationError("Refresh session is expired or revoked")

        # Revoke old session
        await self.session_repo.revoke(session_id)

        # Issue new rotated session and tokens
        tokens, _ = await self._create_user_session_and_tokens(user_id, ip_address, user_agent)
        await self.db_session.commit()

        return tokens

    async def logout(self, user_id: uuid.UUID, session_id: uuid.UUID | None = None) -> None:
        """Revokes user authentication session."""
        if session_id:
            await self.session_repo.revoke(session_id)
        else:
            await self.session_repo.revoke_all_for_user(user_id)
        await self.db_session.commit()

    async def logout_all(self, user_id: uuid.UUID) -> None:
        """Revokes all active sessions for authenticated user."""
        await self.session_repo.revoke_all_for_user(user_id)
        await self.db_session.commit()

    async def change_password(
        self, user_id: uuid.UUID, current_password: str, new_password: str
    ) -> None:
        """Verifies current password, updates password hash, and revokes active sessions."""
        user = await self.user_repo.get_by_id(user_id)
        if not user or not verify_password(current_password, user.hashed_password):
            raise AuthenticationError("Current password is incorrect")

        user.hashed_password = hash_password(new_password)
        await self.session_repo.revoke_all_for_user(user_id)
        await self.db_session.commit()

    async def _create_user_session_and_tokens(
        self,
        user_id: uuid.UUID,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> tuple[TokenResponse, Session]:
        """Internal helper to create Session record and return TokenResponse."""
        session_id = uuid.uuid4()
        access_token = create_access_token(user_id)
        raw_refresh_token, token_hash, expires_at = create_refresh_token(user_id, session_id)

        session_entity = Session(
            id=session_id,
            user_id=user_id,
            refresh_token_hash=token_hash,
            expires_at=expires_at,
            ip_address=ip_address,
            user_agent=user_agent,
        )
        await self.session_repo.create(session_entity)

        tokens = TokenResponse(
            access_token=access_token,
            refresh_token=raw_refresh_token,
            token_type="bearer",
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        )
        return tokens, session_entity
