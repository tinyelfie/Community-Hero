import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/nagrik")
JWT_SECRET: str = os.getenv("JWT_SECRET", "fallback-secret-change-me")
JWT_ALGORITHM: str = "HS256"
JWT_EXPIRE_HOURS: int = 24

GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")

UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "uploads")
MAX_UPLOAD_SIZE_MB: int = int(os.getenv("MAX_UPLOAD_SIZE_MB", "5"))
APP_ENV: str = os.getenv("APP_ENV", "development")
GCS_BUCKET_NAME: str | None = os.getenv("GCS_BUCKET_NAME")
