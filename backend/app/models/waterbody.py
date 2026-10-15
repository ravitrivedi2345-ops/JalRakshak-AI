import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, DateTime, Text, Boolean, ForeignKey, Integer
from sqlalchemy.orm import relationship
from app.db.session import Base

class Waterbody(Base):
    __tablename__ = "waterbodies"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, index=True, nullable=False)
    district = Column(String, index=True, nullable=False, default="Patna")
    state = Column(String, index=True, nullable=False, default="Bihar")
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    boundary_geojson = Column(Text, nullable=True)  # GeoJSON Polygon / MultiPolygon
    waterbody_type = Column(String, nullable=False, default="pond")  # pond, lake, reservoir, wetland, tank
    area_hectares = Column(Float, nullable=True)
    inspection_status = Column(
        String,
        nullable=False,
        default="not_inspected"
    )  # not_inspected, pending, verified, action_required, restoration_in_progress
    priority = Column(String, nullable=False, default="medium")  # low, medium, high
    priority_reason = Column(Text, nullable=True)
    last_inspected_at = Column(DateTime(timezone=True), nullable=True)
    data_source = Column(String, nullable=False, default="OpenStreetMap / Bihar State Wetland Authority")
    is_verified_boundary = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    inspections = relationship("WaterbodyInspection", back_populates="waterbody", cascade="all, delete-orphan", order_by="desc(WaterbodyInspection.inspection_date)")
    measurements = relationship("WaterbodyMeasurement", back_populates="waterbody", cascade="all, delete-orphan", order_by="desc(WaterbodyMeasurement.measurement_date)")
    restorations = relationship("WaterbodyRestoration", back_populates="waterbody", cascade="all, delete-orphan", order_by="desc(WaterbodyRestoration.start_date)")
    photos = relationship("WaterbodyFieldPhoto", back_populates="waterbody", cascade="all, delete-orphan", order_by="desc(WaterbodyFieldPhoto.taken_at)")
    change_detections = relationship("WaterbodyChangeDetection", back_populates="waterbody", cascade="all, delete-orphan", order_by="desc(WaterbodyChangeDetection.created_at)")
    bathymetry_readings = relationship("WaterbodyBathymetryReading", back_populates="waterbody", cascade="all, delete-orphan", order_by="desc(WaterbodyBathymetryReading.reading_date)")


class WaterbodyInspection(Base):
    __tablename__ = "waterbody_inspections"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    waterbody_id = Column(String, ForeignKey("waterbodies.id"), nullable=False, index=True)
    inspection_date = Column(DateTime(timezone=True), nullable=False)
    status = Column(String, nullable=False)  # pending, verified, action_required, restoration_in_progress
    observations = Column(Text, nullable=False)
    inspector_name = Column(String, nullable=False)
    inspector_role = Column(String, nullable=False, default="Field Officer")
    confidence_score = Column(Float, nullable=False, default=85.0)
    recommended_action = Column(Text, nullable=True)
    is_demo_data = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    waterbody = relationship("Waterbody", back_populates="inspections")


class WaterbodyMeasurement(Base):
    __tablename__ = "waterbody_measurements"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    waterbody_id = Column(String, ForeignKey("waterbodies.id"), nullable=False, index=True)
    measurement_date = Column(DateTime(timezone=True), nullable=False)
    water_spread_area_ha = Column(Float, nullable=False)
    water_spread_percentage = Column(Float, nullable=True)  # % of maximum capacity
    source = Column(String, nullable=False)  # e.g. "Sentinel-2 L2A NDWI", "Ground GPS Survey"
    source_type = Column(String, nullable=False, default="satellite")  # satellite, field, drone
    notes = Column(Text, nullable=True)
    is_demo_data = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    waterbody = relationship("Waterbody", back_populates="measurements")


