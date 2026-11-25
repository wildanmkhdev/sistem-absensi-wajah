"""
FastAPI application — Sistem Presensi Wajah.

Production rules enforced here (not in the client):
  * Identity always comes from the session token. A student cannot submit a NIM.
  * Attendance is bound to a scheduled ``session`` (course, room, time window).
  * ``late_minutes`` is derived from the session schedule on the server clock.
  * GPS coordinates must come with an accuracy estimate; low accuracy is rejected.
  * Face verification fails closed: no face, several faces, a template from an
    older model, or an unenrolled student all produce an explicit error instead
    of a silently accepted record.
  * Benchmark cases (M1-M6) are a dry-run policy simulation and never write to
    the production attendance table.
"""

from __future__ import annotations

import logging
import os
import sys
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from app.auth import (  # noqa: E402
    auth_secret_is_configured,
    create_token,
    get_current_user,
    hash_password,
    require_dosen,
    require_mahasiswa,
    verify_password,
)
from app.core.geo import (  # noqa: E402
    DEFAULT_CLASSROOM_LAT,
    DEFAULT_CLASSROOM_LON,
    MAX_OVERSIGHT_DISTANCE_METERS,
    MAX_VALID_DISTANCE_METERS,
    calculate_distance,
)
from app.core.rules import (  # noqa: E402
    BENCHMARK_CASES,
    FACE_BORDERLINE_MIN,
    FACE_MATCH_THRESHOLD,
    FACE_MIN_PLAUSIBLE,
    MAX_ONTIME_LATE_MINUTES,
    MAX_VALID_LATE_MINUTES,
    AttendanceStatus,
    compute_late_minutes,
    evaluate_presensi,
)
from app.db.database import (  # noqa: E402
    DUMMY_ACTIVE_COURSES,
    create_attendance,
    create_or_update_student,
    create_session,
    delete_student_biometric,
    find_best_matches,
    get_active_sessions,
    get_all_attendances,
    get_all_students,
    get_attendance_by_nim_session,
    get_attendance_stats,
    get_pending_oversight,
    get_session,
    get_student,
    get_student_embedding,
    get_user_by_nim,
    get_user_by_username,
    has_pgvector,
    init_db,
    is_using_neon,
    list_sessions,
    resolve_oversight,
    update_user_nim,
    upsert_user,
)
from app.ml.engine import (  # noqa: E402
    MODEL_VERSION,
    FaceEngineError,
    FaceEngineUnavailable,
    FaceNotFound,
    InvalidImage,
    analyze_live_frame,
    compute_similarity,
    engine_info,
    extract_face_embedding,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("app.main")

# ==============================================================================
# CONFIGURATION
# ==============================================================================
GPS_MAX_ACCURACY_METERS = float(os.environ.get("GPS_MAX_ACCURACY_METERS", "50"))
SESSION_EARLY_OPEN_MINUTES = float(os.environ.get("SESSION_EARLY_OPEN_MINUTES", "15"))
FACE_MIN_FACE_RATIO = float(os.environ.get("FACE_MIN_FACE_RATIO", "0.02"))
ENROLL_DUPLICATE_THRESHOLD = float(os.environ.get("ENROLL_DUPLICATE_THRESHOLD", "0.60"))
IDENTITY_MISMATCH_MARGIN = float(os.environ.get("IDENTITY_MISMATCH_MARGIN", "0.12"))

LEGAL_BASIS_TEXT = (
    "UU 27/2022 Pasal 10 (hak subjek data untuk keberatan atas keputusan "
    "otomatis) dan Pasal 34 (kewajiban penilaian dampak pelindungan data "
    "untuk pemrosesan berisiko tinggi, termasuk data biometrik)."
)


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    logger.info(
        "Database siap: %s (pgvector=%s). Mesin wajah: %s",
        "Neon PostgreSQL" if is_using_neon() else "SQLite",
        has_pgvector(),
        engine_info().get("model_name"),
    )
    yield


app = FastAPI(
    title="Sistem Presensi Wajah Berbasis AI",
    description=(
        "Presensi mahasiswa berbasis verifikasi wajah (SCRFD + ArcFace) dan "
        "geofence per sesi kuliah, dengan human oversight sesuai UU PDP 27/2022."
    ),
    version="2.0.0",
    lifespan=lifespan,
)

_allowed_origins = [
    origin.strip()
    for origin in os.environ.get(
        "CORS_ALLOW_ORIGINS",
        "http://localhost:5173,http://localhost:7860,http://127.0.0.1:5173",
    ).split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials="*" not in _allowed_origins,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


# ==============================================================================
# REQUEST MODELS
# ==============================================================================
class RegisterRequest(BaseModel):
    nim: str = Field(..., min_length=1, max_length=32)
    name: str = Field(..., min_length=1, max_length=128)
    face_image: str = Field(..., description="Foto wajah Base64 / data URI")
    consent: bool = Field(
        False, description="Persetujuan pemrosesan data biometrik (UU PDP)"
    )


class PresensiApiRequest(BaseModel):
    session_id: int = Field(..., gt=0)
    face_image: str = Field(..., description="Swafoto kamera (Base64 / data URI)")
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    gps_accuracy: float = Field(..., ge=0, description="Akurasi GPS dalam meter")
    captured_at: Optional[datetime] = Field(
        None, description="Waktu pengambilan foto di perangkat (audit saja)"
    )
    simulated_late_minutes: Optional[float] = Field(
        None, ge=0, le=300, description="Override simulasi keterlambatan untuk prototype testing"
    )


class SimulateRequest(BaseModel):
    case_id: str = Field(..., min_length=2, max_length=2)


class SessionCreateRequest(BaseModel):
    course_code: str = Field(..., min_length=1, max_length=32)
    course_name: str = Field(..., min_length=1, max_length=128)
    room_name: Optional[str] = Field(None, max_length=128)
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    radius_m: float = Field(50.0, ge=10, le=500)
    starts_at: datetime
    ends_at: datetime


class ResolveApiRequest(BaseModel):
    attendance_id: int
    approved: bool
    lecturer_note: str = Field(..., min_length=3, max_length=1000)


class LoginApiRequest(BaseModel):
    username: str = Field(..., min_length=1)
    password: str = Field(..., min_length=1)


class RegisterAccountApiRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=64)
    password: str = Field(..., min_length=4, max_length=128)
    nim: str = Field(..., min_length=1, max_length=32)
    name: str = Field(..., min_length=1, max_length=128)
    face_image: str = Field(..., description="Foto wajah Base64 / data URI")
    consent: bool = Field(
        False, description="Persetujuan pemrosesan data biometrik (UU PDP)"
    )


# ==============================================================================
# HELPERS
# ==============================================================================
def _utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _iso(value: datetime) -> str:
    return _utc(value).isoformat()


def _parse_session_time(value: Any) -> datetime:
    text = str(value).strip()
    if text.endswith("Z"):
        text = text[:-1] + "+00:00"
    return _utc(datetime.fromisoformat(text))


def _format_attendance(record: Dict[str, Any]) -> Dict[str, Any]:
    """Shape a DB row for the API without leaking base64 image payloads."""
    if not record:
        return {}
    result = dict(record)
    result["name"] = result.get("student_name") or result.get("name")
    result["initial_rule_status"] = result.get("status_awal")
    result["lecturer_note"] = (
        result.get("resolution_note") or result.get("note") or result.get("lecturer_note")
    )
    preview = result.get("photo_path")
    if isinstance(preview, str) and preview.startswith("data:"):
        preview = None
    result["face_image_preview"] = preview
    return result


def _extract_face(image: str) -> tuple[Any, Dict[str, Any]]:
    """Run the face pipeline and translate engine failures into HTTP errors."""
    try:
        embedding, metadata = extract_face_embedding(image)
    except FaceNotFound as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Wajah tidak terdeteksi: {exc}",
        ) from exc
    except InvalidImage as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Gambar tidak valid: {exc}",
        ) from exc
    except FaceEngineUnavailable as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Mesin pengenalan wajah tidak tersedia: {exc}",
        ) from exc
    except FaceEngineError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Gagal memproses wajah: {exc}",
        ) from exc

    if metadata.get("faces_detected", 0) != 1:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "Foto harus memuat tepat satu wajah. "
                f"Terdeteksi {metadata.get('faces_detected', 0)} wajah."
            ),
        )
    if float(metadata.get("face_ratio", 0.0)) < FACE_MIN_FACE_RATIO:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "Wajah terlalu kecil dalam frame. Dekatkan kamera sehingga wajah "
                "memenuhi bingkai panduan."
            ),
        )
    return embedding, metadata


