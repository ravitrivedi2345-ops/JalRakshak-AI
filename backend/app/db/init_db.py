import json
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.db.session import engine, Base
from app.models.user import User
from app.models.watershed import Watershed
from app.models.intervention import Intervention
from app.models.verification import VerificationTaskModel
from app.models.notification import Notification
from app.core.security import get_password_hash

def init_db(db: Session):
    Base.metadata.create_all(bind=engine)

    # Seed User
    if db.query(User).count() == 0:
        db.add(User(
            username="ravi",
            email="ravi.trivedi@jalrakshak.gov.in",
            full_name="Ravi Trivedi",
            role="officer",
            hashed_password=get_password_hash("password123")
        ))

    # Seed Watersheds
    if db.query(Watershed).count() == 0:
        db.add(Watershed(
            id="ws-1",
            name="Luni River Sub-basin",
            district="Barmer",
            state="Rajasthan",
            area_sq_km=1420.5,
            center_latitude=25.75,
            center_longitude=71.38,
            boundary_geojson=json.dumps({
                "type": "Feature",
                "properties": {"id": "ws-1", "name": "Luni River Sub-basin"},
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[[68.1, 23.2], [72.4, 19.1], [77.1, 8.1], [88.2, 22.1], [68.1, 23.2]]]
                }
            })
        ))
        db.add(Watershed(
            id="ws-2",
            name="Brahmaputra Sub-basin",
            district="Darrang",
            state="Assam",
            area_sq_km=890.0,
            center_latitude=26.45,
            center_longitude=92.02,
            boundary_geojson=json.dumps({
                "type": "Feature",
                "properties": {"id": "ws-2", "name": "Brahmaputra Sub-basin"},
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[[91.0, 26.0], [93.0, 26.0], [93.0, 27.0], [91.0, 27.0], [91.0, 26.0]]]
                }
            })
        ))

    # Seed Interventions
    if db.query(Intervention).count() == 0:
        sites = [
            {"id": "barmer", "name": "Barmer Farm Pond", "district": "Barmer · Rajasthan", "kind": "Farm pond", "status": "Needs verification", "score": 82, "reason": "Seasonal water spread needs a local field check", "longitude": 71.38, "latitude": 25.75, "photo_url": "/images/barmer_farm_pond.jpg", "watershed_id": "ws-1"},
            {"id": "darrang", "name": "Darrang Check Dam", "district": "Darrang · Assam", "kind": "Check dam", "status": "Needs verification", "score": 76, "reason": "Recent field photo needs a site-location cross-check", "longitude": 92.02, "latitude": 26.45, "photo_url": "/images/darrang_check_dam.jpg", "watershed_id": "ws-2"},
            {"id": "kolar", "name": "Kolar Plantation Watch", "district": "Kolar · Karnataka", "kind": "Plantation", "status": "Monitoring", "score": 91, "reason": "Vegetation trend is above its illustrative seasonal baseline", "longitude": 78.13, "latitude": 13.14, "photo_url": "/images/kolar_plantation.jpg", "watershed_id": "ws-1"},
            {"id": "koraput", "name": "Koraput Erosion Watch", "district": "Koraput · Odisha", "kind": "Erosion risk", "status": "Needs verification", "score": 71, "reason": "Exposed soil signal needs confirmation by a field team", "longitude": 82.72, "latitude": 18.81, "photo_url": "/images/barmer_farm_pond.jpg", "watershed_id": "ws-1"},
            {"id": "kangra", "name": "Kangra Spring Recharge", "district": "Kangra · Himachal Pradesh", "kind": "Check dam", "status": "Monitoring", "score": 88, "reason": "Spring recharge signal is within seasonal range", "longitude": 76.27, "latitude": 32.10, "photo_url": "/images/kangra_spring_recharge.jpg", "watershed_id": "ws-1"},
            {"id": "chitrakoot", "name": "Chitrakoot Farm Pond", "district": "Chitrakoot · Uttar Pradesh", "kind": "Farm pond", "status": "Needs verification", "score": 79, "reason": "Water presence estimate differs from last review", "longitude": 80.87, "latitude": 25.20, "photo_url": "/images/barmer_farm_pond.jpg", "watershed_id": "ws-1"},
            {"id": "bastar", "name": "Bastar Plantation Watch", "district": "Bastar · Chhattisgarh", "kind": "Plantation", "status": "Monitoring", "score": 86, "reason": "Vegetation recovery estimate is improving this season", "longitude": 81.95, "latitude": 19.10, "photo_url": "/images/kolar_plantation.jpg", "watershed_id": "ws-1"},
        ]
        for s in sites:
            db.add(Intervention(**s))

    # Seed Verification Tasks
    if db.query(VerificationTaskModel).count() == 0:
        db.add(VerificationTaskModel(
            id="task-barmer",
            site_id="barmer",
            officer="Ravi Trivedi",
            due_date="2026-10-15",
            status="assigned",
            observation="Initial satellite signal needs site confirmation.",
            attachments_json=json.dumps([]),
            history_json=json.dumps([{"status": "assigned", "at": "2026-10-01T10:00:00Z", "by": "Admin"}])
        ))
        db.add(VerificationTaskModel(
            id="task-darrang",
            site_id="darrang",
            officer="Priya Patel",
            due_date="2026-10-20",
            status="assigned",
            observation="Location cross-check pending.",
            attachments_json=json.dumps([]),
            history_json=json.dumps([{"status": "assigned", "at": "2026-10-02T11:00:00Z", "by": "Admin"}])
        ))

    # Seed Notifications
    if db.query(Notification).count() == 0:
        db.add(Notification(
            id="notif-1",
            title="Field Check Due",
            message="Barmer Farm Pond sample verification is pending review.",
            is_read=False,
            created_at=datetime.now(timezone.utc)
        ))
        db.add(Notification(
            id="notif-2",
            title="Satellite Pass Processed",
            message="New Sentinel-2 observation available for Luni Basin.",
            is_read=False,
            created_at=datetime.now(timezone.utc)
        ))

    db.commit()
