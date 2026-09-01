"""Authentication Pydantic v2 Schemas."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.schemas.user import UserResponse


class RegisterRequest(BaseModel):
    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., min_length=8, max_length=128, description="Account password")
    full_name: str = Field(..., min_length=1, max_length=255, description="Full display name")


class LoginRequest(BaseModel):
    email: EmailStr = Field(..., description="Registered account email")
    password: str = Field(..., min_length=1, max_length=128, description="Plaintext password")


class RefreshTokenRequest(BaseModel):
    refresh_token: str = Field(..., description="Opaque refresh token string")


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., min_length=1, max_length=128)
    new_password: str = Field(..., min_length=8, max_length=128)


class TokenResponse(BaseModel):
    access_token: str = Field(..., description="JWT Bearer access token")
    refresh_token: str = Field(..., description="Refresh token string")
    token_type: str = Field(default="bearer", description="Token type schema")
    expires_in: int = Field(..., description="Access token lifetime in seconds")


class AuthResponse(BaseModel):
    user: UserResponse
    tokens: TokenResponse


class SessionResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime
    last_used_at: datetime
    expires_at: datetime
    is_current: bool = Field(default=False)
    ip_address: str | None = None
    user_agent: str | None = None

    model_config = ConfigDict(from_attributes=True)
