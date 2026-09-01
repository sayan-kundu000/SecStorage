"""Pydantic v2 Schemas Package exporting all API DTOs."""

from app.schemas.activity import ActivityListResponse, ActivityResponse
from app.schemas.preview import PreviewResponse
from app.schemas.version import FileVersionListResponse, FileVersionResponse, VersionRestoreResponse
from app.schemas.auth import (
    AuthResponse,
    ChangePasswordRequest,
    LoginRequest,
    RefreshTokenRequest,
    RegisterRequest,
    SessionResponse,
    TokenResponse,
)
from app.schemas.common import APIResponse, HealthStatus, ReadinessStatus
from app.schemas.error import ErrorPayload, ValidationErrorDetail
from app.schemas.file import (
    DownloadUrlResponse,
    FileCreate,
    FileListResponse,
    FileResponse,
    FileUpdate,
    FileVersionResponse,
    UploadConfirmRequest,
    UploadInitiateRequest,
    UploadInitiateResponse,
)
from app.schemas.folder import FolderCreate, FolderListResponse, FolderResponse, FolderUpdate
from app.schemas.pagination import PaginatedResponse, PaginationMeta
from app.schemas.public_link import (
    PublicLinkCreate,
    PublicLinkListResponse,
    PublicLinkResponse,
    PublicLinkVerifyPasswordRequest,
    PublicResourceMetadataResponse,
)
from app.schemas.search import SearchQueryParams, SearchResponseData, SearchResultItem
from app.schemas.sharing import ShareCreate, ShareListResponse, ShareResponse, ShareUpdate
from app.schemas.star import StarCreate, StarResponse, StarredItemResponse, StarredListResponseData
from app.schemas.trash import RestoreResponse, TrashItemResponse, TrashListResponseData
from app.schemas.user import UserCreate, UserResponse, UserUpdate

__all__ = [
    "APIResponse",
    "ActivityListResponse",
    "ActivityResponse",
    "FileVersionListResponse",
    "FileVersionResponse",
    "PreviewResponse",
    "VersionRestoreResponse",
    "AuthResponse",
    "ChangePasswordRequest",
    "DownloadUrlResponse",
    "ErrorPayload",
    "FileCreate",
    "FileListResponse",
    "FileResponse",
    "FileUpdate",
    "FileVersionResponse",
    "FolderCreate",
    "FolderListResponse",
    "FolderResponse",
    "FolderUpdate",
    "HealthStatus",
    "LoginRequest",
    "PaginatedResponse",
    "PaginationMeta",
    "PublicLinkCreate",
    "PublicLinkListResponse",
    "PublicLinkResponse",
    "PublicLinkVerifyPasswordRequest",
    "PublicResourceMetadataResponse",
    "ReadinessStatus",
    "RefreshTokenRequest",
    "RegisterRequest",
    "RestoreResponse",
    "SearchQueryParams",
    "SearchResponseData",
    "SearchResultItem",
    "SessionResponse",
    "ShareCreate",
    "ShareListResponse",
    "ShareResponse",
    "ShareUpdate",
    "StarCreate",
    "StarResponse",
    "StarredItemResponse",
    "StarredListResponseData",
    "TokenResponse",
    "TrashItemResponse",
    "TrashListResponseData",
    "UploadConfirmRequest",
    "UploadInitiateRequest",
    "UploadInitiateResponse",
    "UserCreate",
    "UserResponse",
    "UserUpdate",
    "ValidationErrorDetail",
]
