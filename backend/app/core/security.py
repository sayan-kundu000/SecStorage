"""Security Utilities: Argon2id Hashing, SHA-256 Token Hashing & JWT Processing."""

import hashlib
import uuid
from datetime import UTC, datetime, timedelta

import jwt
from passlib.context import CryptContext

from app.core.config import settings
from app.core.exceptions import AuthenticationError

pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")


def hash_password(password: str) -> str:
    """Hashes plaintext password using Argon2id algorithm."""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies plaintext password against Argon2id hash."""
    return pwd_context.verify(plain_password, hashed_password)


def hash_token(token: str) -> str:
    """Returns SHA-256 hex digest fingerprint for raw refresh tokens."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def create_access_token(user_id: uuid.UUID, expires_delta: timedelta | None = None) -> str:
    """Creates short-lived JWT access token for API request authorization."""
    now = datetime.now(UTC)
    expire = now + (
        expires_delta if expires_delta else timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    payload = {
        "sub": str(user_id),
        "jti": str(uuid.uuid4()),
        "type": "access",
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token(
    user_id: uuid.UUID, session_id: uuid.UUID, expires_delta: timedelta | None = None
) -> tuple[str, str, datetime]:
    """Generates a random refresh token string, returns (raw_token, token_hash, expires_at)."""
    now = datetime.now(UTC)
    expire = now + (
        expires_delta if expires_delta else timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    )

    raw_random_secret = f"{uuid.uuid4().hex}{uuid.uuid4().hex}"
    payload = {
        "sub": str(user_id),
        "sid": str(session_id),
        "jti": str(uuid.uuid4()),
        "type": "refresh",
        "secret": raw_random_secret,
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
    }
    raw_token = jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    token_hash = hash_token(raw_token)
    return raw_token, token_hash, expire


def decode_jwt_token(token: str, expected_type: str = "access") -> dict:
    """Decodes and validates JWT token signature, expiration, and token type claim."""
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
            options={"verify_exp": True},
        )
        token_type = payload.get("type")
        if token_type != expected_type:
            raise AuthenticationError(
                f"Invalid token type: expected '{expected_type}', got '{token_type}'"
            )
        return payload
    except jwt.ExpiredSignatureError:
        raise AuthenticationError("Token has expired") from None
    except jwt.PyJWTError:
        raise AuthenticationError("Invalid authentication token signature") from None
