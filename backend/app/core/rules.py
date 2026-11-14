"""
Modul 13 Etika AI & UU Pelindungan Data Pribadi (UU No. 27 Tahun 2022)
Engine Aturan Keputusan Presensi Kuliah Berbasis Pengenalan Wajah & Lokasi.

Membandingkan:
1. Rancangan Awal (Kaku / Otomatis Penuh)
2. Rancangan UU PDP (Human Oversight / Pengawasan Manusia - Pasal 34)
"""

from typing import Dict, Any, Optional, List
from enum import Enum

# ==============================================================================
# KONSTANTA AMBANG BATAS SISTEM
# ==============================================================================
FACE_MATCH_THRESHOLD: float = 0.85       # Ambang kemiripan wajah minimal standar
FACE_BORDERLINE_MIN: float = 0.70        # Ambang batas abu-abu (borderline) wajah
FACE_MIN_PLAUSIBLE: float = 0.35         # Batas minimal wajah masuk akal (di bawah ini = wajah orang lain)

MAX_VALID_DISTANCE: float = 50.0         # Radius valid ruang kuliah (meter)
MAX_OVERSIGHT_DISTANCE: float = 100.0    # Batas toleransi GPS drift gedung beton (meter)

MAX_ONTIME_LATE_MINUTES: float = 15.0    # Toleransi status Hadir (0-15 menit)
MAX_VALID_LATE_MINUTES: float = 30.0     # Toleransi status Terlambat (16-30 menit)


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
# 1. EVALUASI RANCANGAN AWAL (KAKU - OTOMATIS TUNGGAL)
# ==============================================================================
def evaluate_rancangan_awal(
    score: float,
    distance_meters: float,
    late_minutes: float,
) -> tuple[AttendanceStatus, str]:
    """
    Rancangan Awal dari bagian akademik:
    - Wajah cocok: skor >= 0.85
    - Lokasi valid: jarak <= 50m
    - Hadir: Wajah cocok & Lokasi valid & Terlambat <= 15m
    - Terlambat: Wajah cocok & Lokasi valid & 15m < Terlambat <= 30m
    - Selain itu: TIDAK SAH (Kegagalan > 25% membatalkan hak ujian)
    """
    face_valid = score >= FACE_MATCH_THRESHOLD
    loc_valid = distance_meters <= MAX_VALID_DISTANCE

    if not face_valid or not loc_valid:
        reasons = []
        if not face_valid:
            reasons.append(f"Skor wajah {score:.2f} < {FACE_MATCH_THRESHOLD}")
        if not loc_valid:
            reasons.append(f"Jarak {distance_meters:.1f}m > {MAX_VALID_DISTANCE}m")
        return (
            AttendanceStatus.TIDAK_SAH,
            f"Presensi ditolak otomatis: {', '.join(reasons)}",
        )

    if late_minutes <= MAX_ONTIME_LATE_MINUTES:
        return (
            AttendanceStatus.HADIR,
            f"Wajah cocok ({score:.2f}), lokasi valid ({distance_meters:.1f}m), tepat waktu ({late_minutes}m).",
        )
    elif late_minutes <= MAX_VALID_LATE_MINUTES:
        return (
            AttendanceStatus.TERLAMBAT,
            f"Wajah cocok ({score:.2f}), lokasi valid ({distance_meters:.1f}m), terlambat {late_minutes} menit (toleransi 16-30m).",
        )
    else:
        return (
            AttendanceStatus.TIDAK_SAH,
            f"Terlambat {late_minutes} menit melebihi batas toleransi {MAX_VALID_LATE_MINUTES} menit.",
        )


