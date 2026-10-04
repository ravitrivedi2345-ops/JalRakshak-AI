import os
from typing import Optional
from fastapi import APIRouter, Depends
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.report import Report
from app.core.exceptions import create_success_response, create_error_response
from app.services.report_service import generate_pdf_report

router = APIRouter(prefix="/reports", tags=["Reports"])

class ReportGenerateRequest(BaseModel):
    scope: Optional[str] = "Watershed overview"
    period: Optional[str] = "This season"

def _serialize_report(report: Report):
    return {
        "id": report.id,
        "scope": report.scope,
        "period": report.period,
        "filename": report.filename,
        "status": report.status,
        "created_at": report.created_at.isoformat() if report.created_at else None
    }

@router.post("/generate")
def generate_report(payload: ReportGenerateRequest, db: Session = Depends(get_db)):
    pdf_path = generate_pdf_report(payload.scope, payload.period)
    filename = os.path.basename(pdf_path)
    report_id = filename.replace(".pdf", "").replace("report_", "")

    report = Report(
        id=report_id,
        scope=payload.scope or "Watershed overview",
        period=payload.period or "This season",
        file_path=pdf_path,
        filename=filename,
        status="completed"
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    return create_success_response(
        data=_serialize_report(report),
        message="PDF report generated successfully",
        status_code=201
    )

@router.get("")
def list_reports(db: Session = Depends(get_db)):
    reports = db.query(Report).order_by(Report.created_at.desc()).all()
    return create_success_response(data=[_serialize_report(r) for r in reports])

@router.get("/{report_id}")
def get_report(report_id: str, db: Session = Depends(get_db)):
    report = db.query(Report).filter_by(id=report_id).first()
    if not report:
        return create_error_response(status_code=404, code="NOT_FOUND", message="Report not found")
    return create_success_response(data=_serialize_report(report))

@router.get("/{report_id}/download")
def download_report(report_id: str, db: Session = Depends(get_db)):
    report = db.query(Report).filter_by(id=report_id).first()
    if not report or not os.path.exists(report.file_path):
        pdf_path = generate_pdf_report()
        return FileResponse(pdf_path, media_type="application/pdf", filename="JalRakshak_Watershed_Report.pdf")
    return FileResponse(report.file_path, media_type="application/pdf", filename=report.filename)
