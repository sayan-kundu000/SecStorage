"""Centralized API Router Aggregator for SecStorage REST API."""

from fastapi import APIRouter

from app.routes.activities import router as activities_router
from app.routes.auth import router as auth_router
from app.routes.files import router as files_router
from app.routes.folders import router as folders_router
from app.routes.health import router as health_router
from app.routes.preview import router as preview_router
from app.routes.public_links import router as public_links_router
from app.routes.search import router as search_router
from app.routes.shares import router as shares_router
from app.routes.stars import router as stars_router
from app.routes.storage import router as storage_router
from app.routes.trash import router as trash_router
from app.routes.users import router as users_router
from app.routes.versions import router as versions_router

api_v1_router = APIRouter(prefix="/api/v1")

# Register Health Router under /api/v1
api_v1_router.include_router(health_router)

# Register Authentication & Domain Routers
api_v1_router.include_router(auth_router)
api_v1_router.include_router(users_router)
api_v1_router.include_router(folders_router)
api_v1_router.include_router(files_router)
api_v1_router.include_router(storage_router)
api_v1_router.include_router(versions_router)
api_v1_router.include_router(preview_router)
api_v1_router.include_router(search_router)
api_v1_router.include_router(shares_router)
api_v1_router.include_router(public_links_router)
api_v1_router.include_router(stars_router)
api_v1_router.include_router(trash_router)
api_v1_router.include_router(activities_router)
