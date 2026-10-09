from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional
from app.core.security import verify_password, get_password_hash, create_access_token
from app.core.exceptions import create_success_response, create_error_response

router = APIRouter(prefix="/auth", tags=["Authentication"])

class LoginRequest(BaseModel):
    username: str
    password: str
    requested_role: Optional[str] = None  # "admin", "verifier", "viewer"

DEMO_USERS = {
    "admin": {
        "username": "admin",
        "full_name": "Dr. Ananya Sharma",
        "role": "Admin",
        "role_code": "admin",
        "email": "admin@jalrakshak.gov.in",
        "permissions": ["all", "verify_tasks", "manage_users", "export_reports", "edit_sites"]
    },
    "verifier": {
        "username": "verifier",
        "full_name": "Ravi Trivedi",
        "role": "Field Verifier",
        "role_code": "verifier",
        "email": "verifier@jalrakshak.gov.in",
        "permissions": ["verify_tasks", "upload_evidence", "view_reports"]
    },
    "officer": {
        "username": "officer",
        "full_name": "Ravi Trivedi",
        "role": "Field Verifier",
        "role_code": "verifier",
        "email": "officer@jalrakshak.gov.in",
        "permissions": ["verify_tasks", "upload_evidence", "view_reports"]
    },
    "viewer": {
        "username": "viewer",
        "full_name": "Public Stakeholder",
        "role": "Viewer",
        "role_code": "viewer",
        "email": "public@jalrakshak.gov.in",
        "permissions": ["view_dashboard", "view_map", "view_reports"]
    }
}

@router.post("/login")
def login(payload: LoginRequest):
    uname = payload.username.lower().strip()

    # Match user or fallback to requested role
    user_info = DEMO_USERS.get(uname)
    if not user_info and payload.requested_role in DEMO_USERS:
        user_info = DEMO_USERS[payload.requested_role]

    if not user_info:
        # Default fallback for custom usernames
        user_info = {
            "username": payload.username,
            "full_name": payload.username.capitalize(),
            "role": "Field Verifier",
            "role_code": "verifier",
            "email": f"{payload.username}@jalrakshak.gov.in",
            "permissions": ["verify_tasks", "upload_evidence"]
        }

    token = create_access_token({
        "sub": user_info["username"],
        "role": user_info["role_code"],
        "permissions": user_info["permissions"]
    })

    return create_success_response(
        data={
            "access_token": token,
            "token_type": "bearer",
            "user": user_info
        },
        message=f"Logged in successfully as {user_info['role']}"
    )

@router.get("/roles")
def list_available_roles():
    """List available RBAC system roles and their permission scopes."""
    return create_success_response(data=[
        {
            "role_code": "admin",
            "name": "Super Administrator",
            "description": "Full administrative control over watersheds, sites, user permissions, and verified outcomes."
        },
        {
            "role_code": "verifier",
            "name": "Field Verification Officer",
            "description": "Authorized field staff able to submit ground photo evidence, conduct audits, and approve/reject verification tasks."
        },
        {
            "role_code": "viewer",
            "name": "Public / Regional Auditor",
            "description": "Read-only access to GIS maps, satellite analytics, and public watershed summary reports."
        }
    ])

@router.post("/refresh")
def refresh_token():
    token = create_access_token({"sub": "verifier", "role": "verifier"})
    return create_success_response(data={"access_token": token, "token_type": "bearer"}, message="Token refreshed")

@router.post("/logout")
def logout():
    return create_success_response(data=None, message="Logged out successfully")

@router.get("/me")
def get_current_user_profile():
    return create_success_response(data=DEMO_USERS["verifier"])

