"""Application configuration via environment variables."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_NAME: str = "FunDo"
    APP_VERSION: str = "1.0.1"
    DEBUG: bool = True
    SECRET_KEY: str = "dev-secret-change-in-production-fundo"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # Database: SQLite for dev, PostgreSQL for production
    DATABASE_URL: str = "sqlite+aiosqlite:////app/persistent/fundo.db"

    # CORS — stored as comma-separated string (Coolify passes plain strings, not JSON arrays)
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    @property
    def cors_origins_list(self) -> list[str]:
        """Parse comma-separated CORS_ORIGINS into a list for FastAPI middleware."""
        origins = [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]
        # Always include production and Capacitor origins (belt-and-suspenders for Coolify env propagation)
        required_origins = (
            "https://fundo.dayan.casa",
            "https://questkids.dayan.casa",
            "https://localhost",
            "http://localhost",
            "capacitor://localhost",
        )
        for required_origin in required_origins:
            if required_origin not in origins:
                origins.append(required_origin)
        return origins

    # File storage path
    UPLOAD_DIR: str = "./uploads"

    # SMTP settings for email verification
    SMTP_HOST: str = "localhost"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = "noreply@fundo.local"
    SMTP_USE_TLS: bool = True
    BASE_URL: str = "http://localhost:5173"
    APP_TIMEZONE: str = "Asia/Jerusalem"

    # Optional closed registration. When enabled, parent registration requires
    # REGISTRATION_INVITE_CODE to match the submitted invite_code.
    REGISTRATION_INVITE_ONLY: bool = False
    REGISTRATION_INVITE_CODE: str = ""

    # Browser push notifications. Set VAPID_PUBLIC_KEY/PRIVATE_KEY in production
    # to enable real device subscriptions.
    VAPID_PUBLIC_KEY: str = ""
    VAPID_PRIVATE_KEY: str = ""

    # Rate limiting
    RATE_LIMIT_ENABLED: bool = True

    # Backup
    BACKUP_DIR: str = "./backups"
    BACKUP_RETENTION_DAYS: int = 7

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
