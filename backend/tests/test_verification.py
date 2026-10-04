import uuid
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_list_verification_tasks():
    response = client.get("/api/v1/verification/tasks")
    assert response.status_code == 200
    res = response.json()
    assert res["success"] is True
    assert isinstance(res["data"], list)

def test_create_and_submit_task():
    unique_site = f"site-{uuid.uuid4().hex[:8]}"
    create_res = client.post(
        "/api/v1/verification/tasks",
        json={"site_id": unique_site, "officer": "Priya Patel", "due_date": "2026-10-30", "observation": "Initial check"}
    )
    assert create_res.status_code == 201
    task_id = create_res.json()["data"]["id"]

    submit_res = client.post(
        f"/api/v1/verification/tasks/{task_id}/submit",
        json={"status": "verified", "observation": "Structure verified in field inspection", "attachments": []}
    )
    assert submit_res.status_code == 200
    assert submit_res.json()["data"]["status"] == "verified"
