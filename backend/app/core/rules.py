"""
Decision engine — Modul 13 Etika AI & UU Pelindungan Data Pribadi (UU 27/2022).

Single source of truth for attendance policy. Both the live presensi flow and
the M1-M6 benchmark call into this module; ``app.ml.benchmark`` only reshapes
the output for the API.

Two designs are compared:
  1. Rancangan Awal  — rigid, fully automatic, no human intervention.
  2. Rancangan UU PDP — human oversight (Pasal 10 & 34) for ambiguous cases.

Face scores are cosine similarities in [0, 1] produced by the ArcFace engine.
Thresholds are model-specific and configurable through environment variables.
"""

from __future__ import annotations

import os
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple

# ==============================================================================
# THRESHOLDS
# ==============================================================================
# Calibrated for ArcFace MobileFaceNet (w600k_mbf):
#   >= 0.55 auto-match (reduces FAR on same-demographic campus pairs)
#   0.40 - 0.55 borderline (glasses/lighting -> human oversight)
#   0.35 - 0.40 low/stale profile (physical presence -> human oversight)
#   <  0.35 clear identity mismatch -> immediate TIDAK_SAH
FACE_MATCH_THRESHOLD: float = float(os.getenv("FACE_MATCH_THRESHOLD", "0.55"))
FACE_BORDERLINE_MIN: float = float(os.getenv("FACE_BORDERLINE_MIN", "0.40"))
FACE_MIN_PLAUSIBLE: float = float(os.getenv("FACE_MIN_PLAUSIBLE", "0.35"))

MAX_VALID_DISTANCE: float = float(os.getenv("MAX_VALID_DISTANCE_METERS", "50"))
MAX_OVERSIGHT_DISTANCE: float = float(os.getenv("MAX_OVERSIGHT_DISTANCE_METERS", "100"))

MAX_ONTIME_LATE_MINUTES: float = float(os.getenv("MAX_ONTIME_LATE_MINUTES", "15"))
MAX_VALID_LATE_MINUTES: float = float(os.getenv("MAX_VALID_LATE_MINUTES", "30"))


class AttendanceStatus(str, Enum):
    HADIR = "HADIR"
    TERLAMBAT = "TERLAMBAT"
    PERLU_VERIFIKASI_DOSEN = "PERLU_VERIFIKASI_DOSEN"
    TIDAK_SAH = "TIDAK_SAH"


class HumanOversightStatus(str, Enum):
    NONE = "NONE"
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


# ==============================================================================
# TIME HELPERS
# ==============================================================================
def _as_utc(value: Any) -> datetime:
    """Coerce a datetime / ISO string into a timezone-aware UTC datetime."""
    if isinstance(value, datetime):
        dt = value
    else:
        text = str(value).strip()
        if text.endswith("Z"):
            text = text[:-1] + "+00:00"
        dt = datetime.fromisoformat(text)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def compute_late_minutes(
    starts_at: Any,
    now: Optional[datetime] = None,
    grace_minutes: float = 0.0,
) -> float:
    """
    Minutes between the session start and the server clock.

    Returns 0.0 when the student is early. The client can never supply this
    value; it is always derived from the session schedule on the server.
    """
    now_utc = _as_utc(now) if now is not None else datetime.now(timezone.utc)
    start_utc = _as_utc(starts_at)
    delta = (now_utc - start_utc).total_seconds() / 60.0 - grace_minutes
    return round(max(0.0, delta), 1)


# ==============================================================================
# 1. RANCANGAN AWAL (RIGID, NO HUMAN OVERSIGHT)
# ==============================================================================
def evaluate_rancangan_awal(
    score: float,
    distance_meters: float,
    late_minutes: float,
    radius_meters: float = MAX_VALID_DISTANCE,
) -> Tuple[AttendanceStatus, str]:
    """
    Rigid baseline: face >= threshold, inside the radius, on time.

    Any ambiguity is rejected automatically — this is the design the UU PDP
    analysis argues against.
    """
    face_valid = score >= FACE_MATCH_THRESHOLD
    loc_valid = distance_meters <= radius_meters

    if not face_valid or not loc_valid:
        reasons = []
        if not face_valid:
            reasons.append(f"Skor wajah {score:.2f} < {FACE_MATCH_THRESHOLD:.2f}")
        if not loc_valid:
            reasons.append(f"Jarak {distance_meters:.1f}m > {radius_meters:.0f}m")
        return (
            AttendanceStatus.TIDAK_SAH,
            f"Presensi ditolak otomatis: {', '.join(reasons)}",
        )

    if late_minutes <= MAX_ONTIME_LATE_MINUTES:
        return (
            AttendanceStatus.HADIR,
            f"Wajah cocok ({score:.2f}), lokasi valid ({distance_meters:.1f}m), "
            f"tepat waktu ({late_minutes:.0f} menit).",
        )
    if late_minutes <= MAX_VALID_LATE_MINUTES:
        return (
            AttendanceStatus.TERLAMBAT,
            f"Wajah cocok ({score:.2f}), lokasi valid ({distance_meters:.1f}m), "
            f"terlambat {late_minutes:.0f} menit (toleransi 16-30 menit).",
        )
    return (
        AttendanceStatus.TIDAK_SAH,
        f"Terlambat {late_minutes:.0f} menit melebihi batas {MAX_VALID_LATE_MINUTES:.0f} menit.",
    )