def _require_enrolled_template(nim: str) -> List[float]:
    student = get_student(nim)
    if not student:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Mahasiswa belum terdaftar. Lakukan pendaftaran wajah terlebih dahulu.",
        )
    embedding = get_student_embedding(nim)
    if not embedding:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Wajah belum terdaftar. Lakukan pendaftaran wajah terlebih dahulu.",
        )
    if student.get("model_version") != MODEL_VERSION:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Template wajah tersimpan memakai model lama dan tidak kompatibel. "
                "Silakan daftarkan ulang wajah Anda."
            ),
        )
    return embedding


def _active_session_or_404(session_id: int) -> Dict[str, Any]:
    session = get_session(session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Sesi kuliah {session_id} tidak ditemukan.",
        )
    return session


# ==============================================================================
# HEALTH
# ==============================================================================
@app.get("/health")
def health_check():
    """Liveness/readiness probe with engine and database diagnostics."""
    engine = engine_info()
    return {
        "status": "ok" if engine.get("available") else "degraded",
        "app": "Sistem Presensi Wajah Berbasis AI",
        "version": "2.0.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "database": {
            "backend": "neon" if is_using_neon() else "sqlite",
            "pgvector": has_pgvector(),
        },
        "face_engine": engine,
        "auth": {"secret_configured": auth_secret_is_configured()},
        "legal_compliance": LEGAL_BASIS_TEXT,
    }


