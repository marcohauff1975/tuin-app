from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_prefix="PLANTNET_", extra="ignore")

    mode: str = "mock"
    api_key: str = ""


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
