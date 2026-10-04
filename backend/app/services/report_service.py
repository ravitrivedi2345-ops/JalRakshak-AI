import os
import uuid
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from app.core.config import settings

def generate_pdf_report(scope: str = "Watershed overview", period: str = "This season") -> str:
    filename = f"report_{uuid.uuid4().hex[:8]}.pdf"
    file_path = os.path.join(settings.OUTPUT_DIR, filename)

    doc = SimpleDocTemplate(file_path, pagesize=letter, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36)
    story = []
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=colors.HexColor('#1b4931')
    )

    sub_style = ParagraphStyle(
        'DocSub',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=11,
        leading=14,
        textColor=colors.HexColor('#47815a')
    )

    body_style = ParagraphStyle(
        'DocBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#333333')
    )

    story.append(Paragraph("JalRakshak AI — Watershed Intelligence Report", title_style))
    story.append(Spacer(1, 6))
    story.append(Paragraph(f"Scope: <b>{scope}</b> | Period: <b>{period}</b> | Generated: {datetime.now().strftime('%d %B %Y')}", sub_style))
    story.append(Spacer(1, 14))

    story.append(Paragraph("<b>1. Program Summary & Indicators</b>", styles['Heading2']))
    table_data = [
        ["Indicator", "Value", "Status / Delta"],
        ["Watershed Sites Monitored", "12,480", "Illustrative sample"],
        ["Estimated Water Retained", "84.2 M m³", "Across sample basins"],
        ["Vegetation Health (NDVI)", "74 / 100", "Seasonal baseline"],
        ["Field Verification Queue", "420", "Checks due"]
    ]
    t = Table(table_data, colWidths=[200, 150, 150])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1b4931')),
        ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0,0), (-1,0), 6),
        ('BACKGROUND', (0,1), (-1,-1), colors.HexColor('#f4f7f3')),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#d9e7d9')),
    ]))
    story.append(t)
    story.append(Spacer(1, 14))

    story.append(Paragraph("<b>2. AI Evidence & Satellite Assessment</b>", styles['Heading2']))
    story.append(Paragraph(
        "AI intervention predictions and satellite vegetation trends support human verification. "
        "They are not proof of intervention success or certified environmental impact.",
        body_style
    ))
    story.append(Spacer(1, 14))

    story.append(Paragraph("<b>3. Field Verification & Governance</b>", styles['Heading2']))
    story.append(Paragraph(
        "Field inspection findings must be submitted by authorized officers before site records are updated to Verified status.",
        body_style
    ))

    doc.build(story)
    return file_path
