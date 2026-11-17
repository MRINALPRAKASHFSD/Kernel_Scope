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
        session = session_factory()
        try:
            log_activity(session, action, category, "invalid", message[:500])
            session.commit()
        except Exception:
            session.rollback()
            logger.exception("Could not persist rejected-request activity")
        finally:
            session.close()

    @app.exception_handler(RequestValidationError)
    async def invalid_request(request: Request, exc: RequestValidationError):
        errors = exc.errors()
        message = "; ".join(f"{'.'.join(map(str, item.get('loc', ())))}: {item.get('msg', 'invalid input')}" for item in errors)
        record_rejected_request(request, "request.invalid", message or "Request validation failed")
        return JSONResponse(status_code=422, content=jsonable_encoder({"detail": errors}))

    @app.exception_handler(HTTPException)
    async def api_http_error(request: Request, exc: HTTPException):
        if exc.status_code in (404, 409, 422):
            record_rejected_request(request, "request.rejected", str(exc.detail))
        return JSONResponse(status_code=exc.status_code, content=jsonable_encoder({"detail": exc.detail}), headers=exc.headers)

    @app.exception_handler(Exception)
    async def safe_server_error(_request: Request, exc: Exception):
        logger.exception("Unhandled API error")
        return JSONResponse(status_code=500, content={"detail": "An internal server error occurred"})

    return app


app = create_app()
