from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from app.core.security import verify_password, get_password_hash, create_access_token
from app.core.exceptions import create_success_response, create_error_response

router = APIRouter(prefix="/auth", tags=["Authentication"])

class LoginRequest(BaseModel):
    username: str
    password: str

@router.post("/login")
def login(payload: LoginRequest):
    # Support admin/demo default login
    if payload.username in ["admin", "officer", "ravi"] and payload.password in ["password", "demo", "admin123"]:
        token = create_access_token({"sub": payload.username, "role": "officer"})
        return create_success_response(
            data={
                "access_token": token,
                "token_type": "bearer",
                "user": {
                    "username": payload.username,
                    "full_name": "Ravi Trivedi",
                    "role": "National Program Officer"
                }
            },
            message="Logged in successfully"
        )
    return create_error_response(status_code=401, code="UNAUTHORIZED", message="Invalid username or password")

@router.post("/refresh")
def refresh_token():
    token = create_access_token({"sub": "officer", "role": "officer"})
    return create_success_response(data={"access_token": token, "token_type": "bearer"}, message="Token refreshed")

@router.post("/logout")
def logout():
    return create_success_response(data=None, message="Logged out successfully")

@router.get("/me")
def get_current_user_profile():
    return create_success_response(
        data={
            "username": "ravi",
            "full_name": "Ravi Trivedi",
            "role": "National Program Officer",
            "email": "ravi.trivedi@jalrakshak.gov.in"
        }
    )
