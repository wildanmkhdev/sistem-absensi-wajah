from typing import Optional, List, Any
from pydantic import BaseModel, Field
from datetime import datetime


# ==============================================================================
# STUDENT SCHEMAS
# ==============================================================================
class StudentBase(BaseModel):
    nim: str = Field(..., description="Nomor Induk Mahasiswa")
    name: str = Field(..., description="Nama Lengkap Mahasiswa")


class StudentCreate(StudentBase):
    face_image: Optional[str] = Field(None, description="Foto wajah profil dalam Base64 atau URL data")


class StudentDB(StudentBase):
    profile_image_path: Optional[str] = None
    embedding: Optional[List[float]] = None
    created_at: str


class StudentResponse(StudentBase):
    profile_image_path: Optional[str] = None
    created_at: str
    has_embedding: bool = False


# ==============================================================================
# ATTENDANCE SCHEMAS
# ==============================================================================
class PresensiRequest(BaseModel):
    nim: str = Field(..., description="NIM Mahasiswa yang melakukan presensi")
    face_image: Optional[str] = Field(None, description="Foto swafoto kamera (Base64 string)")
    latitude: float = Field(..., description="Koordinat lintang GPS ponsel saat ini")
    longitude: float = Field(..., description="Koordinat bujur GPS ponsel saat ini")
    late_minutes: float = Field(0.0, description="Keterlambatan mahasiswa dalam satuan menit")
    simulated_case: Optional[str] = Field(None, description="Pilihan simulasi kasus Modul 13: M1, M2, M3, M4, M5, M6")


class AttendanceRecord(BaseModel):
    id: int
    nim: str
    student_name: str
    timestamp: str
    similarity_score: float
    distance_meters: float
    late_minutes: float
    status: str
    status_awal: str
    status_uupdp: str
    decision_reason: str
    requires_human_oversight: bool
    human_oversight_status: str
    note: Optional[str] = None
    resolved_by: Optional[str] = None
    resolution_note: Optional[str] = None
    resolved_at: Optional[str] = None
    photo_path: Optional[str] = None
    legal_basis: Optional[str] = None


class PresensiResponse(BaseModel):
    id: int
    nim: str
    student_name: str
    timestamp: str
    status: str
    status_awal: str
    status_uupdp: str
    similarity_score: float
    distance_meters: float
    late_minutes: float
    decision_reason: str
    requires_human_oversight: bool
    human_oversight_status: str
    legal_basis: Optional[str] = None
    note: Optional[str] = None


# ==============================================================================
# HUMAN OVERSIGHT SCHEMAS
# ==============================================================================
class OversightResolveRequest(BaseModel):
    attendance_id: int = Field(..., description="ID record presensi yang akan diverifikasi")
    approved: bool = Field(..., description="True jika disetujui hadir, False jika ditolak")
    lecturer_note: str = Field(..., description="Catatan keputusan dan pertimbangan dosen pengampu")
    resolved_by: Optional[str] = Field("Dosen Pengampu", description="Nama/Identitas dosen yang memverifikasi")


class OversightResolveResponse(BaseModel):
    success: bool
    attendance_id: int
    new_status: str
    human_oversight_status: str
    resolution_note: str
    resolved_by: str
    resolved_at: str


# ==============================================================================
# BENCHMARK & STATS SCHEMAS
# ==============================================================================
class BenchmarkItem(BaseModel):
    case_id: str
    student_name: str
    nim: str
    score: float
    distance_meters: float
    late_minutes: float
    keterangan: str
    status_awal: str
    status_uupdp: str
    selisih_kebijakan: str
    alasan_awal: str
    alasan_uupdp: str
    requires_human_oversight: bool


class BenchmarkResponse(BaseModel):
    title: str
    legal_framework: str
    total_cases: int
    items: List[BenchmarkItem]


class AttendanceStats(BaseModel):
    total_attendances: int
    hadir_count: int
    terlambat_count: int
    pending_oversight_count: int
    tidak_sah_count: int