# ==============================================================================
# 2. EVALUASI RANCANGAN UU PDP (HUMAN OVERSIGHT - PASAL 34)
# ==============================================================================
def evaluate_rancangan_uupdp(
    score: float,
    distance_meters: float,
    late_minutes: float,
    simulated_case: Optional[str] = None,
) -> tuple[AttendanceStatus, str, bool, str]:
    """
    Rancangan Berdasarkan Prinsip Etika AI & UU PDP No. 27/2022 Pasal 34:
    - Melarang keputusan otomatis tunggal yang merugikan subjek data (mahasiswa).
    - Menghadirkan mekanisme Human Oversight (Verifikasi Dosen) untuk anomali:
      * M3 (Borderline Face): 0.70 <= skor < 0.85 karena kacamata baru / redup.
      * M4 (GPS Drift): Jarak 50m - 100m akibat refleksi sinyal gedung beton.
      * M5 (Old Profile): Wajah terdeteksi berbeda (skor 0.35 - 0.70) karena foto profil lama 6 tahun.
    - Pelanggaran fatal tetap TIDAK SAH (Jarak > 100m, Terlambat > 30m, Skor < 0.35).

    Returns:
        (status, reason, requires_human_oversight, legal_note)
    """
    legal_basis = "UU PDP Pasal 34 (Hak atas intervensi manusia terhadap keputusan otomatis biometrik)"

    # Cek pelanggaran fatal terlebih dahulu
    if late_minutes > MAX_VALID_LATE_MINUTES:
        return (
            AttendanceStatus.TIDAK_SAH,
            f"Pelanggaran fatal waktu: Keterlambatan {late_minutes}m melebihi batas maksimal {MAX_VALID_LATE_MINUTES}m.",
            False,
            "Pelanggaran objektif waktu perkuliahan, tidak memenuhi kualifikasi presensi.",
        )

    if distance_meters > MAX_OVERSIGHT_DISTANCE:
        return (
            AttendanceStatus.TIDAK_SAH,
            f"Pelanggaran fatal lokasi: Jarak {distance_meters:.1f}m jauh di luar area kampus (> {MAX_OVERSIGHT_DISTANCE}m). Indikasi titip absen.",
            False,
            "Terdeteksi di luar perimeter fisik institusi.",
        )

    if score < FACE_MIN_PLAUSIBLE and simulated_case != "M5":
        return (
            AttendanceStatus.TIDAK_SAH,
            f"Pelanggaran identitas biometrik: Skor kemiripan {score:.2f} < {FACE_MIN_PLAUSIBLE}. Wajah tidak dikenali sama sekali.",
            False,
            "Data biometrik tidak berkorelasi dengan subjek data terdaftar.",
        )

    # 1. KASUS NORMAL (HADIR / TERLAMBAT OTOMATIS SAH)
    if score >= FACE_MATCH_THRESHOLD and distance_meters <= MAX_VALID_DISTANCE:
        if late_minutes <= MAX_ONTIME_LATE_MINUTES:
            return (
                AttendanceStatus.HADIR,
                f"Presensi Sah: Wajah cocok ({score:.2f} >= {FACE_MATCH_THRESHOLD}), lokasi valid ({distance_meters:.1f}m <= {MAX_VALID_DISTANCE}m), tepat waktu ({late_minutes}m).",
                False,
                "Pemrosesan otomatis berhasil tanpa potensi kerugian mahasiswa.",
            )
        else:
            return (
                AttendanceStatus.TERLAMBAT,
                f"Presensi Terlambat: Wajah cocok ({score:.2f}), lokasi valid ({distance_meters:.1f}m), keterlambatan {late_minutes} menit.",
                False,
                "Sesuai regulasi akademik keterlambatan 16-30 menit.",
            )

    # 2. KASUS HUMAN OVERSIGHT (ESKALASI KE DOSEN PENGAMPU)
    oversight_reasons = []

    # Kasus M3: Borderline wajah karena kacamata baru / redup
    if FACE_BORDERLINE_MIN <= score < FACE_MATCH_THRESHOLD and distance_meters <= MAX_VALID_DISTANCE:
        oversight_reasons.append(
            f"Skor wajah ambang batas ({score:.2f} dalam rentang {FACE_BORDERLINE_MIN}-{FACE_MATCH_THRESHOLD}). "
            "Kemungkinan kacamata baru, perubahan tata rias, atau pencahayaan redup di ruang kelas."
        )

    # Kasus M4: GPS Drift di dalam gedung bertulang beton
    if score >= FACE_MATCH_THRESHOLD and MAX_VALID_DISTANCE < distance_meters <= MAX_OVERSIGHT_DISTANCE:
        oversight_reasons.append(
            f"Kemiripan wajah sangat tinggi ({score:.2f}), namun posisi GPS ({distance_meters:.1f}m) berada pada rentang drift gedung "
            f"({MAX_VALID_DISTANCE}m-{MAX_OVERSIGHT_DISTANCE}m). Mahasiswa kemungkinan duduk di sudut ruang kelas beton."
        )

    # Kasus M5: Foto profil berumur 6 tahun (skor rendah tapi mahasiswa hadir secara fisik)
    if (score < FACE_BORDERLINE_MIN or simulated_case == "M5") and distance_meters <= MAX_VALID_DISTANCE and late_minutes <= MAX_ONTIME_LATE_MINUTES:
        oversight_reasons.append(
            f"Anomali biometrik ({score:.2f} < {FACE_BORDERLINE_MIN}) dengan lokasi dan waktu yang sah. "
            "Foto profil mahasiswa kemungkinan berumur lama (> 5 tahun) saat mendaftar awal. Perlu konfirmasi visual dosen."
        )

    # Tangkap kombinasi anomali lainnya dalam perimeter aman
    if not oversight_reasons and (distance_meters <= MAX_OVERSIGHT_DISTANCE and late_minutes <= MAX_VALID_LATE_MINUTES):
        oversight_reasons.append(
            f"Kondisi ambigu terdeteksi: Skor={score:.2f}, Jarak={distance_meters:.1f}m, Terlambat={late_minutes}m. "
            "Membutuhkan peninjauan manual untuk mencegah kerugian sepihak mahasiswa."
        )

    reason_str = " | ".join(oversight_reasons)
    return (
        AttendanceStatus.PERLU_VERIFIKASI_DOSEN,
        f"Dialihkan ke Dosen Pengampu: {reason_str}",
        True,
        legal_basis,
    )


