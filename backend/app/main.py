"""SecStorage FastAPI Application Factory & Main Entrypoint."""

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import Settings, settings
from app.core.database import engine
from app.core.exceptions import SecStorageException
from app.core.logging import logger, setup_logging
from app.core.middleware import (
    ProcessTimeMiddleware,
    RequestIDMiddleware,
    SecurityHeadersMiddleware,
)
from app.routes.api import api_v1_router
from app.routes.health import router as health_router


def validate_startup_configuration(cfg: Settings) -> None:
    """Fast-fail configuration validation on application startup."""
    if cfg.ENVIRONMENT == "production" and cfg.SECRET_KEY.startswith("default"):
        logger.warning(
            "CRITICAL: Production ENVIRONMENT is set but SECRET_KEY uses default placeholder."
        )


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application startup & shutdown lifecycle events."""
    setup_logging()
    validate_startup_configuration(settings)
    logger.info(
        f"Starting SecStorage API Service (Env: {settings.ENVIRONMENT}, Debug: {settings.DEBUG})"
    )

    # Auto-initialize database tables on startup
    async with engine.begin() as conn:
        from app.models.base import Base
        import app.models  # noqa: F401

        await conn.run_sync(Base.metadata.create_all)

    # Seed default demo user if table is empty
    try:
        from app.core.database import AsyncSessionLocal
        from app.models.user import User
        from app.core.security import hash_password
        from sqlalchemy import select

        async with AsyncSessionLocal() as session:
            result = await session.execute(select(User).limit(1))
            if not result.scalar_one_or_none():
                demo_user = User(
                    email="loginuser@example.com",
                    hashed_password=hash_password("Password123!"),
                    full_name="Demo User",
                    is_active=True,
                    is_admin=False,
                )
                session.add(demo_user)
                await session.commit()
                logger.info("Auto-seeded default demo user: loginuser@example.com")
    except Exception as e:
        logger.warning(f"Could not check or seed initial demo user: {e}")

    yield
    logger.info("Shutting down SecStorage API Service")


def create_app(app_settings: Settings = settings) -> FastAPI:
    """Application factory for instantiating configured FastAPI instances."""
    app_instance = FastAPI(
        title="SecStorage API",
        description="Production-grade REST API backend for secure cloud file storage & sharing",
        version="0.1.0",
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
        lifespan=lifespan,
    )

    # Register Middlewares (Order: CORS -> Security -> Timing -> Request ID)
    app_instance.add_middleware(
        CORSMiddleware,
        allow_origins=app_settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app_instance.add_middleware(SecurityHeadersMiddleware)
    app_instance.add_middleware(ProcessTimeMiddleware)
    app_instance.add_middleware(RequestIDMiddleware)

    # Register Domain Exception Handlers
    @app_instance.exception_handler(SecStorageException)
    async def secstorage_exception_handler(
        request: Request, exc: SecStorageException
    ) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "success": False,
                "data": None,
                "message": None,
                "error": {
                    "code": exc.code,
                    "message": exc.message,
                    "details": exc.details,
                },
            },
        )

    # Register HTTP Exceptions Handler
    @app_instance.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "success": False,
                "data": None,
                "message": None,
                "error": {
                    "code": "HTTP_ERROR",
                    "message": str(exc.detail),
                },
            },
        )

    # Register Pydantic Request Validation Exception Handler
    @app_instance.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        errors = []
        for err in exc.errors():
            field_path = " -> ".join(str(loc) for loc in err.get("loc", []))
            errors.append({"field": field_path, "message": err.get("msg", "")})

        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "success": False,
                "data": None,
                "message": None,
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": "Request validation failed",
                    "details": errors,
                },
            },
        )

    # Register Unhandled Server Error Handler
    @app_instance.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        logger.error(f"Unhandled server error: {str(exc)}", exc_info=True)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "success": False,
                "data": None,
                "message": None,
                "error": {
                    "code": "INTERNAL_SERVER_ERROR",
                    "message": "An unexpected server error occurred.",
                },
            },
        )

    # Register API Routers
    app_instance.include_router(health_router)
    app_instance.include_router(api_v1_router)

    return app_instance


app = create_app()