# ==============================================================================
# AUTH
# ==============================================================================
_login_failures: Dict[str, List[float]] = {}
_LOGIN_MAX_ATTEMPTS = int(os.environ.get("AUTH_LOGIN_MAX_ATTEMPTS", "8"))
_LOGIN_WINDOW_SECONDS = int(os.environ.get("AUTH_LOGIN_WINDOW_SECONDS", "300"))


def _login_throttle_check(username: str) -> None:
    now = datetime.now(timezone.utc).timestamp()
    attempts = [
        t for t in _login_failures.get(username, []) if now - t < _LOGIN_WINDOW_SECONDS
    ]
    _login_failures[username] = attempts
    if len(attempts) >= _LOGIN_MAX_ATTEMPTS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Terlalu banyak percobaan gagal. Coba lagi dalam beberapa menit.",
        )


@app.post("/api/auth/login")
def auth_login(req: LoginApiRequest):
    username = req.username.strip()
    _login_throttle_check(username)

    user = get_user_by_username(username)
    if not user or not verify_password(req.password, user.get("password_hash", "")):
        _login_failures.setdefault(username, []).append(
            datetime.now(timezone.utc).timestamp()
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Username atau password salah.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    _login_failures.pop(username, None)
    token = create_token(user)
    logger.info("Login berhasil: %s (%s)", user["username"], user["role"])
    return {
        "token": token,
        "user": {
            "username": user["username"],
            "role": user["role"],
            "nim": user.get("nim"),
            "name": user["name"],
        },
    }


@app.post("/api/auth/register", status_code=status.HTTP_201_CREATED)
def auth_register(req: RegisterAccountApiRequest):
    username = req.username.strip()
    nim = req.nim.strip()
    name = req.name.strip()

    if not req.consent:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Persetujuan pemrosesan data biometrik diperlukan (UU PDP Pasal 20). "
                "Centang persetujuan sebelum mendaftarkan akun."
            ),
        )

    if get_user_by_username(username):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Username '{username}' sudah digunakan. Silakan pilih username lain.",
        )

    existing_user_with_nim = get_user_by_nim(nim)
    if existing_user_with_nim:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"NIM '{nim}' sudah terdaftar pada akun lain ({existing_user_with_nim['username']}).",
        )

    embedding, metadata = _extract_face(req.face_image)

    existing_matches = find_best_matches(
        embedding.tolist(), limit=3, model_version=MODEL_VERSION
    )
    for match in existing_matches:
        if (
            match["nim"] != nim
            and float(match.get("similarity") or 0.0) >= ENROLL_DUPLICATE_THRESHOLD
        ):
            logger.warning(
                "Pendaftaran ditolak: wajah pendaftar %s mirip dengan NIM %s (%.2f).",
                nim,
                match["nim"],
                match["similarity"],
            )
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "Wajah ini sudah terdaftar pada NIM lain. "
                    "Hubungi dosen/admin bila ini keliru."
                ),
            )

    create_or_update_student(
        nim=nim,
        name=name,
        profile_image_path=None,
        embedding=embedding.tolist(),
        model_name=metadata.get("model_name"),
        model_version=MODEL_VERSION,
        consent=True,
    )

    user = upsert_user(
        username=username,
        password_hash=hash_password(req.password),
        role="mahasiswa",
        nim=nim,
        name=name,
    )

    token = create_token(user)
    logger.info("Registrasi akun dan wajah berhasil: %s (%s)", username, nim)
    return {
        "token": token,
        "user": {
            "username": user["username"],
            "role": user["role"],
            "nim": user.get("nim"),
            "name": user["name"],
        },
        "message": f"Akun dan wajah untuk {name} ({nim}) berhasil didaftarkan.",
    }


