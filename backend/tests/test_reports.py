from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_generate_and_download_report():
    gen_res = client.post("/api/v1/reports/generate", json={"scope": "Priority verification queue", "period": "This season"})
    assert gen_res.status_code == 201
    res_data = gen_res.json()
    assert res_data["success"] is True
    report_id = res_data["data"]["id"]

    dl_res = client.get(f"/api/v1/reports/{report_id}/download")
    assert dl_res.status_code == 200
    assert dl_res.headers["content-type"] == "application/pdf"
