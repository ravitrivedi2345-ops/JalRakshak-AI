from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_login_success():
    response = client.post("/api/v1/auth/login", json={"username": "ravi", "password": "password"})
    assert response.status_code == 200
    res = response.json()
    assert res["success"] is True
    assert "access_token" in res["data"]

def test_login_invalid():
    response = client.post("/api/v1/auth/login", json={"username": "ravi", "password": "wrong_password"})
    assert response.status_code == 401
    res = response.json()
    assert res["success"] is False
    assert res["error"]["code"] == "UNAUTHORIZED"