@app.get("/api/auth/me")
def auth_me(user: Dict[str, Any] = Depends(get_current_user)):
    return {
        "username": user["sub"],
        "role": user["role"],
        "nim": user.get("nim"),
        "name": user["name"],
    }


# ==============================================================================
# SESSIONS
# ==============================================================================
@app.get("/api/sessions/active")
def list_active_sessions(user: Dict[str, Any] = Depends(get_current_user)):
    """Sessions currently open for attendance (mahasiswa pick one)."""
    now = datetime.now(timezone.utc)
    sessions = get_active_sessions(_iso(now))
    return [
        {
            **s,
            "is_open": True,
            "seconds_until_close": max(
                0,
                int(
                    (
                        _parse_session_time(s["ends_at"]) - now
                    ).total_seconds()
                ),
            ),
        }
        for s in sessions
    ]


@app.get("/api/sessions")
def list_all_sessions(
    limit: int = 50, user: Dict[str, Any] = Depends(require_dosen)
):
    return list_sessions(limit=limit)


@app.post("/api/sessions", status_code=status.HTTP_201_CREATED)
def create_session_endpoint(
    req: SessionCreateRequest, user: Dict[str, Any] = Depends(require_dosen)
):
    starts_at = _utc(req.starts_at)
    ends_at = _utc(req.ends_at)
    if ends_at <= starts_at:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="ends_at harus setelah starts_at.",
        )
    if (ends_at - starts_at) > timedelta(hours=12):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Durasi sesi maksimal 12 jam.",
        )

    session = create_session(
        course_code=req.course_code.strip(),
        course_name=req.course_name.strip(),
        room_name=req.room_name,
        room_lat=req.latitude,
        room_lon=req.longitude,
        radius_m=req.radius_m,
        starts_at=_iso(starts_at),
        ends_at=_iso(ends_at),
    )
    logger.info("Sesi baru dibuat: %s (%s)", session.get("course_code"), session.get("id"))
    return session


@app.get("/api/classroom")
def get_classroom_info():
    """Default classroom reference (kept for backward compatibility)."""
    return {
        "latitude": DEFAULT_CLASSROOM_LAT,
        "longitude": DEFAULT_CLASSROOM_LON,
        "max_valid_distance_meters": MAX_VALID_DISTANCE_METERS,
        "max_oversight_distance_meters": MAX_OVERSIGHT_DISTANCE_METERS,
        "note": "Presensi memakai koordinat ruang pada sesi, bukan titik default ini.",
    }


# ==============================================================================
# STUDENTS & ENROLLMENT
# ==============================================================================
@app.get("/api/students")
def list_students(user: Dict[str, Any] = Depends(require_dosen)):
    """Roster for lecturers. Never returns face templates."""
    return get_all_students()


@app.get("/api/students/me")
def get_my_profile(user: Dict[str, Any] = Depends(get_current_user)):
    if user["role"] != "mahasiswa" or not user.get("nim"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Endpoint ini hanya untuk akun mahasiswa.",
        )
    student = get_student(user["nim"])
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profil mahasiswa belum terdaftar.",
        )
    student.pop("embedding", None)
    return student


