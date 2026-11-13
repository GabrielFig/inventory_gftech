from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    project_name: str = "GF-Tech LM — Inventario"
    environment: str = "development"

    database_url: str = "postgresql+asyncpg://gftech:gftech@localhost:5432/gftech_inventario"
    db_ssl_require: bool = False

    secret_key: str = "change-me-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 12
    # Sesión larga para el celular: se renueva en cada desbloqueo con huella.
    refresh_token_expire_days: int = 90

    cors_origins: list[str] = ["http://localhost:3000"]

    low_stock_threshold: int = 2


settings = Settings()
