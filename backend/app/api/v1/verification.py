from datetime import datetime, timezone
from typing import Dict, Any, List
from fastapi import APIRouter
from app.core.exceptions import create_success_response, create_error_response
from app.schemas.verification import VerificationTaskCreate, VerificationTaskAssign, VerificationTaskSubmit

router = APIRouter(prefix="/verification/tasks", tags=["Field Verification"])

TASKS_DB: Dict[str, Dict[str, Any]] = {
    "task-barmer": {
        "id": "task-barmer",
        "site_id": "barmer",
        "officer": "Ravi Trivedi",
        "due_date": "2026-10-15",
        "status": "assigned",
        "observation": "Initial satellite signal needs site confirmation.",
        "attachments": [],
        "history": [{"status": "assigned", "at": "2026-10-01T10:00:00Z", "by": "Admin"}]
    }
}

@router.get("")
def list_tasks():
    return create_success_response(data=list(TASKS_DB.values()))

@router.post("")
def create_task(payload: VerificationTaskCreate):
    task_id = f"task-{payload.site_id}"
    task = {
        "id": task_id,
        "site_id": payload.site_id,
        "officer": payload.officer,
        "due_date": payload.due_date,
        "status": "assigned",
        "observation": payload.observation or "",
        "attachments": [],
        "history": [{"status": "assigned", "at": datetime.now(timezone.utc).isoformat(), "by": payload.officer}]
    }
    TASKS_DB[task_id] = task
    return create_success_response(data=task, message="Verification task created successfully", status_code=201)

@router.get("/{task_id}")
def get_task(task_id: str):
    task = TASKS_DB.get(task_id)
    if not task:
        return create_error_response(status_code=404, code="NOT_FOUND", message="Verification task not found")
    return create_success_response(data=task)

@router.post("/{task_id}/assign")
def assign_officer(task_id: str, payload: VerificationTaskAssign):
    task = TASKS_DB.get(task_id)
    if not task:
        return create_error_response(status_code=404, code="NOT_FOUND", message="Verification task not found")
    task["officer"] = payload.officer
    if payload.due_date:
        task["due_date"] = payload.due_date
    task["history"].append({"status": task["status"], "at": datetime.now(timezone.utc).isoformat(), "by": payload.officer})
    return create_success_response(data=task, message="Task reassigned successfully")

@router.post("/{task_id}/submit")
def submit_inspection(task_id: str, payload: VerificationTaskSubmit):
    task = TASKS_DB.get(task_id)
    if not task:
        return create_error_response(status_code=404, code="NOT_FOUND", message="Verification task not found")
    task["status"] = payload.status
    task["observation"] = payload.observation
    if payload.attachments:
        task["attachments"].extend(payload.attachments)
    task["history"].append({"status": payload.status, "at": datetime.now(timezone.utc).isoformat(), "by": task["officer"]})
    return create_success_response(data=task, message="Inspection submitted successfully")
