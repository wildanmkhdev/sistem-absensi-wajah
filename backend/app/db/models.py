"""Pydantic schemas mirroring the API contract.

Kept in sync with ``app.main``; useful for documentation and future refactors.
"""

from typing import List, Optional

from pydantic import BaseModel, Field


# ==============================================================================
# STUDENTS
# ==============================================================================
class StudentBase(BaseModel):
    nim: str = Field(..., description="Nomor Induk Mahasiswa")
    name: str = Field(..., description="Nama Lengkap Mahasiswa")


class StudentCreate(StudentBase):
    face_image: str = Field(..., description="Foto wajah Base64 / data URI")
    consent: bool = Field(..., description="Persetujuan pemrosesan biometrik")


class StudentResponse(StudentBase):
    profile_image_path: Optional[str] = None
    created_at: Optional[str] = None
    has_embedding: bool = False
    model_version: Optional[str] = None
    enrollment_count: int = 0
    consent_at: Optional[str] = None


# ==============================================================================
# SESSIONS
# ==============================================================================
class SessionCreate(BaseModel):
    course_code: str
    course_name: str
    room_name: Optional[str] = None
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    radius_m: float = Field(50.0, ge=10, le=500)
    starts_at: str
    ends_at: str


class SessionResponse(BaseModel):
    id: int
    course_code: str
    course_name: str
    room_name: Optional[str] = None
    room_lat: float
    room_lon: float
    radius_m: float
    starts_at: str
    ends_at: str
    created_at: Optional[str] = None


# ==============================================================================
# PRESENSI
# ==============================================================================
class PresensiRequest(BaseModel):
    session_id: int = Field(..., gt=0)
    face_image: str = Field(..., description="Swafoto kamera (Base64 / data URI)")
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    gps_accuracy: float = Field(..., ge=0, description="Akurasi GPS dalam meter")
    captured_at: Optional[str] = None


class FaceQuality(BaseModel):
    detection_score: float
    face_ratio: float
    faces_detected: int


class PresensiResponse(BaseModel):
    id: int
    nim: str
    name: str
    session_id: int
    course_code: Optional[str] = None
    course_name: Optional[str] = None
    status: str
    status_awal: str
    status_uupdp: str
    similarity_score: float
    distance_meters: float
    late_minutes: float
    gps_accuracy: Optional[float] = None
    decision_reason: str
    requires_human_oversight: bool
    human_oversight_status: str
    timestamp: str
    duplicate: bool = False
    face: Optional[FaceQuality] = None
    legal_basis: Optional[str] = None


class AttendanceRecord(PresensiResponse):
    lecturer_note: Optional[str] = None
    resolved_by: Optional[str] = None
    resolved_at: Optional[str] = None


# ==============================================================================
# OVERSIGHT
# ==============================================================================
class OversightResolveRequest(BaseModel):
    attendance_id: int
    approved: bool
    lecturer_note: str = Field(..., min_length=3, max_length=1000)


class OversightResolveResponse(BaseModel):
    success: bool
    attendance_id: int
    new_status: str
    human_oversight_status: str
    resolution_note: str
    resolved_by: str
    resolved_at: Optional[str] = None


# ==============================================================================
# BENCHMARK & STATS
# ==============================================================================
class BenchmarkItem(BaseModel):
    case_id: str
    nim: str
    name: str
    face_score: float
    distance_meters: float
    late_minutes: float
    condition_description: str
    status_initial: str
    status_uupdp: str
    requires_human_oversight: bool
    ethical_legal_analysis: str
    pdp_article_reference: str


class AttendanceStats(BaseModel):
    total_attendances: int
    hadir_count: int
    terlambat_count: int
    pending_oversight_count: int
    tidak_sah_count: int


class StudentListResponse(BaseModel):
    students: List[StudentResponse]
