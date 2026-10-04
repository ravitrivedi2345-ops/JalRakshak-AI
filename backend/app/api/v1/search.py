from fastapi import APIRouter
from app.core.exceptions import create_success_response
from app.api.v1.watersheds import SAMPLE_SITES

router = APIRouter(tags=["Search"])

@router.get("/search")
def search(q: str = ""):
    query = q.lower().strip()
    matching_sites = [
        s for s in SAMPLE_SITES
        if not query or query in s["name"].lower() or query in s["district"].lower() or query in s["kind"].lower()
    ]
    return create_success_response(
        data={
            "query": q,
            "sites": matching_sites,
            "watersheds": [{"id": "ws-1", "name": "Luni River Sub-basin"}] if "luni" in query or not query else []
        }
    )