# ==============================================================================
# 2. RANCANGAN UU PDP (HUMAN OVERSIGHT)
# ==============================================================================
def evaluate_rancangan_uupdp(
    score: float,
    distance_meters: float,
    late_minutes: float,
    simulated_case: Optional[str] = None,
    radius_meters: float = MAX_VALID_DISTANCE,
    oversight_radius_meters: float = MAX_OVERSIGHT_DISTANCE,
) -> Tuple[AttendanceStatus, str, bool, str]:
    """
    UU PDP design: only objective, clearly attributable failures are rejected
    automatically. Ambiguity is escalated to the lecturer.

    Fatal (auto-reject):
      * late > 30 minutes
      * distance > oversight radius (outside campus perimeter)
      * score < FACE_MIN_PLAUSIBLE (identity does not correlate at all)

    Human oversight:
      * borderline face score (glasses / poor lighting)
      * GPS drift inside a concrete building
      * stale profile photo / natural appearance change

    Returns (status, reason, requires_oversight, legal_basis).
    """
    legal_basis = (
        "UU 27/2022 Pasal 10 (hak keberatan atas keputusan otomatis) dan "
        "Pasal 34 (kewajiban penilaian dampak untuk pemrosesan berisiko tinggi)."
    )

    # --- Fatal, objective violations -----------------------------------------
    if late_minutes > MAX_VALID_LATE_MINUTES:
        return (
            AttendanceStatus.TIDAK_SAH,
            f"Pelanggaran waktu: keterlambatan {late_minutes:.0f} menit melebihi "
            f"batas {MAX_VALID_LATE_MINUTES:.0f} menit.",
            False,
            "Pelanggaran objektif jadwal perkuliahan.",
        )

    if distance_meters > oversight_radius_meters:
        return (
            AttendanceStatus.TIDAK_SAH,
            f"Pelanggaran lokasi: jarak {distance_meters:.1f}m di luar perimeter "
            f"({oversight_radius_meters:.0f}m). Indikasi presensi jarak jauh.",
            False,
            "Terdeteksi di luar perimeter fisik institusi.",
        )

    if score < FACE_MIN_PLAUSIBLE:
        return (
            AttendanceStatus.TIDAK_SAH,
            f"Identitas tidak cocok: skor {score:.2f} < batas minimal "
            f"{FACE_MIN_PLAUSIBLE:.2f}.",
            False,
            "Data biometrik tidak berkorelasi dengan subjek terdaftar.",
        )

    # --- Clear pass -----------------------------------------------------------
    if score >= FACE_MATCH_THRESHOLD and distance_meters <= radius_meters:
        if late_minutes <= MAX_ONTIME_LATE_MINUTES:
            return (
                AttendanceStatus.HADIR,
                f"Presensi sah: wajah cocok ({score:.2f} >= {FACE_MATCH_THRESHOLD:.2f}), "
                f"lokasi valid ({distance_meters:.1f}m <= {radius_meters:.0f}m), "
                f"tepat waktu ({late_minutes:.0f} menit).",
                False,
                "Pemrosesan otomatis tidak menimbulkan kerugian bagi mahasiswa.",
            )
        return (
            AttendanceStatus.TERLAMBAT,
            f"Presensi terlambat: wajah cocok ({score:.2f}), lokasi valid "
            f"({distance_meters:.1f}m), keterlambatan {late_minutes:.0f} menit.",
            False,
            "Sesuai regulasi akademik keterlambatan 16-30 menit.",
        )

    # --- Ambiguity: escalate to a human --------------------------------------
    reasons: List[str] = []

    if FACE_BORDERLINE_MIN <= score < FACE_MATCH_THRESHOLD and distance_meters <= radius_meters:
        reasons.append(
            f"Skor wajah ambang batas ({score:.2f} dalam rentang "
            f"{FACE_BORDERLINE_MIN:.2f}-{FACE_MATCH_THRESHOLD:.2f}); kemungkinan "
            "kacamata baru, perubahan tata rias, atau pencahayaan redup."
        )

    if score >= FACE_MATCH_THRESHOLD and radius_meters < distance_meters <= oversight_radius_meters:
        reasons.append(
            f"Wajah cocok ({score:.2f}) namun GPS {distance_meters:.1f}m berada di "
            f"rentang drift gedung ({radius_meters:.0f}-{oversight_radius_meters:.0f}m)."
        )

    if score < FACE_BORDERLINE_MIN and distance_meters <= radius_meters:
        reasons.append(
            f"Skor biometrik rendah ({score:.2f}) dengan lokasi dan waktu yang sah; "
            "kemungkinan foto profil lama atau perubahan fisik wajar."
        )

    if not reasons:
        reasons.append(
            f"Kombinasi parameter ambigu (skor={score:.2f}, jarak={distance_meters:.1f}m, "
            f"terlambat={late_minutes:.0f} menit); memerlukan peninjauan manusia."
        )

    return (
        AttendanceStatus.PERLU_VERIFIKASI_DOSEN,
        "Dialihkan ke Dosen Pengampu: " + " | ".join(reasons),
        True,
        legal_basis,
    )


