import os
from typing import Optional
from fastapi import APIRouter
from fastapi.responses import FileResponse
from pydantic import BaseModel
from app.core.exceptions import create_success_response, create_error_response
from app.services.report_service import generate_pdf_report

router = APIRouter(prefix="/reports", tags=["Reports"])

class ReportGenerateRequest(BaseModel):
    scope: Optional[str] = "Watershed overview"
    period: Optional[str] = "This season"

REPORTS_DB = {}

@router.post("/generate")
def generate_report(payload: ReportGenerateRequest):
    pdf_path = generate_pdf_report(payload.scope, payload.period)
    filename = os.path.basename(pdf_path)
    report_id = filename.replace(".pdf", "").replace("report_", "")

    report_meta = {
        "id": report_id,
        "scope": payload.scope,
        "period": payload.period,
        "file_path": pdf_path,
        "filename": filename,
        "status": "completed"
    }
    REPORTS_DB[report_id] = report_meta

    return create_success_response(
        data=report_meta,
        message="PDF report generated successfully",
        status_code=201
    )

@router.get("")
def list_reports():
    return create_success_response(data=list(REPORTS_DB.values()))

@router.get("/{report_id}")
def get_report(report_id: str):
    report = REPORTS_DB.get(report_id)
    if not report:
        return create_error_response(status_code=404, code="NOT_FOUND", message="Report not found")
    return create_success_response(data=report)

@router.get("/{report_id}/download")
def download_report(report_id: str):
    report = REPORTS_DB.get(report_id)
    if not report or not os.path.exists(report["file_path"]):
        # Generate on the fly if requested
        pdf_path = generate_pdf_report()
        return FileResponse(pdf_path, media_type="application/pdf", filename="JalRakshak_Watershed_Report.pdf")
    return FileResponse(report["file_path"], media_type="application/pdf", filename=report["filename"])
