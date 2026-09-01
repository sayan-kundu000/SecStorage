"""User Authentication & Account Security Router."""

from fastapi import APIRouter, Depends, Request, status
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.auth import (
    AuthResponse,
    ChangePasswordRequest,
    LoginRequest,
    RefreshTokenRequest,
    RegisterRequest,
    TokenResponse,
)
from app.schemas.common import APIResponse
from app.schemas.user import UserResponse
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/register",
    response_model=APIResponse[AuthResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Register New User Account",
)
async def register(
    payload: RegisterRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),  # noqa: B008
) -> APIResponse[AuthResponse]:
    """Registers new user account, creates session, and returns access/refresh tokens."""
    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("User-Agent")

    service = AuthService(db)
    result = await service.register(
        email=payload.email,
        password=payload.password,
        full_name=payload.full_name,
        ip_address=client_ip,
        user_agent=user_agent,
    )
    return APIResponse(
        success=True,
        data=result,
        message="User registered successfully",
    )


@router.post(
    "/login",
    response_model=APIResponse[AuthResponse],
    summary="Authenticate User Credentials",
)
async def login(
    payload: LoginRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),  # noqa: B008
) -> APIResponse[AuthResponse]:
    """Authenticates credentials, updates last login, creates session, and issues tokens."""
    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("User-Agent")

    service = AuthService(db)
    result = await service.authenticate(
        email=payload.email,
        password=payload.password,
        ip_address=client_ip,
        user_agent=user_agent,
    )
    return APIResponse(
        success=True,
        data=result,
        message="Authentication successful",
    )


@router.post(
    "/refresh",
    response_model=APIResponse[TokenResponse],
    summary="Rotate Refresh Token & Issue Access Token",
)
async def refresh(
    payload: RefreshTokenRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),  # noqa: B008
) -> APIResponse[TokenResponse]:
    """Rotates refresh token and issues new access token."""
    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("User-Agent")

    service = AuthService(db)
    tokens = await service.refresh_session(
        raw_refresh_token=payload.refresh_token,
        ip_address=client_ip,
        user_agent=user_agent,
    )
    return APIResponse(
        success=True,
        data=tokens,
        message="Token refreshed successfully",
    )


@router.post(
    "/logout",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Revoke Current Authentication Session",
)
async def logout(
    current_user: User = Depends(get_current_user),  # noqa: B008
    db: AsyncSession = Depends(get_db),  # noqa: B008
) -> JSONResponse:
    """Revokes active user session."""
    service = AuthService(db)
    await service.logout(current_user.id)
    return JSONResponse(status_code=status.HTTP_204_NO_CONTENT, content=None)


@router.post(
    "/logout-all",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Revoke All Active User Sessions",
)
async def logout_all(
    current_user: User = Depends(get_current_user),  # noqa: B008
    db: AsyncSession = Depends(get_db),  # noqa: B008
) -> JSONResponse:
    """Revokes all active sessions for authenticated user across all devices."""
    service = AuthService(db)
    await service.logout_all(current_user.id)
    return JSONResponse(status_code=status.HTTP_204_NO_CONTENT, content=None)


@router.get(
    "/me",
    response_model=APIResponse[UserResponse],
    summary="Get Authenticated User Identity Profile",
)
async def get_auth_me(
    current_user: User = Depends(get_current_user),  # noqa: B008
) -> APIResponse[UserResponse]:
    """Returns profile for currently authenticated user."""
    user_resp = UserResponse.model_validate(current_user)
    return APIResponse(success=True, data=user_resp, message="Authenticated profile retrieved")


@router.post(
    "/change-password",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Change Password & Invalidate Sessions",
)
async def change_password(
    payload: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),  # noqa: B008
    db: AsyncSession = Depends(get_db),  # noqa: B008
) -> JSONResponse:
    """Verifies current password, updates password hash, and revokes active sessions."""
    service = AuthService(db)
    await service.change_password(
        user_id=current_user.id,
        current_password=payload.current_password,
        new_password=payload.new_password,
    )
    return JSONResponse(status_code=status.HTTP_204_NO_CONTENT, content=None)
