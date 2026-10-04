from typing import Dict, Any
from fastapi import APIRouter
from app.core.exceptions import create_success_response, create_error_response

router = APIRouter(prefix="/notifications", tags=["Notifications"])

NOTIFICATIONS_DB: Dict[str, Dict[str, Any]] = {
    "notif-1": {
        "id": "notif-1",
        "title": "Field Check Due",
        "message": "Barmer Farm Pond sample verification is pending review.",
        "is_read": False,
        "created_at": "2026-10-04T01:00:00Z"
    },
    "notif-2": {
        "id": "notif-2",
        "title": "Satellite Pass Processed",
        "message": "New Sentinel-2 observation available for Luni Basin.",
        "is_read": False,
        "created_at": "2026-10-03T18:30:00Z"
    }
}

@router.get("")
def list_notifications():
    return create_success_response(data=list(NOTIFICATIONS_DB.values()))

@router.post("/{notification_id}/read")
def mark_as_read(notification_id: str):
    notif = NOTIFICATIONS_DB.get(notification_id)
    if not notif:
        return create_error_response(status_code=404, code="NOT_FOUND", message="Notification not found")
    notif["is_read"] = True
    return create_success_response(data=notif, message="Notification marked as read")

@router.post("/read-all")
def mark_all_as_read():
    for notif in NOTIFICATIONS_DB.values():
        notif["is_read"] = True
    return create_success_response(data=list(NOTIFICATIONS_DB.values()), message="All notifications marked as read")
