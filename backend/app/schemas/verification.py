from typing import List, Optional
from pydantic import BaseModel

class TaskHistoryItem(BaseModel):
    status: str
    at: str
    by: Optional[str] = None

class VerificationTaskCreate(BaseModel):
    site_id: str
    officer: str
    due_date: str
    observation: Optional[str] = ""

class VerificationTaskAssign(BaseModel):
    officer: str
    due_date: Optional[str] = None

class VerificationTaskSubmit(BaseModel):
    status: str  # "submitted", "verified", "rejected"
    observation: str
    attachments: Optional[List[str]] = []

class VerificationTask(BaseModel):
    id: str
    site_id: str
    officer: str
    due_date: str
    status: str  # "pending", "assigned", "in_progress", "submitted", "verified", "rejected"
    observation: str
    attachments: List[str]
    history: List[TaskHistoryItem]
