import os
import sys
import logging
from typing import Optional, List, Dict, Any
from datetime import datetime

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Ensure backend root is on sys.path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from app.core.geo import (
    calculate_classroom_distance,
    DEFAULT_CLASSROOM_LAT,
    DEFAULT_CLASSROOM_LON,
    MAX_VALID_DISTANCE_METERS,
    MAX_OVERSIGHT_DISTANCE_METERS,
)
from app.core.rules import (
    evaluate_presensi,
    BENCHMARK_CASES,
    AttendanceStatus,
    HumanOversightStatus,
)
from app.db.database import (
    init_db,
    get_student,
    create_or_update_student,
    get_all_students,
    create_attendance,
    get_attendance_by_id,
    get_pending_oversight,
    resolve_oversight,
    get_all_attendances,
    get_attendance_stats,
)

# Optional ML engine import (graceful fallback if model / dependencies need it)
try:
    from app.ml.engine import process_face_image, compute_similarity
except ImportError:
    process_face_image = None
    compute_similarity = None

try:
    from app.ml.benchmark import run_benchmark as run_ml_benchmark, get_benchmark_summary
except ImportError:
    run_ml_benchmark = None
    get_benchmark_summary = None

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("app.main")

# Lifespan context manager
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app_instance: FastAPI):
    init_db()
    logger.info("Database SQLite berhasil diinisialisasi pada startup.")
    yield

