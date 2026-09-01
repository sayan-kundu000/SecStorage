"""Core Middleware Pipeline: Request ID, Timing & Security Headers."""

import time
import uuid
from collections.abc import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware


class RequestIDMiddleware(BaseHTTPMiddleware):
    """Middleware for propagating or generating a unique X-Request-ID per HTTP request."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        request_id = request.headers.get("X-Request-ID")
        if not request_id:
            request_id = str(uuid.uuid4())

        request.state.request_id = request_id
        response: Response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response


class ProcessTimeMiddleware(BaseHTTPMiddleware):
    """Middleware for tracking request process duration."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        start_time = time.perf_counter()
        response: Response = await call_next(request)
        process_time = time.perf_counter() - start_time
        response.headers["X-Process-Time"] = f"{process_time:.4f}s"
        return response


from app.core.config import settings


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Middleware for setting standard browser security headers."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        response: Response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        # Allow trusted frontend origins to frame storage preview documents (e.g. PDF/media embeds)
        is_storage_preview = "/storage/download" in request.url.path
        if is_storage_preview:
            origins = (
                list(settings.CORS_ORIGINS)
                if isinstance(settings.CORS_ORIGINS, list)
                else [settings.CORS_ORIGINS]
            )
            if settings.DEBUG or settings.ENVIRONMENT == "development":
                for dev_origin in ("http://localhost:*", "http://127.0.0.1:*"):
                    if dev_origin not in origins:
                        origins.append(dev_origin)
            ancestors = " ".join(["'self'"] + origins)
            response.headers["Content-Security-Policy"] = f"frame-ancestors {ancestors};"
            if "X-Frame-Options" in response.headers:
                del response.headers["X-Frame-Options"]
        else:
            response.headers["X-Frame-Options"] = "DENY"

        return response
