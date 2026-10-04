from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_analyze_intervention_contract():
    response = client.post(
        "/api/v1/analyses/interventions",
        json={"photo_id": "test-photo-123"}
    )
    assert response.status_code == 200
    res = response.json()
    assert res["photo_id"] == "test-photo-123"
    assert res["status"] == "completed"
    assert isinstance(res["detections"], list)
    assert len(res["detections"]) > 0

def test_evidence_assessment():
    response = client.post("/api/v1/evidence/assess?site_id=barmer")
    assert response.status_code == 200
    res = response.json()
    assert res["success"] is True
    assert res["data"]["overall_score"] > 0
    assert "breakdown" in res["data"]
