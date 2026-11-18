import pytest
from fastapi.testclient import TestClient

from backend.app.database import make_engine
from backend.app.main import create_app
from backend.app.models import Base
from sqlalchemy.orm import sessionmaker


@pytest.fixture
def client(tmp_path):
    engine = make_engine(f"sqlite:///{(tmp_path / 'test.db').as_posix()}")
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
    app = create_app(factory, engine, initialize=True)
    with TestClient(app) as test_client:
        yield test_client
    engine.dispose()
