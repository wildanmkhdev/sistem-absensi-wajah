"""
Benchmark & policy evaluation for Modul 13 (M1-M6).

This module is a thin adapter over ``app.core.rules``. It no longer reimplements
the decision logic, so the live presensi flow and the benchmark can never drift
apart.

Important: M1-M6 are *policy* cases with fixed parameters (score, distance,
late minutes). They do not execute the face engine. A separate engine
calibration report is produced by ``scripts/calibrate_face.py``.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from app.core.rules import (
    BENCHMARK_CASES,
    evaluate_presensi,
    evaluate_rancangan_awal,
    evaluate_rancangan_uupdp,
)

__all__ = [
    "BENCHMARK_CASES",
    "evaluate_initial_rule",
    "evaluate_uu_pdp_rule",
    "run_benchmark",
    "get_benchmark_summary",
]

_CASE_DETAILS: Dict[str, str] = {
    "M1": "Wajah teridentifikasi jelas, berada di dalam ruang kelas, dan tiba tepat waktu.",
    "M2": "Seluruh parameter berada tepat pada batas toleransi sistem.",
    "M3": "Mahasiswa hadir tepat waktu, namun kacamata baru dan ruangan redup menurunkan skor.",
    "M4": "Wajah sangat cocok, tetapi posisi di sudut gedung beton menyebabkan drift GPS.",
    "M5": "Mahasiswa hadir fisik, namun foto profil lama sehingga kemiripan rendah.",
    "M6": "Wajah dan lokasi valid, tetapi tiba 28 menit setelah perkuliahan dimulai.",
}


def evaluate_initial_rule(
    face_score: float, distance_m: float, late_minutes: float
) -> Dict[str, Any]:
    """Rigid design evaluation (adapter)."""
    status, reason = evaluate_rancangan_awal(face_score, distance_m, late_minutes)
    return {
        "status": status.value,
        "is_valid": status.value in ("HADIR", "TERLAMBAT"),
        "requires_oversight": False,
        "decision_reason": reason,
    }


def evaluate_uu_pdp_rule(
    face_score: float,
    distance_m: float,
    late_minutes: float,
    context_note: str = "",
) -> Dict[str, Any]:
    """UU PDP design evaluation (adapter)."""
    status, reason, requires_oversight, legal_basis = evaluate_rancangan_uupdp(
        face_score, distance_m, late_minutes
    )
    return {
        "status": status.value,
        "is_valid": status.value in ("HADIR", "TERLAMBAT"),
        "requires_oversight": requires_oversight,
        "decision_reason": reason,
        "pdp_article": legal_basis,
        "oversight_level": (
            "Human-in-the-loop" if requires_oversight else "Automated"
        ),
        "impact_mitigation": (
            "Kasus ambigu dialihkan ke dosen agar tidak ada kerugian sepihak."
            if requires_oversight
            else "Keputusan otomatis tidak menimbulkan kerugian."
        ),
    }


def run_benchmark() -> List[Dict[str, Any]]:
    """Run all M1-M6 cases through the shared rules engine."""
    results: List[Dict[str, Any]] = []

    for case in BENCHMARK_CASES:
        case_id = case["id"]
        score = float(case["score"])
        distance = float(case["distance"])
        late = float(case["late"])

        initial = evaluate_initial_rule(score, distance, late)
        pdp = evaluate_uu_pdp_rule(score, distance, late, context_note=case["keterangan"])
        combined = evaluate_presensi(
            score=score,
            distance_meters=distance,
            late_minutes=late,
            simulated_case=case_id,
        )

        rescued = (
            initial["status"] == "TIDAK_SAH"
            and pdp["status"] == "PERLU_VERIFIKASI_DOSEN"
        )

        results.append(
            {
                "case_id": case_id,
                "id": case_id,
                "name": case["name"],
                "nim": case["nim"],
                "keterangan": case["keterangan"],
                "detail_kondisi": _CASE_DETAILS.get(case_id, case["keterangan"]),
                "face_score": score,
                "similarity_score": score,
                "distance_m": distance,
                "distance_meters": distance,
                "late_minutes": late,
                "rancangan_awal_status": initial["status"],
                "rancangan_awal_alasan": initial["decision_reason"],
                "initial_rule": initial,
                "rancangan_uu_pdp_status": pdp["status"],
                "rancangan_uu_pdp_alasan": pdp["decision_reason"],
                "requires_human_oversight": pdp["requires_oversight"],
                "pdp_article_reference": pdp["pdp_article"],
                "oversight_level": pdp["oversight_level"],
                "impact_mitigation": pdp["impact_mitigation"],
                "pdp_rule": pdp,
                "status_berubah": initial["status"] != pdp["status"],
                "rescued_from_false_rejection": rescued,
                "kesimpulan_perbandingan": (
                    f"Status berubah dari [{initial['status']}] menjadi "
                    f"[{pdp['status']}]. Hak mahasiswa terlindungi dari otomasi tunggal."
                    if initial["status"] != pdp["status"]
                    else f"Status konsisten [{pdp['status']}]."
                ),
                # Convenience aliases consumed by /api/benchmark.
                "status_awal": combined["status_awal"],
                "status_uupdp": combined["status_uupdp"],
            }
        )

    return results


def get_benchmark_summary(results: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
    """Aggregate comparison metrics for M1-M6."""
    if results is None:
        results = run_benchmark()

    total = len(results)
    awal_counts: Dict[str, int] = {"HADIR": 0, "TERLAMBAT": 0, "TIDAK_SAH": 0}
    pdp_counts: Dict[str, int] = {
        "HADIR": 0,
        "TERLAMBAT": 0,
        "PERLU_VERIFIKASI_DOSEN": 0,
        "TIDAK_SAH": 0,
    }
    rescued: List[str] = []

    for item in results:
        awal_status = item["rancangan_awal_status"]
        pdp_status = item["rancangan_uu_pdp_status"]
        awal_counts[awal_status] = awal_counts.get(awal_status, 0) + 1
        pdp_counts[pdp_status] = pdp_counts.get(pdp_status, 0) + 1
        if item["rescued_from_false_rejection"]:
            rescued.append(item["case_id"])

    return {
        "total_cases": total,
        "rancangan_awal": {
            "distribusi": awal_counts,
            "mahasiswa_dirugikan_otomasi_sepihak": awal_counts["TIDAK_SAH"],
            "persentase_penolakan": round((awal_counts["TIDAK_SAH"] / total) * 100, 1)
            if total
            else 0.0,
        },
        "rancangan_uu_pdp": {
            "distribusi": pdp_counts,
            "mahasiswa_dilindungi_human_oversight": pdp_counts["PERLU_VERIFIKASI_DOSEN"],
            "persentase_human_oversight": round(
                (pdp_counts["PERLU_VERIFIKASI_DOSEN"] / total) * 100, 1
            )
            if total
            else 0.0,
            "penolakan_sepihak_tanpa_hak_keberatan": 0,
        },
        "penyelamatan_keadilan": {
            "kasus_terselamatkan": len(rescued),
            "daftar_kasus": rescued,
            "deskripsi": (
                f"{len(rescued)} dari {total} mahasiswa terselamatkan dari penolakan "
                "otomatis yang merugikan hak mengikuti ujian."
            ),
        },
    }