class WaterbodyRestoration(Base):
    __tablename__ = "waterbody_restorations"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    waterbody_id = Column(String, ForeignKey("waterbodies.id"), nullable=False, index=True)
    activity_type = Column(String, nullable=False)  # De-siltation, Inflow Clearing, Weed Removal, etc.
    description = Column(Text, nullable=False)
    start_date = Column(DateTime(timezone=True), nullable=False)
    completion_date = Column(DateTime(timezone=True), nullable=True)
    status = Column(String, nullable=False, default="in_progress")  # planned, in_progress, completed
    outcome = Column(Text, nullable=True)
    budget_inr = Column(Float, nullable=True)
    is_demo_data = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    waterbody = relationship("Waterbody", back_populates="restorations")


class WaterbodyFieldPhoto(Base):
    __tablename__ = "waterbody_field_photos"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    waterbody_id = Column(String, ForeignKey("waterbodies.id"), nullable=False, index=True)
    photo_url = Column(String, nullable=False)
    caption = Column(Text, nullable=False)
    taken_at = Column(DateTime(timezone=True), nullable=False)
    photographer = Column(String, nullable=False)
    is_verified_exif = Column(Boolean, default=True)
    is_demo_data = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    waterbody = relationship("Waterbody", back_populates="photos")


class WaterbodyChangeDetection(Base):
    __tablename__ = "waterbody_change_detections"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    waterbody_id = Column(String, ForeignKey("waterbodies.id"), nullable=False, index=True)
    earlier_date = Column(String, nullable=False)
    later_date = Column(String, nullable=False)
    ndwi_threshold = Column(Float, nullable=False, default=0.0)
    tolerance_pct = Column(Float, nullable=False, default=3.0)

    earlier_area_ha = Column(Float, nullable=False)
    later_area_ha = Column(Float, nullable=False)
    change_ha = Column(Float, nullable=False)
    change_pct = Column(Float, nullable=True)

    classification = Column(String, nullable=False)  # shrinkage, expansion, stable, inconclusive
    classification_reason = Column(Text, nullable=False)
    confidence_score = Column(Float, nullable=False, default=90.0)

    earlier_cloud_cover_pct = Column(Float, nullable=False, default=0.0)
    later_cloud_cover_pct = Column(Float, nullable=False, default=0.0)
    earlier_valid_coverage_pct = Column(Float, nullable=False, default=100.0)
    later_valid_coverage_pct = Column(Float, nullable=False, default=100.0)

    satellite_sensor = Column(String, nullable=False, default="Sentinel-2 MSI Level-2A")
    data_source = Column(String, nullable=False, default="Copernicus Sentinel-2 Surface Reflectance (L2A)")

    earlier_true_color_url = Column(Text, nullable=True)
    later_true_color_url = Column(Text, nullable=True)
    earlier_ndwi_mask_url = Column(Text, nullable=True)
    later_ndwi_mask_url = Column(Text, nullable=True)
    diff_map_url = Column(Text, nullable=True)

    metadata_json = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    waterbody = relationship("Waterbody", back_populates="change_detections")


class WaterbodyBathymetryReading(Base):
    __tablename__ = "waterbody_bathymetry_readings"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    waterbody_id = Column(String, ForeignKey("waterbodies.id"), nullable=False, index=True)
    reading_date = Column(DateTime(timezone=True), nullable=False)
    water_level_m = Column(Float, nullable=False)  # Measured depth from sensor in meters
    max_depth_m = Column(Float, nullable=False, default=3.5)
    sensor_type = Column(String, nullable=False, default="ultrasonic_gauge")  # ultrasonic_gauge, hydrostatic, staff_gauge, sonar
    sensor_id = Column(String, nullable=False, default="US-PATNA-01")
    surface_area_ha = Column(Float, nullable=False)  # Concurrent satellite surface spread in ha
    computed_volume_m3 = Column(Float, nullable=False)  # Basin storage volume in m3
    storage_capacity_m3 = Column(Float, nullable=False)  # Full storage capacity in m3
    volume_percentage = Column(Float, nullable=False)  # % of maximum capacity
    water_deficit_m3 = Column(Float, nullable=False, default=0.0)
    alert_triggered = Column(Boolean, default=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    waterbody = relationship("Waterbody", back_populates="bathymetry_readings")


