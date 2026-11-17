"""FastAPI application factory and local ASGI entry point."""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from . import api
from .config import CORS_ORIGINS
from .database import SessionLocal, engine
from .models import Base
from .seed import seed
from .services import log_activity

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
logger = logging.getLogger("os_resource_lab")


def create_app(session_factory=SessionLocal, db_engine=engine, initialize=True):
    @asynccontextmanager
    async def lifespan(_app):
        if initialize:
            Base.metadata.create_all(db_engine)
            seed(session_factory, db_engine)
        yield

    app = FastAPI(title="OS Resource Lab API", version="1.0.0", description="Persistent API over the verified os_sim Python engine", lifespan=lifespan)
    app.state.session_factory = session_factory
    app.state.database_engine = db_engine
    app.add_middleware(CORSMiddleware, allow_origins=CORS_ORIGINS, allow_credentials=False, allow_methods=["GET", "POST", "PUT", "DELETE"], allow_headers=["*"])
    app.include_router(api.router)

    def override_get_db():
        session = session_factory()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[api.get_db] = override_get_db

    def record_rejected_request(request: Request, action: str, message: str):
        path = request.url.path
        category = next((item for item in ("cpu", "memory", "deadlock", "disk", "integrated") if f"/simulations/{item}" in path), "dataset" if "/datasets" in path else "api")
