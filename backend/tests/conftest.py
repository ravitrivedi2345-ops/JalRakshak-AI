import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db.session import engine, Base, SessionLocal
from app.db.init_db import init_db

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        init_db(db)
    finally:
        db.close()
    yield

@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c