@app.post("/api/register")
def register_student(
    req: RegisterRequest, user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Enroll a face template. Requires explicit biometric consent.

    A student may only enroll their own NIM. The face is rejected when it
    already belongs to another enrolled student, which prevents one person
    from creating several identities.
    """
    if user["role"] == "mahasiswa":
        user_nim = user.get("nim")
        if not user_nim:
            user_nim = req.nim.strip()
            update_user_nim(user["sub"], user_nim, user.get("name"))
        elif req.nim and req.nim.strip() != user_nim:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    f"Mahasiswa hanya dapat mendaftarkan wajahnya sendiri "
                    f"(Akun Anda terikat pada NIM {user_nim}). "
                    "Gunakan menu Registrasi di halaman depan untuk mendaftar akun baru."
                ),
            )
        req_nim = user_nim
        name = user["name"]
    else:
        req_nim = req.nim.strip()
        name = req.name.strip()

    if not req.consent:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Persetujuan pemrosesan data biometrik diperlukan. "
                "Centang persetujuan sebelum mendaftarkan wajah."
            ),
        )

    embedding, metadata = _extract_face(req.face_image)

    existing_matches = find_best_matches(
        embedding.tolist(), limit=3, model_version=MODEL_VERSION
    )
    for match in existing_matches:
        if (
            match["nim"] != req_nim
            and float(match.get("similarity") or 0.0) >= ENROLL_DUPLICATE_THRESHOLD
        ):
            logger.warning(
                "Pendaftaran ditolak: wajah %s mirip dengan NIM %s (%.2f).",
                req_nim,
                match["nim"],
                match["similarity"],
            )
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "Wajah ini sudah terdaftar pada NIM lain. "
                    "Hubungi dosen/admin bila ini keliru."
                ),
            )

    prior = get_student(req_nim)
    is_update = bool(prior and prior.get("embedding"))

    student = create_or_update_student(
        nim=req_nim,
        name=name,
        profile_image_path=None,
        embedding=embedding.tolist(),
        model_name=metadata.get("model_name"),
        model_version=MODEL_VERSION,
        consent=True,
    )

    return {
        "success": True,
        "nim": student["nim"],
        "name": student["name"],
        "has_embedding": True,
        "model_version": MODEL_VERSION,
        "quality": {
            "detection_score": metadata.get("detection_score"),
            "face_ratio": metadata.get("face_ratio"),
            "faces_detected": metadata.get("faces_detected"),
        },
        "message": (
            f"Wajah {student['name']} ({student['nim']}) berhasil diperbarui."
            if is_update
            else f"Wajah {student['name']} ({student['nim']}) berhasil didaftarkan."
        ),
    }


@app.delete("/api/students/{nim}/biometric")
def erase_biometric(nim: str, user: Dict[str, Any] = Depends(get_current_user)):
    """Right to erasure: delete the face template, keep the identity record."""
    if user["role"] == "mahasiswa" and user.get("nim") != nim:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Mahasiswa hanya dapat menghapus data biometriknya sendiri.",
        )
    if not delete_student_biometric(nim):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Data biometrik untuk NIM {nim} tidak ditemukan.",
        )
    return {"success": True, "nim": nim, "message": "Template wajah telah dihapus."}


# ==============================================================================
# PRESENSI
# ==============================================================================
@app.post("/api/presensi")
def submit_presensi(
    req: PresensiApiRequest, user: Dict[str, Any] = Depends(require_mahasiswa)
):
    """
    Submit attendance for the authenticated student.

    The client supplies only the session, a live selfie, and a GPS fix.
    Identity, timing, and the geofence are resolved server-side.
    """
    nim = user.get("nim")
    if not nim:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Akun mahasiswa tidak terhubung ke NIM.",
        )

    session = _active_session_or_404(req.session_id)
    now = datetime.now(timezone.utc)
    starts_at = _parse_session_time(session["starts_at"])
    ends_at = _parse_session_time(session["ends_at"])
    opens_at = starts_at - timedelta(minutes=SESSION_EARLY_OPEN_MINUTES)

    if now < opens_at:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Sesi belum dibuka. Presensi dapat dilakukan mulai "
                f"{opens_at.isoformat()}."
            ),
        )
    if now > ends_at:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Sesi sudah ditutup pada {ends_at.isoformat()}.",
        )

    if req.gps_accuracy > GPS_MAX_ACCURACY_METERS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                f"Akurasi GPS terlalu rendah ({req.gps_accuracy:.0f} m). "
                f"Maksimum {GPS_MAX_ACCURACY_METERS:.0f} m — pindah ke area terbuka "
                "atau tunggu sinyal GPS membaik."
            ),
        )

    stored_embedding = _require_enrolled_template(nim)
    input_embedding, face_metadata = _extract_face(req.face_image)

    similarity = compute_similarity(input_embedding, stored_embedding)
    distance_meters = calculate_distance(
        req.latitude, req.longitude, session["room_lat"], session["room_lon"]
    )

    if req.simulated_late_minutes is not None:
        late_minutes = float(req.simulated_late_minutes)
    else:
        raw_late = compute_late_minutes(starts_at, now)
        is_dummy_session = any(
            session.get("course_code") == c["course_code"] for c in DUMMY_ACTIVE_COURSES
        )
        if is_dummy_session and raw_late > MAX_ONTIME_LATE_MINUTES:
            late_minutes = 5.0  # Default tepat waktu untuk sesi simulasi prototype
        else:
            late_minutes = raw_late

    evaluation = evaluate_presensi(
        score=similarity,
        distance_meters=distance_meters,
        late_minutes=late_minutes,
        radius_meters=float(session.get("radius_m") or MAX_VALID_DISTANCE_METERS),
        oversight_radius_meters=max(
            float(session.get("radius_m") or MAX_VALID_DISTANCE_METERS) * 2,
            MAX_OVERSIGHT_DISTANCE_METERS,
        ),
    )

    # Anti-proxy signal: does this face look more like somebody else?
    top_matches = find_best_matches(
        input_embedding.tolist(), limit=3, model_version=MODEL_VERSION
    )
    identity_check = {
        "claimed_similarity": round(float(similarity), 4),
        "best_match_nim": top_matches[0]["nim"] if top_matches else None,
        "best_match_similarity": (
            round(float(top_matches[0]["similarity"]), 4) if top_matches else None
        ),
        "is_identity_mismatch": False,
    }
    if top_matches:
        best = top_matches[0]
        if (
            best["nim"] != nim
            and float(best["similarity"]) >= FACE_MATCH_THRESHOLD
            and float(best["similarity"]) - similarity >= IDENTITY_MISMATCH_MARGIN
        ):
            identity_check["is_identity_mismatch"] = True
            evaluation.update(
                {
                    "status": AttendanceStatus.TIDAK_SAH.value,
                    "status_uupdp": AttendanceStatus.TIDAK_SAH.value,
                    "requires_human_oversight": False,
                    "human_oversight_status": "NONE",
                    "decision_reason": (
                        "Presensi ditolak (indikasi titip absen): wajah lebih cocok dengan "
                        f"mahasiswa lain ({best['nim']}, skor {best['similarity']:.2f}) "
                        f"daripada pemilik akun ({similarity:.2f})."
                    ),
                }
            )

    record = {
        "nim": nim,
        "student_name": user["name"],
        "timestamp": now.isoformat(),
        "similarity_score": round(float(similarity), 4),
        "distance_meters": round(float(distance_meters), 2),
        "late_minutes": round(float(late_minutes), 1),
        "status": evaluation["status_uupdp"],
        "status_awal": evaluation["status_awal"],
        "status_uupdp": evaluation["status_uupdp"],
        "decision_reason": evaluation["decision_reason"],
        "requires_human_oversight": evaluation["requires_human_oversight"],
        "human_oversight_status": evaluation["human_oversight_status"],
        "note": evaluation.get("decision_reason_awal"),
        "legal_basis": LEGAL_BASIS_TEXT,
        "simulated_case": None,
        "session_id": int(session["id"]),
        "gps_accuracy": round(float(req.gps_accuracy), 2),
        "model_version": MODEL_VERSION,
        "face_detection_score": face_metadata.get("detection_score"),
        "photo_path": None,
    }

    # Never mask a rejected/impostor attempt behind an earlier HADIR row for the same session.
    if record["status"] == AttendanceStatus.TIDAK_SAH.value:
        existing = get_attendance_by_nim_session(nim, int(session["id"]))
        if existing is not None:
            saved = record
            duplicate = False
        else:
            saved = create_attendance(record)
            duplicate = False
    else:
        saved = create_attendance(record)
        duplicate = int(saved.get("id", 0)) > 0 and saved.get("timestamp") != record["timestamp"]

    return {
        "id": saved.get("id"),
        "student_id": saved.get("id"),
        "nim": nim,
        "name": user["name"],
        "student_name": user["name"],
        "session_id": int(session["id"]),
        "course_code": session.get("course_code"),
        "course_name": session.get("course_name"),
        "room_name": session.get("room_name"),
        "status": saved.get("status"),
        "initial_rule_status": saved.get("status_awal"),
        "status_awal": saved.get("status_awal"),
        "status_uupdp": saved.get("status_uupdp"),
        "similarity_score": saved.get("similarity_score"),
        "distance_meters": saved.get("distance_meters"),
        "late_minutes": saved.get("late_minutes"),
        "gps_accuracy": saved.get("gps_accuracy"),
        "decision_reason": saved.get("decision_reason"),
        "requires_human_oversight": bool(saved.get("requires_human_oversight")),
        "human_oversight_status": saved.get("human_oversight_status"),
        "timestamp": saved.get("timestamp"),
        "legal_basis": saved.get("legal_basis"),
        "note": saved.get("note"),
        "duplicate": duplicate,
        "face": face_metadata,
        "identity_check": identity_check,
        "thresholds": {
            "face_match": FACE_MATCH_THRESHOLD,
            "on_time_max_minutes": MAX_ONTIME_LATE_MINUTES,
            "late_max_minutes": MAX_VALID_LATE_MINUTES,
            "radius_m": float(session.get("radius_m") or MAX_VALID_DISTANCE_METERS),
        },
    }


class FacePreviewRequest(BaseModel):
    face_image: str


@app.post("/api/camera/preview-quality")
def preview_camera_quality(req: FacePreviewRequest):
    """
    Public read-only camera quality & framing analyzer for registration screens.
    Returns face bounding box and real-time lighting/sharpness/position guidance
    without querying or exposing any student records.
    """
    try:
        analysis = analyze_live_frame(req.face_image, compute_embedding=False)
    except FaceEngineUnavailable as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
    except InvalidImage as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    guidance = analysis["guidance"]
    is_ready = analysis["detected"] and guidance["level"] == "ok"

    return {
        "detected": analysis["detected"],
        "face_count": analysis["face_count"],
        "bbox": analysis["bbox"],
        "matched_name": "Siap Didaftarkan" if is_ready else ("Sesuaikan Posisi" if analysis["detected"] else None),
        "similarity_percent": 0.0,
        "match_status": "MATCH" if is_ready else ("BORDERLINE" if analysis["detected"] else "NO_FACE"),
        "quality": analysis["quality"],
        "guidance": guidance,
    }


@app.post("/api/presensi/preview-face")
def preview_face_realtime(
    req: FacePreviewRequest, user: Dict[str, Any] = Depends(require_mahasiswa)
):
    """
    Read-only real-time camera preview endpoint for live viewfinder HUD.
    Returns face bounding box, live match % against the logged-in student's
    enrolled template, and real-time lighting/framing guidance.
    """
    nim = user.get("nim") or ""
    try:
        analysis = analyze_live_frame(req.face_image, compute_embedding=True)
    except FaceEngineUnavailable as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
    except InvalidImage as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    student_rec = get_student(nim) if nim else None
    is_outdated = (
        student_rec is not None
        and student_rec.get("model_version")
        and student_rec.get("model_version") != MODEL_VERSION
    )
    stored_embedding = (
        None if is_outdated else (get_student_embedding(nim) if nim else None)
    )
    embedding = analysis.get("embedding")
    similarity = 0.0
    if embedding is not None and stored_embedding is not None:
        similarity = compute_similarity(embedding, stored_embedding)

    similarity_percent = round(float(similarity) * 100.0, 1)

    if is_outdated:
        match_status = "NOT_ENROLLED"
        matched_name = "Perlu Daftar Ulang Wajah"
    elif stored_embedding is None:
        match_status = "NOT_ENROLLED"
        matched_name = "Wajah Belum Terdaftar"
    elif not analysis["detected"]:
        match_status = "NO_FACE"
        matched_name = None
    elif similarity >= FACE_MATCH_THRESHOLD:
        match_status = "MATCH"
        matched_name = user.get("name") or nim
    elif similarity >= FACE_MIN_PLAUSIBLE:
        match_status = "BORDERLINE"
        matched_name = user.get("name") or nim
    else:
        match_status = "MISMATCH"
        matched_name = "Wajah Tidak Cocok"

    guidance = analysis["guidance"]
    if (
        analysis["detected"]
        and stored_embedding is not None
        and match_status == "MISMATCH"
        and guidance["level"] == "ok"
    ):
        guidance = {
            "level": "error",
            "title": "Wajah tidak cocok dengan akun",
            "solution": "Pastikan pemilik akun yang menghadap kamera, atau perbarui foto di Data Wajah.",
        }

    return {
        "detected": analysis["detected"],
        "face_count": analysis["face_count"],
        "bbox": analysis["bbox"],
        "matched_name": matched_name,
        "similarity_percent": similarity_percent,
        "match_status": match_status,
        "quality": analysis["quality"],
        "guidance": guidance,
    }


@app.post("/api/presensi/simulate")
def simulate_presensi(
    req: SimulateRequest, user: Dict[str, Any] = Depends(require_dosen)
):
    """
    Dry-run the M1-M6 policy cases. Never writes to the attendance table.

    These cases exercise the *rules*, not the face engine: their scores are
    fixed parameters. Engine quality is measured separately by
    ``scripts/calibrate_face.py``.
    """
    case = next((c for c in BENCHMARK_CASES if c["id"] == req.case_id.upper()), None)
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Kasus {req.case_id} tidak dikenal. Pilih M1-M6.",
        )

    evaluation = evaluate_presensi(
        score=float(case["score"]),
        distance_meters=float(case["distance"]),
        late_minutes=float(case["late"]),
        simulated_case=case["id"],
    )
    return {
        "case_id": case["id"],
        "nim": case["nim"],
        "name": case["name"],
        "keterangan": case["keterangan"],
        "status": evaluation["status_uupdp"],
        "status_awal": evaluation["status_awal"],
        "status_uupdp": evaluation["status_uupdp"],
        "similarity_score": case["score"],
        "distance_meters": case["distance"],
        "late_minutes": case["late"],
        "requires_human_oversight": evaluation["requires_human_oversight"],
        "human_oversight_status": evaluation["human_oversight_status"],
        "decision_reason": evaluation["decision_reason"],
        "legal_basis": LEGAL_BASIS_TEXT,
        "persisted": False,
    }


# ==============================================================================
# OVERSIGHT
# ==============================================================================
@app.get("/api/oversight")
def get_oversight_list(user: Dict[str, Any] = Depends(require_dosen)):
    return [_format_attendance(r) for r in get_pending_oversight()]


@app.post("/api/oversight/resolve")
def resolve_oversight_case(
    req: ResolveApiRequest, user: Dict[str, Any] = Depends(require_dosen)
):
    lecturer = user["name"] or "Dosen Pengampu"
    resolved = resolve_oversight(
        attendance_id=req.attendance_id,
        approved=req.approved,
        lecturer_note=req.lecturer_note,
        resolved_by=lecturer,
    )
    if not resolved:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Presensi dengan ID {req.attendance_id} tidak ditemukan.",
        )

    formatted = _format_attendance(resolved)
    return {
        "success": True,
        "attendance_id": req.attendance_id,
        "new_status": formatted["status"],
        "human_oversight_status": formatted["human_oversight_status"],
        "resolution_note": formatted.get("resolution_note") or req.lecturer_note,
        "resolved_by": formatted.get("resolved_by") or lecturer,
        "resolved_at": formatted.get("resolved_at"),
        "attendance": formatted,
    }


# ==============================================================================
# BENCHMARK (read-only)
# ==============================================================================
@app.get("/api/benchmark")
def get_benchmark_table():
    """M1-M6 policy comparison (read-only, no attendance rows created)."""
    from app.ml.benchmark import run_benchmark

    results = run_benchmark()
    return [
        {
            "case_id": item["case_id"],
            "nim": item["nim"],
            "name": item["name"],
            "face_score": item["face_score"],
            "distance_meters": item["distance_m"],
            "late_minutes": item["late_minutes"],
            "condition_description": item["detail_kondisi"],
            "status_initial": item["rancangan_awal_status"],
            "status_uupdp": item["rancangan_uu_pdp_status"],
            "requires_human_oversight": item["requires_human_oversight"],
            "ethical_legal_analysis": item["rancangan_uu_pdp_alasan"],
            "pdp_article_reference": LEGAL_BASIS_TEXT,
            "status_awal": item["rancangan_awal_status"],
            "keterangan": item["keterangan"],
            "alasan_awal": item["rancangan_awal_alasan"],
            "alasan_uupdp": item["rancangan_uu_pdp_alasan"],
        }
        for item in results
    ]


@app.get("/api/benchmark/summary")
def get_benchmark_summary_data():
    from app.ml.benchmark import get_benchmark_summary

    return get_benchmark_summary()


# ==============================================================================
# ATTENDANCE HISTORY & STATS
# ==============================================================================
@app.get("/api/attendances")
def list_attendances(
    limit: int = 100, user: Dict[str, Any] = Depends(get_current_user)
):
    """Students see only their own rows; the filter is applied server-side."""
    limit = max(1, min(limit, 500))
    nim_filter = user.get("nim") if user["role"] == "mahasiswa" else None
    if user["role"] == "mahasiswa" and not nim_filter:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Akun mahasiswa tidak terhubung ke NIM.",
        )
    records = get_all_attendances(limit=limit, nim=nim_filter)
    return [_format_attendance(r) for r in records]


@app.get("/api/stats")
def get_stats(user: Dict[str, Any] = Depends(require_dosen)):
    return get_attendance_stats()


# ==============================================================================
# SPA STATIC FILES
# ==============================================================================
from fastapi.responses import FileResponse  # noqa: E402
from fastapi.staticfiles import StaticFiles  # noqa: E402

static_candidates = [
    os.path.join(BASE_DIR, "static"),
    os.path.abspath(os.path.join(BASE_DIR, "..", "frontend", "dist")),
]
static_root = next((d for d in static_candidates if os.path.exists(d)), None)

if static_root:
    assets_dir = os.path.join(static_root, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa_frontend(full_path: str):
        if full_path.startswith("api/") or full_path in (
            "health",
            "docs",
            "redoc",
            "openapi.json",
        ):
            raise HTTPException(status_code=404, detail="Not Found")
        target_file = os.path.join(static_root, full_path)
        if os.path.isfile(target_file):
            return FileResponse(target_file)
        index_html = os.path.join(static_root, "index.html")
        if os.path.isfile(index_html):
            return FileResponse(index_html)
        raise HTTPException(status_code=404, detail="Frontend build not found")
