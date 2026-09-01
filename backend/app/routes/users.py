"""User Profile & Identity Router."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.common import APIResponse
from app.schemas.user import UserResponse, UserUpdate

router = APIRouter(prefix="/users", tags=["Users"])


@router.get(
    "/me",
    response_model=APIResponse[UserResponse],
    summary="Get Authenticated User Profile",
)
async def get_current_user_profile(
    current_user: User = Depends(get_current_user),  # noqa: B008
) -> APIResponse[UserResponse]:
    """Returns profile for currently authenticated user session."""
    user_resp = UserResponse.model_validate(current_user)
    return APIResponse(
        success=True,
        data=user_resp,
        message="Authenticated profile retrieved",
    )


@router.patch(
    "/me",
    response_model=APIResponse[UserResponse],
    summary="Update User Profile Metadata",
)
async def update_current_user_profile(
    payload: UserUpdate,
    current_user: User = Depends(get_current_user),  # noqa: B008
    db: AsyncSession = Depends(get_db),  # noqa: B008
) -> APIResponse[UserResponse]:
    """Updates user display name."""
    if payload.full_name is not None:
        current_user.full_name = payload.full_name.strip()
        await db.commit()
        await db.refresh(current_user)

    user_resp = UserResponse.model_validate(current_user)
    return APIResponse(
        success=True,
        data=user_resp,
        message="User profile updated successfully",
    )
