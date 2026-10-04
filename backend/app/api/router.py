from fastapi import APIRouter
from app.api.v1.auth import router as auth_router
from app.api.v1.dashboard import router as dashboard_router
from app.api.v1.watersheds import router as watersheds_router
from app.api.v1.interventions import router as interventions_router
from app.api.v1.images import router as images_router
from app.api.v1.satellite import router as satellite_router
from app.api.v1.analysis import router as analysis_router
from app.api.v1.verification import router as verification_router
from app.api.v1.reports import router as reports_router
from app.api.v1.notifications import router as notifications_router
from app.api.v1.search import router as search_router
from app.api.v1.ai import router as ai_router

api_router = APIRouter()

api_router.include_router(auth_router)
api_router.include_router(dashboard_router)
api_router.include_router(watersheds_router)
api_router.include_router(interventions_router)
api_router.include_router(images_router)
api_router.include_router(satellite_router)
api_router.include_router(analysis_router)
api_router.include_router(verification_router)
api_router.include_router(reports_router)
api_router.include_router(notifications_router)
api_router.include_router(search_router)
api_router.include_router(ai_router)
