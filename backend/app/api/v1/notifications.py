from typing import Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.notification import Notification
from app.core.exceptions import create_success_response, create_error_response

router = APIRouter(prefix="/notifications", tags=["Notifications"])

def _serialize_notification(notif: Notification):
    return {
        "id": notif.id,
        "title": notif.title,
        "message": notif.message,
        "is_read": notif.is_read,
        "created_at": notif.created_at.isoformat() if notif.created_at else None
    }

@router.get("")
def list_notifications(db: Session = Depends(get_db)):
    notifications = db.query(Notification).order_by(Notification.created_at.desc()).all()
    return create_success_response(data=[_serialize_notification(n) for n in notifications])

@router.post("/{notification_id}/read")
def mark_as_read(notification_id: str, db: Session = Depends(get_db)):
    notif = db.query(Notification).filter_by(id=notification_id).first()
    if not notif:
        return create_error_response(status_code=404, code="NOT_FOUND", message="Notification not found")
    notif.is_read = True
    db.commit()
    db.refresh(notif)
    return create_success_response(data=_serialize_notification(notif), message="Notification marked as read")

@router.post("/read-all")
def mark_all_as_read(db: Session = Depends(get_db)):
    notifications = db.query(Notification).all()
    for notif in notifications:
        notif.is_read = True
    db.commit()
    return create_success_response(data=[_serialize_notification(n) for n in notifications], message="All notifications marked as read")
