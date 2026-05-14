from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://postgres:password@localhost:5432/zorepeer"
    sync_database_url: str = "postgresql://postgres:password@localhost:5432/zorepeer"

    deepseek_api_key: str = ""
    deepseek_base_url: str = "https://api.deepseek.com"

    tavily_api_key: str = ""

    langsmith_api_key: str = ""
    langsmith_project: str = "zorepeer-competitive-intel"
    langchain_tracing_v2: bool = True

    mem0_api_key: str = ""

    redis_url: str = "redis://localhost:6379/0"

    sendgrid_api_key: str = ""
    sendgrid_from_email: str = "alerts@yourdomain.com"

    environment: str = "development"

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache
def get_settings() -> Settings:
    return Settings()
