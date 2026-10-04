import json
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.verification import VerificationTaskModel
from app.core.exceptions import create_success_response, create_error_response
from app.schemas.verification import VerificationTaskCreate, VerificationTaskAssign, VerificationTaskSubmit

router = APIRouter(prefix="/verification/tasks", tags=["Field Verification"])

def _serialize_task(task: VerificationTaskModel):
    try:
        attachments = json.loads(task.attachments_json) if task.attachments_json else []
    except Exception:
        attachments = []
    try:
        history = json.loads(task.history_json) if task.history_json else []
    except Exception:
        history = []

    return {
        "id": task.id,
        "site_id": task.site_id,
        "officer": task.officer,
        "due_date": task.due_date,
        "status": task.status,
        "observation": task.observation or "",
        "attachments": attachments,
        "history": history,
        "created_at": task.created_at.isoformat() if task.created_at else None,
        "updated_at": task.updated_at.isoformat() if task.updated_at else None
    }

@router.get("")
def list_tasks(db: Session = Depends(get_db)):
    tasks = db.query(VerificationTaskModel).order_by(VerificationTaskModel.created_at.desc()).all()
    return create_success_response(data=[_serialize_task(t) for t in tasks])

@router.post("")
def create_task(payload: VerificationTaskCreate, db: Session = Depends(get_db)):
    task_id = f"task-{payload.site_id}"
    existing = db.query(VerificationTaskModel).filter_by(id=task_id).first()
    history = [{"status": "assigned", "at": datetime.now(timezone.utc).isoformat(), "by": payload.officer}]

    if existing:
        existing.officer = payload.officer
        existing.due_date = payload.due_date
        existing.observation = payload.observation or ""
        existing.history_json = json.dumps(history)
        db.commit()
        db.refresh(existing)
        return create_success_response(data=_serialize_task(existing), message="Verification task updated", status_code=200)

    task = VerificationTaskModel(
        id=task_id,
        site_id=payload.site_id,
        officer=payload.officer,
        due_date=payload.due_date,
        status="assigned",
        observation=payload.observation or "",
        attachments_json=json.dumps([]),
        history_json=json.dumps(history)
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return create_success_response(data=_serialize_task(task), message="Verification task created successfully", status_code=201)

@router.get("/{task_id}")
def get_task(task_id: str, db: Session = Depends(get_db)):
    task = db.query(VerificationTaskModel).filter_by(id=task_id).first()
    if not task:
        return create_error_response(status_code=404, code="NOT_FOUND", message="Verification task not found")
    return create_success_response(data=_serialize_task(task))

@router.post("/{task_id}/assign")
def assign_officer(task_id: str, payload: VerificationTaskAssign, db: Session = Depends(get_db)):
    task = db.query(VerificationTaskModel).filter_by(id=task_id).first()
    if not task:
        return create_error_response(status_code=404, code="NOT_FOUND", message="Verification task not found")

    try:
        history = json.loads(task.history_json) if task.history_json else []
    except Exception:
        history = []

    task.officer = payload.officer
    if payload.due_date:
        task.due_date = payload.due_date

    history.append({"status": task.status, "at": datetime.now(timezone.utc).isoformat(), "by": payload.officer})
    task.history_json = json.dumps(history)

    db.commit()
    db.refresh(task)
    return create_success_response(data=_serialize_task(task), message="Task reassigned successfully")

@router.post("/{task_id}/submit")
def submit_inspection(task_id: str, payload: VerificationTaskSubmit, db: Session = Depends(get_db)):
    task = db.query(VerificationTaskModel).filter_by(id=task_id).first()
    if not task:
        return create_error_response(status_code=404, code="NOT_FOUND", message="Verification task not found")

    try:
        attachments = json.loads(task.attachments_json) if task.attachments_json else []
    except Exception:
        attachments = []
    try:
        history = json.loads(task.history_json) if task.history_json else []
    except Exception:
        history = []

    task.status = payload.status
    task.observation = payload.observation
    if payload.attachments:
        attachments.extend(payload.attachments)
        task.attachments_json = json.dumps(attachments)

    history.append({"status": payload.status, "at": datetime.now(timezone.utc).isoformat(), "by": task.officer})
    task.history_json = json.dumps(history)

    db.commit()
    db.refresh(task)
    return create_success_response(data=_serialize_task(task), message="Inspection submitted successfully")