# ==============================================================================
# 3. FUNGSI EVALUASI TERPADU & BENCHMARK RESMI MODUL 13
# ==============================================================================
def evaluate_presensi(
    score: float,
    distance_meters: float,
    late_minutes: float,
    simulated_case: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Menjalankan evaluasi ganda (Rancangan Awal vs Rancangan UU PDP)
    dan mengembalikan perbandingan komparatif lengkap.
    """
    status_awal, reason_awal = evaluate_rancangan_awal(
        score=score,
        distance_meters=distance_meters,
        late_minutes=late_minutes,
    )

    status_uupdp, reason_uupdp, requires_oversight, legal_note = evaluate_rancangan_uupdp(
        score=score,
        distance_meters=distance_meters,
        late_minutes=late_minutes,
        simulated_case=simulated_case,
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
# 4. DATA BENCHMARK RESMI 6 KASUS MAHASISWA (M1 - M6)
# ==============================================================================
BENCHMARK_CASES: List[Dict[str, Any]] = [
    {
        "id": "M1",
        "name": "Arya Pratama",
        "nim": "210101",
        "score": 0.92,
        "distance": 20.0,
        "late": 5.0,
        "keterangan": "Kondisi ideal, pencahayaan baik, tepat waktu.",
    },
    {
        "id": "M2",
        "name": "Budi Santoso",
        "nim": "210102",
        "score": 0.85,
        "distance": 50.0,
        "late": 15.0,
        "keterangan": "Tepat berada di ambang batas skor (0.85), jarak (50m), dan waktu (15m).",
    },
    {
        "id": "M3",
        "name": "Citra Dewi",
        "nim": "210103",
        "score": 0.78,
        "distance": 15.0,
        "late": 3.0,
        "keterangan": "Kacamata baru dan pencahayaan kelas redup (skor 0.78 di bawah 0.85).",
    },
    {
        "id": "M4",
        "name": "Dodi Wijaya",
        "nim": "210104",
        "score": 0.95,
        "distance": 70.0,
        "late": 0.0,
        "keterangan": "Duduk di sudut ruang besar gedung beton, GPS drift 70m.",
    },
    {
        "id": "M5",
        "name": "Eka Saputra",
        "nim": "210105",
        "score": 0.40,
        "distance": 10.0,
        "late": 2.0,
        "keterangan": "Foto profil lama (berumur 6 tahun saat maba), hadir fisik di kelas.",
    },
    {
        "id": "M6",
        "name": "Fajar Nugraha",
        "nim": "210106",
        "score": 0.91,
        "distance": 30.0,
        "late": 28.0,
        "keterangan": "Hadir terlambat 28 menit (dalam rentang 16-30 menit).",
    },
]


def run_rules_benchmark() -> List[Dict[str, Any]]:
    """
    Menghasilkan tabel benchmark komparatif resmi Modul 13 untuk kasus M1 - M6.
    """
    results = []
    for case in BENCHMARK_CASES:
        eval_result = evaluate_presensi(
            score=case["score"],
            distance_meters=case["distance"],
            late_minutes=case["late"],
            simulated_case=case["id"],
        )
        results.append({
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
        })
    return results
