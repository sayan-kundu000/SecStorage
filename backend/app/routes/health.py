"""Health Check & Readiness Probe Router."""

from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.schemas.common import APIResponse, HealthStatus, ReadinessStatus

router = APIRouter(tags=["Health"])


@router.get(
    "/health",
    response_model=APIResponse[HealthStatus],
    summary="Application Liveness Probe",
)
async def health_check() -> APIResponse[HealthStatus]:
    """Returns application health status for Render liveness probes (no external dependencies)."""
    payload = HealthStatus(
        status="ok",
        version="0.1.0",
        environment=settings.ENVIRONMENT,
    )
    return APIResponse(success=True, data=payload, message="SecStorage API operational")


@router.get(
    "/ready",
    response_model=APIResponse[ReadinessStatus],
    summary="Application Readiness Probe",
)
async def readiness_check(
    db: AsyncSession = Depends(get_db),  # noqa: B008
) -> APIResponse[ReadinessStatus] | JSONResponse:
    """Verifies backend database connectivity for readiness probes."""
    try:
        # Lightweight database connectivity probe
        result = await db.execute(text("SELECT 1"))
        if result.scalar() == 1:
            payload = ReadinessStatus(
                status="ready",
                database="connected",
                environment=settings.ENVIRONMENT,
            )
            return APIResponse(success=True, data=payload, message="SecStorage API fully ready")
    except Exception:
        pass

    return JSONResponse(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        content={
            "success": False,
            "data": None,
            "message": None,
            "error": {
                "code": "SERVICE_UNAVAILABLE",
                "message": "Database readiness check failed",
            },
        },
    )