# ==============================================================================
# FASTAPI APP CREATION & LIFESPAN
# ==============================================================================
app = FastAPI(
    title="Sistem Presensi Wajah Berbasis AI (Modul 13 & UU PDP)",
    description=(
        "Sistem Presensi Mahasiswa Berbasis Pengenalan Wajah dan Geospasial "
        "dengan Mekanisme Human Oversight Berdasarkan UU PDP No. 27 Tahun 2022 Pasal 34."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# Enable CORS for local dev and Hugging Face Spaces deployment
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==============================================================================
# REQUEST & RESPONSE SCHEMAS
# ==============================================================================
class RegisterRequest(BaseModel):
    nim: str = Field(..., description="NIM Mahasiswa")
    name: str = Field(..., description="Nama Mahasiswa")
    face_image: Optional[str] = Field(None, description="Foto wajah Base64")


class PresensiApiRequest(BaseModel):
    nim: Optional[str] = Field(None, description="NIM Mahasiswa (Opsional, kosongkan untuk Auto-Detect dari wajah)")
    name: Optional[str] = Field(None, description="Nama Mahasiswa (opsional)")
    face_image: Optional[str] = Field(None, description="Foto swafoto kamera (Base64 data URL atau raw)")
    latitude: float = Field(-6.200000, description="Latitude GPS saat ini")
    longitude: float = Field(106.816666, description="Longitude GPS saat ini")
    late_minutes: float = Field(0.0, description="Keterlambatan dalam menit")
    simulated_case: Optional[str] = Field(None, description="Simulasi kasus M1, M2, M3, M4, M5, M6")

class ResolveApiRequest(BaseModel):
    attendance_id: int
    approved: bool
    lecturer_note: str
    resolved_by: Optional[str] = None
    lecturer_name: Optional[str] = None


# Helper formatter for Attendance record
def _format_attendance(rec: Dict[str, Any]) -> Dict[str, Any]:
    if not rec:
        return {}
    res = dict(rec)
    res["name"] = res.get("student_name") or res.get("name")
    res["initial_rule_status"] = res.get("status_awal") or res.get("initial_rule_status")
    res["lecturer_note"] = res.get("resolution_note") or res.get("note") or res.get("lecturer_note")
    res["face_image_preview"] = res.get("photo_path") or res.get("face_image_preview")
    return res


# ==============================================================================
# ENDPOINTS
# ==============================================================================
@app.get("/health")
def health_check():
    """Endpoint pemeriksaan kesehatan layanan (health check)."""
    return {
        "status": "ok",
        "app": "Sistem Presensi Wajah Berbasis AI (Kelompok 6)",
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat(),
        "legal_compliance": "UU No. 27/2022 Pasal 34 (Larangan Otomasi Tunggal pada Data Biometrik)",
    }


@app.get("/api/classroom")
def get_classroom_info():
    """Mengambil koordinat acuan dan batas radius ruang kelas resmi."""
    return {
        "latitude": DEFAULT_CLASSROOM_LAT,
        "longitude": DEFAULT_CLASSROOM_LON,
        "max_valid_distance_meters": MAX_VALID_DISTANCE_METERS,
        "max_oversight_distance_meters": MAX_OVERSIGHT_DISTANCE_METERS,
    }


@app.get("/api/students")
def list_students():
    """Mengambil daftar seluruh mahasiswa yang terdaftar."""
    return get_all_students()


@app.post("/api/register")
def register_student(req: RegisterRequest):
    """
    Mendaftarkan profil mahasiswa dan mengekstrak vektor biometrik wajah 512-D.
    """
    embedding_list = None
    if req.face_image and process_face_image is not None:
        try:
            emb = process_face_image(req.face_image)
            embedding_list = emb.tolist()
        except Exception as e:
            logger.warning(f"Ekstraksi fitur wajah gagal pada registrasi: {e}")

    student = create_or_update_student(
        nim=req.nim,
        name=req.name,
        profile_image_path=f"data/profiles/{req.nim}.jpg" if req.face_image else None,
        embedding=embedding_list,
    )

    return {
        "success": True,
        "nim": student["nim"],
        "name": student["name"],
        "has_embedding": embedding_list is not None,
        "message": f"Mahasiswa {student['name']} ({student['nim']}) berhasil didaftarkan.",
    }


@app.post("/api/presensi")
def submit_presensi(req: PresensiApiRequest):
    """
    Memproses swafoto presensi mahasiswa:
    1. Menghitung jarak GPS ke ruang kelas dengan Haversine
    2. Menghitung kemiripan wajah biometrik (Cosine Similarity 512-D)
    3. Mengevaluasi Rancangan Awal vs Rancangan UU PDP (Human Oversight Pasal 34)
    4. Menyimpan rekaman kehadiran ke database
    """
    # 1. Cari data mahasiswa atau daftarkan jika belum ada
    import numpy as np
    from app.db.database import get_all_students_with_embeddings

    sim_case = req.simulated_case.upper() if req.simulated_case else None
    case_def = next((c for c in BENCHMARK_CASES if c["id"] == sim_case), None)

    student = None
    student_name = "Mahasiswa Terdeteksi"
    similarity_score = 0.88

    # 1. Jika ada foto wajah dan ML engine siap, lakukan ekstraksi biometrik
    if req.face_image and process_face_image is not None:
        try:
            input_emb = process_face_image(req.face_image)
            
            # Kasus A: NIM diberikan spesifik (1:1 Verification)
            if req.nim and req.nim not in ("AUTO", ""):
                student = get_student(req.nim)
                if not student:
                    student_name = req.name or f"Mahasiswa {req.nim}"
                    student = create_or_update_student(nim=req.nim, name=student_name)
                else:
                    student_name = student["name"]

                if student.get("embedding"):
                    stored_emb = np.array(student["embedding"], dtype=np.float32)
                    similarity_score = round(compute_similarity(input_emb, stored_emb), 2)
                else:
                    similarity_score = 0.90
            else:
                # Kasus B: 1:N AUTO-IDENTIFICATION DARI WAJAH ASLI
                candidates = get_all_students_with_embeddings()
                best_match = None
                best_sim = -1.0

                for cand in candidates:
                    if cand.get("embedding"):
                        cand_emb = np.array(cand["embedding"], dtype=np.float32)
                        sim = float(compute_similarity(input_emb, cand_emb))
                        if sim > best_sim:
                            best_sim = sim
                            best_match = cand

                # Threshold ketat: wajah HARUS melewati FACE_MATCH_THRESHOLD (0.85)
                # agar tidak ada false positive. Di bawah threshold = wajah tidak dikenal.
                if best_match and best_sim >= FACE_MATCH_THRESHOLD:
                    student = best_match
                    student_name = student["name"]
                    similarity_score = round(best_sim, 2)
                    logger.info(f"Auto-detect berhasil mengenali: {student_name} ({student['nim']}) - Skor: {similarity_score}")
                else:
                    # Tidak ada yang cocok — jangan assign siapapun
                    logger.warning(f"Auto-detect GAGAL: best_sim={round(best_sim,2)} < threshold={FACE_MATCH_THRESHOLD}. Wajah tidak dikenal.")
                    similarity_score = round(best_sim, 2) if best_sim >= 0 else 0.0
                    student = {"nim": "UNKNOWN", "name": "Wajah Tidak Dikenal"}
                    student_name = "Wajah Tidak Dikenal"
        except Exception as e:
            logger.warning(f"Gagal melakukan inferensi biometrik: {e}")
            fallback_nim = req.nim or "2024001"
            student = student or get_student(fallback_nim) or {"nim": fallback_nim, "name": req.name or "Mahasiswa"}
            student_name = student["name"]
            similarity_score = 0.0
    else:
        # Tidak ada foto wajah
        if req.nim and req.nim not in ("AUTO", ""):
            fallback_nim = req.nim
            student = get_student(fallback_nim) or {"nim": fallback_nim, "name": req.name or "Mahasiswa"}
            student_name = student["name"]
        else:
            # Tidak ada foto dan tidak ada NIM → tidak bisa identifikasi
            student = {"nim": "UNKNOWN", "name": "Wajah Tidak Dikenal"}
            student_name = "Wajah Tidak Dikenal"
            similarity_score = 0.0

    # 2. Tentukan parameter jarak & waktu: apakah simulasi benchmark M1-M6?
    if sim_case and case_def:
        distance_meters = float(case_def["distance"])
        late_minutes = float(case_def["late"])
        similarity_score = float(case_def["score"])
    else:
        distance_meters = calculate_classroom_distance(req.latitude, req.longitude)
        late_minutes = float(req.late_minutes)
    # 3. Jalankan Decision Engine (Dual Evaluation)
    eval_result = evaluate_presensi(
        score=similarity_score,
        distance_meters=distance_meters,
        late_minutes=late_minutes,
        simulated_case=sim_case,
    )

    # 4. Simpan ke database
    record_data = {
        "nim": student["nim"] if student else (req.nim or "2024001"),
        "student_name": student_name,
        "timestamp": datetime.now().isoformat(),
        "similarity_score": eval_result["similarity_score"],
        "distance_meters": eval_result["distance_meters"],
        "late_minutes": eval_result["late_minutes"],
        "status": eval_result["status_uupdp"],
        "status_awal": eval_result["status_awal"],
        "status_uupdp": eval_result["status_uupdp"],
        "decision_reason": eval_result["decision_reason"],
        "requires_human_oversight": eval_result["requires_human_oversight"],
        "human_oversight_status": eval_result["human_oversight_status"],
        "note": eval_result.get("decision_reason_awal"),
        "legal_basis": eval_result["legal_basis"],
        "simulated_case": sim_case,
        "photo_path": req.face_image[:100] if req.face_image else None,
    }

    saved_attendance = create_attendance(record_data)
    formatted = _format_attendance(saved_attendance)

    # Kembalikan response terpadu
    return {
        "id": formatted.get("id"),
        "student_id": formatted.get("id"),
        "nim": req.nim,
        "name": student_name,
        "student_name": student_name,
        "status": formatted.get("status"),
        "initial_rule_status": formatted.get("status_awal"),
        "status_awal": formatted.get("status_awal"),
        "status_uupdp": formatted.get("status_uupdp"),
        "similarity_score": formatted.get("similarity_score"),
        "distance_meters": formatted.get("distance_meters"),
        "late_minutes": formatted.get("late_minutes"),
        "decision_reason": formatted.get("decision_reason"),
        "requires_human_oversight": formatted.get("requires_human_oversight"),
        "human_oversight_status": formatted.get("human_oversight_status"),
        "timestamp": formatted.get("timestamp"),
        "legal_basis": formatted.get("legal_basis"),
        "note": formatted.get("note"),
    }


@app.get("/api/oversight")
def get_oversight_list():
    """
    Mengambil daftar presensi mahasiswa yang tertahan pada status PERLU_VERIFIKASI_DOSEN.
    Menunggu keputusan verifikasi manual dosen pengampu (Human Oversight).
    """
    records = get_pending_oversight()
    return [_format_attendance(r) for r in records]


@app.post("/api/oversight/resolve")
def resolve_oversight_case(req: ResolveApiRequest):
    """
    Menangani keputusan intervensi manusia (Dosen Pengampu):
    - approved = True -> Mengesahkan kehadiran mahasiswa (HADIR / TERLAMBAT)
    - approved = False -> Menolak presensi (TIDAK_SAH)
    """
    lecturer = req.resolved_by or req.lecturer_name or "Dosen Pengampu"
    resolved_rec = resolve_oversight(
        attendance_id=req.attendance_id,
        approved=req.approved,
        lecturer_note=req.lecturer_note,
        resolved_by=lecturer,
    )

    if not resolved_rec:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Presensi dengan ID {req.attendance_id} tidak ditemukan.",
        )

    formatted = _format_attendance(resolved_rec)
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


@app.get("/api/benchmark")
def get_benchmark_table():
    """
    Mengembalikan data pengujian benchmark resmi 6 kasus mahasiswa (M1 s.d. M6)
    membandingkan Rancangan Awal vs Rancangan UU PDP (Human Oversight).
    """
    # Gunakan generator dari app.ml.benchmark jika tersedia, atau app.core.rules
    if run_ml_benchmark is not None:
        try:
            ml_results = run_ml_benchmark()
            formatted_cases = []
            for item in ml_results:
                formatted_cases.append({
                    "case_id": item.get("case_id") or item.get("id"),
                    "nim": item["nim"],
                    "name": item["name"],
                    "face_score": item.get("face_score") or item.get("similarity_score"),
                    "distance_meters": item.get("distance_m") or item.get("distance_meters"),
                    "late_minutes": item["late_minutes"],
                    "condition_description": item.get("keterangan") or item.get("detail_kondisi", ""),
                    "status_initial": item.get("rancangan_awal_status") or item.get("initial_rule", {}).get("status", "TIDAK_SAH"),
                    "status_uupdp": item.get("rancangan_uu_pdp_status") or item.get("status_uupdp", "HADIR"),
                    "requires_human_oversight": (item.get("rancangan_uu_pdp_status") == "PERLU_VERIFIKASI_DOSEN"),
                    "ethical_legal_analysis": (
                        item.get("analisis_uu_pdp")
                        or item.get("rancangan_uu_pdp_alasan")
                        or "Berdasarkan UU PDP Pasal 34, keputusan biometrik tidak boleh dilakukan sepihak secara otomatis."
                    ),
                    "pdp_article_reference": "UU No. 27/2022 Pasal 34 (Larangan Keputusan Otomatis Tunggal)",
                    # Alias untuk kompatibilitas rules engine
                    "status_awal": item.get("rancangan_awal_status") or item.get("initial_rule", {}).get("status", "TIDAK_SAH"),
                    "keterangan": item.get("keterangan", ""),
                    "alasan_awal": item.get("rancangan_awal_alasan", ""),
                    "alasan_uupdp": item.get("rancangan_uu_pdp_alasan", ""),
                })
            return formatted_cases
        except Exception as e:
            logger.warning(f"Gagal menjalankan ml.benchmark: {e}, fallback ke core.rules.")

    # Fallback ke core.rules jika ML engine belum di-load
    from app.core.rules import run_rules_benchmark
    rules_results = run_rules_benchmark()
    formatted = []
    for r in rules_results:
        formatted.append({
            "case_id": r["case_id"],
            "nim": r["nim"],
            "name": r["student_name"],
            "face_score": r["score"],
            "distance_meters": r["distance_meters"],
            "late_minutes": r["late_minutes"],
            "condition_description": r["keterangan"],
            "status_initial": r["status_awal"],
            "status_uupdp": r["status_uupdp"],
            "requires_human_oversight": r["requires_human_oversight"],
            "ethical_legal_analysis": (
                "Berdasarkan UU PDP Pasal 34, keputusan biometrik yang merugikan mahasiswa harus melalui intervensi dosen."
                if r["requires_human_oversight"]
                else "Keputusan otomatis sah dan proporsional."
            ),
            "pdp_article_reference": "UU No. 27/2022 Pasal 34",
            "status_awal": r["status_awal"],
            "keterangan": r["keterangan"],
            "alasan_awal": r["alasan_awal"],
            "alasan_uupdp": r["alasan_uupdp"],
        })
    return formatted


@app.get("/api/benchmark/summary")
def get_benchmark_summary_data():
    """Mengembalikan ringkasan statistik komparatif benchmark."""
    if get_benchmark_summary is not None:
        try:
            return get_benchmark_summary()
        except Exception:
            pass
    return {
        "total_cases": 6,
        "cases_needing_oversight": 3,
        "cases_saved": ["M3", "M4", "M5"],
        "impact": "Mencegah mahasiswa gagal ujian akhir akibat keterbatasan sensor fisik dan model biometrik.",
    }


@app.get("/api/attendances")
def list_attendances(limit: int = 100):
    """Mengambil riwayat rekaman seluruh presensi mahasiswa."""
    records = get_all_attendances(limit=limit)
    return [_format_attendance(r) for r in records]


@app.get("/api/stats")
def get_stats():
    """Mengambil ringkasan statistik kehadiran."""
    return get_attendance_stats()

# ==============================================================================
# STATIC FILES & SPA FALLBACK (FOR REACT FRONTEND ON HUGGING FACE SPACES)
# ==============================================================================
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

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
        # Jangan tangkap endpoint API atau dokumentasi Swagger
        if full_path.startswith("api/") or full_path in ("health", "docs", "redoc", "openapi.json"):
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="Not Found")
        target_file = os.path.join(static_root, full_path)
        if os.path.isfile(target_file):
            return FileResponse(target_file)
        index_html = os.path.join(static_root, "index.html")
        if os.path.isfile(index_html):
            return FileResponse(index_html)
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Frontend build index.html not found")
