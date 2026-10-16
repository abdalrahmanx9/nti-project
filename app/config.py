import os
import socket
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    APP_NAME: str = "NTI Cloud-Native DevOps Platform"
    APP_VERSION: str = "1.0.0"
    APP_ENV: str = os.getenv("APP_ENV", "development")
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))
    
    # Database Settings
    DB_HOST: str = os.getenv("DB_HOST", "localhost")
    DB_PORT: int = int(os.getenv("DB_PORT", "5432"))
    DB_USER: str = os.getenv("DB_USER", "postgres")
    DB_PASSWORD: str = os.getenv("DB_PASSWORD", "postgres")
    DB_NAME: str = os.getenv("DB_NAME", "ntiapp")
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")
    
    # Kubernetes Metadata (Downward API)
    POD_NAME: str = os.getenv("POD_NAME", socket.gethostname())
    POD_IP: str = os.getenv("POD_IP", "127.0.0.1")
    NODE_NAME: str = os.getenv("NODE_NAME", "local-node")
    NAMESPACE: str = os.getenv("NAMESPACE", "default")

    def get_database_url(self) -> str:
        """Returns PostgreSQL connection string (psycopg or asyncpg compatible)"""
        if self.DATABASE_URL:
            url = self.DATABASE_URL
            if url.startswith("postgres://"):
                url = url.replace("postgres://", "postgresql+asyncpg://", 1)
            elif url.startswith("postgresql://") and not url.startswith("postgresql+"):
                url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
            return url
        return f"postgresql+asyncpg://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"

settings = Settings()