# ==============================================================================
# 3. COMBINED EVALUATION
# ==============================================================================
def evaluate_presensi(
    score: float,
    distance_meters: float,
    late_minutes: float,
    simulated_case: Optional[str] = None,
    radius_meters: float = MAX_VALID_DISTANCE,
    oversight_radius_meters: float = MAX_OVERSIGHT_DISTANCE,
) -> Dict[str, Any]:
    """Run both designs and return a comparative result."""
    status_awal, reason_awal = evaluate_rancangan_awal(
        score=score,
        distance_meters=distance_meters,
        late_minutes=late_minutes,
        radius_meters=radius_meters,
    )

    status_uupdp, reason_uupdp, requires_oversight, legal_note = evaluate_rancangan_uupdp(
        score=score,
        distance_meters=distance_meters,
        late_minutes=late_minutes,
        simulated_case=simulated_case,
        radius_meters=radius_meters,
        oversight_radius_meters=oversight_radius_meters,
    )

    return {
        "status": status_uupdp.value,
        "status_awal": status_awal.value,
        "status_uupdp": status_uupdp.value,
        "similarity_score": round(score, 2),
        "distance_meters": round(distance_meters, 1),
        "late_minutes": round(late_minutes, 1),
        "decision_reason": reason_uupdp,
        "decision_reason_awal": reason_awal,
        "requires_human_oversight": requires_oversight,
        "human_oversight_status": (
            HumanOversightStatus.PENDING.value
            if requires_oversight
            else HumanOversightStatus.NONE.value
        ),
        "legal_basis": legal_note,
        "simulated_case": simulated_case,
    }


# ==============================================================================
# 4. OFFICIAL BENCHMARK CASES (M1 - M6)
# ==============================================================================
# Scores are expressed on the ArcFace cosine scale:
#   >= 0.55 match, 0.40-0.55 borderline, 0.35-0.40 stale/low, < 0.35 mismatch.
BENCHMARK_CASES: List[Dict[str, Any]] = [
    {
        "id": "M1",
        "name": "Arya Pratama",
        "nim": "210101",
        "score": 0.82,
        "distance": 20.0,
        "late": 5.0,
        "keterangan": "Kondisi ideal, pencahayaan baik, tepat waktu.",
    },
    {
        "id": "M2",
        "name": "Budi Santoso",
        "nim": "210102",
        "score": 0.55,
        "distance": 50.0,
        "late": 15.0,
        "keterangan": "Tepat di ambang batas skor (0.55), jarak (50m), dan waktu (15m).",
    },
    {
        "id": "M3",
        "name": "Citra Dewi",
        "nim": "210103",
        "score": 0.44,
        "distance": 15.0,
        "late": 3.0,
        "keterangan": "Kacamata baru dan pencahayaan redup (skor 0.44 di bawah 0.55).",
    },
    {
        "id": "M4",
        "name": "Dodi Wijaya",
        "nim": "210104",
        "score": 0.88,
        "distance": 70.0,
        "late": 0.0,
        "keterangan": "Duduk di sudut ruang besar gedung beton, GPS drift 70m.",
    },
    {
        "id": "M5",
        "name": "Eka Saputra",
        "nim": "210105",
        "score": 0.36,
        "distance": 10.0,
        "late": 2.0,
        "keterangan": "Foto profil lama (6 tahun), hadir fisik di kelas.",
    },
    {
        "id": "M6",
        "name": "Fajar Nugraha",
        "nim": "210106",
        "score": 0.80,
        "distance": 30.0,
        "late": 28.0,
        "keterangan": "Hadir terlambat 28 menit (dalam rentang 16-30 menit).",
    },
]


def run_rules_benchmark() -> List[Dict[str, Any]]:
    """Comparative M1-M6 table (policy simulation only, no images involved)."""
    results = []
    for case in BENCHMARK_CASES:
        eval_result = evaluate_presensi(
            score=case["score"],
            distance_meters=case["distance"],
            late_minutes=case["late"],
            simulated_case=case["id"],
        )
        results.append(
            {
                "case_id": case["id"],
                "student_name": case["name"],
                "nim": case["nim"],
                "score": case["score"],
                "distance_meters": case["distance"],
                "late_minutes": case["late"],
                "keterangan": case["keterangan"],
                "status_awal": eval_result["status_awal"],
                "status_uupdp": eval_result["status_uupdp"],
                "selisih_kebijakan": (
                    "INTERVENSI DOSEN DIBUTUHKAN"
                    if eval_result["requires_human_oversight"]
                    else "SEPAKAT"
                ),
                "alasan_awal": eval_result["decision_reason_awal"],
                "alasan_uupdp": eval_result["decision_reason"],
                "requires_human_oversight": eval_result["requires_human_oversight"],
            }
        )
    return results
