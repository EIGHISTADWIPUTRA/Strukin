from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables / .env file.
    All values are required — the app will refuse to start if any are missing.
    """

    # Supabase
    SUPABASE_URL: str
    SUPABASE_SERVICE_ROLE_KEY: str
    SUPABASE_ANON_KEY: str  # needed as apikey header when fetching JWKS
    # SUPABASE_JWT_SECRET no longer needed — JWT is verified via JWKS (ES256)

    # Alibaba Cloud DashScope — Qwen3-VL (vision + language)
    DASHSCOPE_API_KEY: str
    DASHSCOPE_MODEL: str = "qwen3-vl-30b-a3b-instruct"

    # Server
    APP_ENV: str = "development"
    API_PREFIX: str = "/api/v1"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
    )


# Single instance used across the entire application
settings = Settings()
