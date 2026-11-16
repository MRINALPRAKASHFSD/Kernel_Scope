"""Environment-backed application configuration."""
import os
from pathlib import Path

from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parents[2]
load_dotenv(PROJECT_ROOT / ".env")

DEFAULT_DB = (PROJECT_ROOT / "backend" / "data" / "os_resource_lab.db").as_posix()
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DEFAULT_DB}")
CORS_ORIGINS = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
    if origin.strip()
]
