import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    APP_NAME: str = "JalRakshak AI Backend"
    APP_ENV: str = "development"
    API_V1_PREFIX: str = "/api/v1"

    DATABASE_URL: str = "sqlite:///./jalrakshak.db"

    JWT_SECRET_KEY: str = "jalrakshak_super_secret_jwt_key_2026_change_in_production"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    FRONTEND_ORIGINS: str = "http://localhost:5173,http://localhost:8443,http://127.0.0.1:8443,http://localhost:3000"

    UPLOAD_DIR: str = "./storage/uploads"
    OUTPUT_DIR: str = "./storage/outputs"
    MAX_UPLOAD_SIZE_MB: int = 15

    REDIS_URL: str = "redis://localhost:6379/0"

    SATELLITE_PROVIDER: str = "mock"
    SATELLITE_API_URL: str = ""
    SATELLITE_API_TOKEN: str = ""

    AI_MODEL_PATH: str = "./ml/models/intervention_detector.pt"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @property
    def cors_origins(self) -> List[str]:
        return [origin.strip() for origin in self.FRONTEND_ORIGINS.split(",") if origin.strip()]

settings = Settings()

os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(settings.OUTPUT_DIR, exist_ok=True)
