import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

_INSECURE_DEFAULT_KEY = "jalrakshak_super_secret_jwt_key_2026_change_in_production"

class Settings(BaseSettings):
    APP_NAME: str = "JalRakshak AI Backend"
    # Set APP_ENV=production in Vercel environment variables
    APP_ENV: str = "production"
    API_V1_PREFIX: str = "/api/v1"

    # For Vercel: set DATABASE_URL to your PostgreSQL connection string.
    # Vercel filesystem is read-only; SQLite is only for local dev.
    DATABASE_URL: str = "sqlite:///./jalrakshak.db"

    # IMPORTANT: Always override JWT_SECRET_KEY via environment variable in production.
    JWT_SECRET_KEY: str = _INSECURE_DEFAULT_KEY
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 120

    # Set FRONTEND_ORIGINS to your actual Vercel deployment URL
    FRONTEND_ORIGINS: str = "http://localhost:5173,http://localhost:8443,http://127.0.0.1:8443,http://localhost:3000,https://*.vercel.app"

    # Vercel only allows writes to /tmp — set these in production env vars
    UPLOAD_DIR: str = "/tmp/uploads"
    OUTPUT_DIR: str = "/tmp/outputs"
    MAX_UPLOAD_SIZE_MB: int = 15

    REDIS_URL: str = "redis://localhost:6379/0"

    # Satellite Provider credentials (Sentinel Hub & Google Earth Engine)
    SATELLITE_PROVIDER: str = "sentinel-hub"  # sentinel-hub, gee, or mock
    SATELLITE_API_URL: str = "https://services.sentinel-hub.com/ogc/wms"
    SATELLITE_API_TOKEN: str = ""
    SENTINEL_HUB_CLIENT_ID: str = ""
    SENTINEL_HUB_CLIENT_SECRET: str = ""
    SENTINEL_HUB_INSTANCE_ID: str = ""
    GEE_SERVICE_ACCOUNT: str = ""
    GEE_PRIVATE_KEY: str = ""

    AI_MODEL_PATH: str = "./ml/models/intervention_detector.pt"

    # Google Gemini AI
    GEMINI_API_KEY: str = ""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @property
    def normalized_database_url(self) -> str:
        """Normalize postgres:// -> postgresql:// for SQLAlchemy compatibility."""
        url = self.DATABASE_URL
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql://", 1)
        return url

    @property
    def is_production(self) -> bool:
        return self.APP_ENV.lower() == "production"

    @property
    def cors_origins(self) -> List[str]:
        return [origin.strip() for origin in self.FRONTEND_ORIGINS.split(",") if origin.strip()]

settings = Settings()

# Warn loudly in production if the insecure default JWT key is still in use
if settings.is_production and settings.JWT_SECRET_KEY == _INSECURE_DEFAULT_KEY:
    import warnings
    warnings.warn(
        "SECURITY: JWT_SECRET_KEY is using the insecure default value. "
        "Set JWT_SECRET_KEY to a strong random secret in your environment variables!",
        RuntimeWarning,
        stacklevel=2,
    )

os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(settings.OUTPUT_DIR, exist_ok=True)
