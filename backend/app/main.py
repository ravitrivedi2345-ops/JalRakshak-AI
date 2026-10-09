import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.exceptions import APIException
from app.api.router import api_router
from app.db.session import SessionLocal, get_db
from app.db.init_db import init_db

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB tables and seed default records
    db = SessionLocal()
    try:
        init_db(db)
    finally:
        db.close()
    yield

app = FastAPI(
    title=settings.APP_NAME,
    description="JalRakshak AI — Backend API for Intelligent Watershed Monitoring, Satellite Analysis & Field Verification",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Exception Handler
@app.exception_handler(APIException)
async def api_exception_handler(request: Request, exc: APIException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": {
                "code": exc.code,
                "message": exc.message
            }
        }
    )

# Static file serving for uploads (skip on Vercel serverless — no persistent disk)
if settings.APP_ENV != "production" or os.environ.get("VERCEL") is None:
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    os.makedirs(settings.OUTPUT_DIR, exist_ok=True)
    app.mount("/storage/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")
    app.mount("/storage/outputs", StaticFiles(directory=settings.OUTPUT_DIR), name="outputs")

# Include Routers
app.include_router(api_router, prefix=settings.API_V1_PREFIX)

@app.get("/health", tags=["Health"])
@app.get(f"{settings.API_V1_PREFIX}/health", tags=["Health"])
def health_check(db: Session = Depends(get_db)):
    db_status = "connected"
    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"unhealthy ({str(e)})"

    ai_weights_exist = os.path.exists(settings.AI_MODEL_PATH)
    ai_status = "active (YOLO weights loaded)" if ai_weights_exist else "active (demo adapter)"

    from app.services.gemini_service import get_status as gemini_get_status
    gemini_info = gemini_get_status()

    is_healthy = db_status == "connected"

    return {
        "success": is_healthy,
        "data": {
            "status": "healthy" if is_healthy else "degraded",
            "app_name": settings.APP_NAME,
            "environment": settings.APP_ENV,
            "database": db_status,
            "satellite_provider": settings.SATELLITE_PROVIDER,
            "ai_detector": ai_status,
            "gemini": gemini_info,
        },
        "message": "Backend service is operating normally" if is_healthy else "Database connectivity check failed"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
