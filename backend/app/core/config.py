import json

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    PORT: int = 8000
    SECRET_KEY: str = "default-insecure-secret-key-change-in-production-64bytes"

    # CORS & Application URLs
    CORS_ORIGINS: list[str] | str = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ]
    FRONTEND_BASE_URL: str = "http://localhost:3000"
    BACKEND_BASE_URL: str = "http://localhost:8000"

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: str | list[str]) -> list[str]:
        if isinstance(v, str):
            if v.startswith("[") and v.endswith("]"):
                try:
                    return json.loads(v)
                except Exception:
                    pass
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v

    # Database Settings (Persistent local SQLite for development fallback, PostgreSQL in prod)
    DATABASE_URL: str = "sqlite+aiosqlite:///./secstorage.db"

    # JWT Security Settings
    JWT_SECRET: str = "default-jwt-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Object Storage Settings
    STORAGE_PROVIDER: str = "supabase"
    STORAGE_ENDPOINT_URL: str = "https://your-project.supabase.co/storage/v1/s3"
    STORAGE_BUCKET_NAME: str = "secstorage-objects"
    STORAGE_ACCESS_KEY_ID: str = "mock-access-key"
    STORAGE_SECRET_ACCESS_KEY: str = "mock-secret-key"
    STORAGE_REGION: str = "us-east-1"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


settings = Settings()
