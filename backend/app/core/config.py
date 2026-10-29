from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field
import os

class Settings(BaseSettings):
    APP_NAME: str = "AI Chatbot"
    APP_ENV: str = "development"
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    SECRET_KEY: str = "dev_secret_key_change_in_production_super_secure_random_string_32chars"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,http://127.0.0.1:3000"

    DATABASE_URL: str = "sqlite:///./ai_chatbot.db"

    # LLM settings
    LLM_PROVIDER: str = "mock"  # "openai", "gemini", "mock"
    LLM_MODEL: str = "gpt-4o-mini"
    LLM_API_KEY: Optional[str] = None
    LLM_TEMPERATURE: float = 0.7
    LLM_MAX_TOKENS: int = 2048
    MAX_HISTORY_MESSAGES: int = 10

    # RAG settings
    EMBEDDING_PROVIDER: str = "mock"  # "openai", "gemini", "mock"
    EMBEDDING_MODEL: str = "text-embedding-3-small"
    CHROMA_PERSIST_DIRECTORY: str = "./chroma_db"
    RAG_SIMILARITY_THRESHOLD: float = 0.3
    RAG_TOP_K: int = 4
    CHUNK_SIZE: int = 800
    CHUNK_OVERLAP: int = 150

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @property
    def cors_origins(self) -> List[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]

settings = Settings()

