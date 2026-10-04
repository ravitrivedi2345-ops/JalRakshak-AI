import io
from PIL import Image
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def create_test_image_bytes():
    buf = io.BytesIO()
    img = Image.new("RGB", (100, 100), color="green")
    img.save(buf, format="JPEG")
    buf.seek(0)
    return buf

def test_upload_image():
    img_buf = create_test_image_bytes()
    response = client.post(
        "/api/v1/images/upload",
        files={"file": ("test.jpg", img_buf, "image/jpeg")}
    )
    assert response.status_code == 200
    res = response.json()
    assert res["success"] is True
    assert "id" in res["data"]

def test_upload_field_photo_contract():
    img_buf = create_test_image_bytes()
    response = client.post(
        "/api/v1/field-photos",
        files={"image": ("test.jpg", img_buf, "image/jpeg")},
        data={"site_id": "barmer"}
    )
    assert response.status_code == 200
    res = response.json()
    assert "id" in res
    assert res["status"] == "received"
