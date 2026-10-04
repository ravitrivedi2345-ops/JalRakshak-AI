from typing import List, Optional
from pydantic import BaseModel

class KPICard(BaseModel):
    label: str
    value: float
    suffix: str = ""
    delta: str
    tone: str = "forest"

class TrendSeriesPoint(BaseModel):
    month: str
    ndvi: float
    ndwi: float

class AlertItem(BaseModel):
    id: str
    title: str
    severity: str
    timestamp: str
    site_id: str

class RecentActivityItem(BaseModel):
    id: str
    title: str
    type: str
    actor: str
    timestamp: str

class DashboardSummary(BaseModel):
    kpis: List[KPICard]
    trends: List[TrendSeriesPoint]
    alerts: List[AlertItem]
    recent_activities: List[RecentActivityItem]
