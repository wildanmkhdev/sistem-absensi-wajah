"""
Modul Benchmark & Evaluasi Kebijakan (Modul 13 & UU PDP)
Studi Kasus Kelompok 6: Sistem Presensi Kuliah Berbasis Pengenalan Wajah

Modul ini mengimplementasikan perbandingan sistematis antara:
1. Rancangan Awal (Aturan Kaku Tanpa Human Oversight)
2. Rancangan UU PDP (Sistem Etis Berbasis Human-in-the-Loop Sesuai UU No. 27/2022)

Untuk 6 Kasus Mahasiswa Uji (M1 s.d. M6):
- M1: Skor 0.92, Jarak 20m, Terlambat 5m  (Normal)
- M2: Skor 0.85, Jarak 50m, Terlambat 15m (Tepat di semua batas)
- M3: Skor 0.78, Jarak 15m, Terlambat 3m  (Kacamata baru, pencahayaan redup)
- M4: Skor 0.95, Jarak 70m, Terlambat 0m  (Duduk di sudut ruang, GPS drift)
- M5: Skor 0.40, Jarak 10m, Terlambat 2m  (Foto profil lama 6 tahun)
- M6: Skor 0.91, Jarak 30m, Terlambat 28m (Terlambat > 15m)
"""

from typing import Dict, List, Any


# Definisi 6 Kasus Baku Mahasiswa sesuai Panduan Studi Kasus Kelompok 6
BENCHMARK_CASES = [
    {
        "id": "M1",
        "name": "Arya Pratama",
        "nim": "210101",
        "score": 0.92,
        "distance": 20.0,
        "late": 5,
        "keterangan": "Normal",
        "detail_kondisi": "Wajah teridentifikasi sangat jelas (0.92), berada di dalam ruang kelas (20m), dan tiba tepat waktu (telat 5 menit)."
    },
    {
        "id": "M2",
        "name": "Budi Santoso",
        "nim": "210102",
        "score": 0.85,
        "distance": 50.0,
        "late": 15,
        "keterangan": "Tepat di semua batas",
        "detail_kondisi": "Parameter berada persis pada batas ambang toleransi sistem (skor 0.85 = batas wajah, jarak 50m = batas radius, keterlambatan 15m = batas hadir)."
    },
    {
        "id": "M3",
        "name": "Citra Dewi",
        "nim": "210103",
        "score": 0.78,
        "distance": 15.0,
        "late": 3,
        "keterangan": "Kacamata baru, pencahayaan redup",
        "detail_kondisi": "Mahasiswa hadir tepat waktu (3 menit) di ruang kelas (15m), namun mengenakan kacamata baru dan ruangan redup sehingga skor sedikit di bawah ambang (0.78 < 0.85)."
    },
    {
        "id": "M4",
        "name": "Dodi Wijaya",
        "nim": "210104",
        "score": 0.95,
        "distance": 70.0,
        "late": 0,
        "keterangan": "Duduk di sudut ruang, GPS drift",
        "detail_kondisi": "Wajah sangat cocok (0.95) dan hadir tanpa terlambat (0 menit). Namun posisi di sudut gedung beton bertingkat menyebabkan deviasi GPS 70 meter (> 50m)."
    },
    {
        "id": "M5",
        "name": "Eka Saputra",
        "nim": "210105",
        "score": 0.40,
        "distance": 10.0,
        "late": 2,
        "keterangan": "Foto profil lama 6 tahun",
        "detail_kondisi": "Mahasiswa benar-benar hadir tepat waktu (2 menit) di kelas (10m), namun foto profil database dibuat 6 tahun lalu sehingga model AI mendeteksi kemiripan rendah (0.40)."
    },
    {
        "id": "M6",
        "name": "Fajar Nugraha",
        "nim": "210106",
        "score": 0.91,
        "distance": 30.0,
        "late": 28,
        "keterangan": "Terlambat > 15m",
        "detail_kondisi": "Wajah cocok (0.91) dan berada di dalam radius kelas (30m), namun datang terlambat 28 menit (memenuhi kriteria status Terlambat 16-30 menit)."
    }
]


def evaluate_initial_rule(face_score: float, distance_m: float, late_minutes: int) -> Dict[str, Any]:
    """
    Evaluasi Presensi Menggunakan Rancangan Awal (Aturan Kaku):
    a. Wajah cocok bila skor >= 0.85
    b. Lokasi valid bila jarak <= 50 meter
    c. Status:
       - HADIR bila wajah cocok, lokasi valid, dan late <= 15 menit
       - TERLAMBAT bila wajah cocok, lokasi valid, dan late > 15 s.d. 30 menit
       - TIDAK_SAH selain kondisi di atas (penolakan otomatis tanpa pengawasan)
    """
    face_valid = face_score >= 0.85
    location_valid = distance_m <= 50.0

    if not face_valid or not location_valid:
        reasons = []
        if not face_valid:
            reasons.append(f"Skor wajah ({face_score:.2f}) < 0.85")
        if not location_valid:
            reasons.append(f"Jarak lokasi ({distance_m:.1f}m) > 50m")
        return {
            "status": "TIDAK_SAH",
            "is_valid": False,
            "requires_oversight": False,
            "decision_reason": "Ditolak otomatis oleh sistem: " + "; ".join(reasons),
            "flaw_analysis": "Otomasi tunggal menolak mahasiswa tanpa memverifikasi anomali sensorik/lingkungan."
        }

    # Wajah cocok dan lokasi valid
    if late_minutes <= 15:
        return {
            "status": "HADIR",
            "is_valid": True,
            "requires_oversight": False,
            "decision_reason": f"Wajah cocok ({face_score:.2f}), lokasi valid ({distance_m:.1f}m), dan tepat waktu ({late_minutes}m <= 15m).",
            "flaw_analysis": "Normal"
        }
    elif 15 < late_minutes <= 30:
        return {
            "status": "TERLAMBAT",
            "is_valid": True,
            "requires_oversight": False,
            "decision_reason": f"Wajah cocok ({face_score:.2f}), lokasi valid ({distance_m:.1f}m), terlambat ({late_minutes} menit: rentang 16-30m).",
            "flaw_analysis": "Normal"
        }
    else:
        return {
            "status": "TIDAK_SAH",
            "is_valid": False,
            "requires_oversight": False,
            "decision_reason": f"Keterlambatan melebihi batas maksimal ({late_minutes} menit > 30 menit).",
            "flaw_analysis": "Keterlambatan fatal"
        }


def evaluate_uu_pdp_rule(face_score: float, distance_m: float, late_minutes: int, context_note: str = "") -> Dict[str, Any]:
    """
    Evaluasi Presensi Menggunakan Rancangan UU PDP (Human Oversight - Human-in-the-Loop):
    Sesuai UU No. 27 Tahun 2022:
    - Pasal 4 ayat (2): Data biometrik adalah Data Pribadi Spesifik.
    - Pasal 10 ayat (1): Hak keberatan atas keputusan otomatis yang berdampak signifikan (larangan ujian).
    - Pasal 16 ayat (2): Prinsip keakuratan, keadilan, dan akuntabilitas pemrosesan data.
    - Pasal 34 ayat (2): Penilaian dampak dan kewajiban intervensi manusia pada pemrosesan berisiko tinggi.

    Kategori Keputusan:
    1. HADIR (Otomatis): Skor >= 0.85, Jarak <= 50m, Terlambat <= 15m
    2. TERLAMBAT (Otomatis): Skor >= 0.85, Jarak <= 50m, Terlambat 16-30m
    3. PERLU_VERIFIKASI_DOSEN (Human Oversight):
       - Skor di ambang batas (0.70 <= skor < 0.85) saat hadir di kelas (jarak <= 50m, late <= 15m) -> Misal M3
       - GPS drift gedung beton (50m < jarak <= 100m) saat wajah sangat cocok (skor >= 0.85, late <= 15m) -> Misal M4
       - Perbedaan wajah / foto profil kadaluarsa (skor < 0.70) namun berada di ruang kelas (jarak <= 50m, late <= 15m) -> Misal M5
    4. TIDAK_SAH (Pelanggaran Nyata):
       - Jarak > 100m (berada di luar area kampus)
       - Terlambat > 30 menit (melewati toleransi perkuliahan)
       - Wajah sangat berbeda (< 0.35) tanpa kehadiran fisik valid
    """
    # 1. Cek Pelanggaran Fatal Nyata
    if distance_m > 100.0:
        return {
            "status": "TIDAK_SAH",
            "is_valid": False,
            "requires_oversight": False,
            "decision_reason": f"Pelanggaran batas lokasi: Mahasiswa terdeteksi di luar kampus ({distance_m:.1f}m > 100m).",
            "pdp_article": "Pasal 16 ayat (2) UU PDP (Prinsip Keabsahan dan Akurasi)",
            "oversight_level": "Automated Rejection",
            "impact_mitigation": "Tidak ada diskriminasi; pelanggaran lokasi objektif di luar radius toleransi wajar."
        }

    if late_minutes > 30:
        return {
            "status": "TIDAK_SAH",
            "is_valid": False,
            "requires_oversight": False,
            "decision_reason": f"Pelanggaran batas waktu: Keterlambatan ({late_minutes} menit) melampaui batas toleransi 30 menit.",
            "pdp_article": "Pasal 16 ayat (2) UU PDP (Kepatuhan terhadap Regulasi Akademik)",
            "oversight_level": "Automated Rejection",
            "impact_mitigation": "Batas waktu akademik dipatuhi secara adil untuk semua mahasiswa."
        }

    # 2. Cek Kasus Normal Lolos Otomatis
    if face_score >= 0.85 and distance_m <= 50.0:
        if late_minutes <= 15:
            return {
                "status": "HADIR",
                "is_valid": True,
                "requires_oversight": False,
                "decision_reason": f"Presensi sah otomatis: Wajah cocok ({face_score:.2f} >= 0.85), lokasi valid ({distance_m:.1f}m <= 50m), dan tepat waktu ({late_minutes}m <= 15m).",
                "pdp_article": "Pasal 16 ayat (2) UU PDP (Pemrosesan Sah & Akurat)",
                "oversight_level": "Human-on-the-loop (Monitoring log)",
                "impact_mitigation": "Keputusan positif tidak menimbulkan akibat hukum yang merugikan subjek data."
            }
        else: # 15 < late_minutes <= 30
            return {
                "status": "TERLAMBAT",
                "is_valid": True,
                "requires_oversight": False,
                "decision_reason": f"Presensi sah kategori terlambat: Wajah cocok ({face_score:.2f}), lokasi valid ({distance_m:.1f}m), keterlambatan {late_minutes} menit (16-30m).",
                "pdp_article": "Pasal 16 ayat (2) UU PDP",
                "oversight_level": "Human-on-the-loop (Monitoring)",
                "impact_mitigation": "Sesuai regulasi presensi kehadiran terlambat."
            }

    # 3. Zona Human Oversight (Human-in-the-Loop) - UU PDP Pasal 10 ayat (1) & Pasal 34 ayat (2)
    # Kasus Ambang Skor Wajah (Contoh: M3 - 0.70 s.d 0.84, kacamata baru / pencahayaan redup)
    if 0.70 <= face_score < 0.85 and distance_m <= 50.0 and late_minutes <= 15:
        return {
            "status": "PERLU_VERIFIKASI_DOSEN",
            "is_valid": False, # Menunggu konfirmasi dosen
            "requires_oversight": True,
            "decision_reason": f"Anomali skor biometrik di ambang batas ({face_score:.2f} di rentang 0.70-0.84). Lokasi ({distance_m:.1f}m) dan waktu ({late_minutes}m) valid. Diduga akibat kacamata baru atau pencahayaan redup.",
            "pdp_article": "Pasal 10 ayat (1) & Pasal 34 ayat (2) UU PDP",
            "oversight_level": "Human-in-the-loop (Verifikasi Visual oleh Dosen Kelas)",
            "impact_mitigation": "Mencegah mahasiswa dirugikan oleh kegagalan sensorik/pencahayaan yang dapat menggagalkan hak ujian."
        }

    # Kasus Toleransi GPS Drift Dalam Gedung Beton (Contoh: M4 - Wajah valid, Jarak 51-100m, Waktu valid)
    if face_score >= 0.85 and 50.0 < distance_m <= 100.0 and late_minutes <= 15:
        return {
            "status": "PERLU_VERIFIKASI_DOSEN",
            "is_valid": False,
            "requires_oversight": True,
            "decision_reason": f"Anomali GPS indoor drift ({distance_m:.1f}m berada dalam radius toleransi 51-100m). Wajah sangat cocok ({face_score:.2f} >= 0.85) dan hadir tepat waktu ({late_minutes}m).",
            "pdp_article": "Pasal 10 ayat (1) & Pasal 34 ayat (2) UU PDP",
            "oversight_level": "Human-in-the-loop (Konfirmasi Kehadiran Fisik Dosen)",
            "impact_mitigation": "Mengakomodasi keterbatasan fisik sinyal satelit GPS di dalam bangunan beton tanpa mengorbankan integritas presensi."
        }

    # Kasus Perubahan Fisik / Foto Profil Lama (Contoh: M5 - Skor < 0.70, Lokasi sangat valid <= 50m, Tepat waktu <= 15m)
    if face_score < 0.70 and distance_m <= 50.0 and late_minutes <= 15:
        return {
            "status": "PERLU_VERIFIKASI_DOSEN",
            "is_valid": False,
            "requires_oversight": True,
            "decision_reason": f"Skor biometrik rendah ({face_score:.2f}), namun subjek berada di dalam ruang kelas ({distance_m:.1f}m) dan tepat waktu ({late_minutes}m). Diindikasikan foto profil lama (> 5 tahun) atau perubahan fisik wajar.",
            "pdp_article": "Pasal 4 ayat (2), Pasal 10 ayat (1), & Pasal 34 ayat (2) UU PDP",
            "oversight_level": "Human-in-the-loop (Verifikasi Manual Dosen & Saran Update Foto Profil)",
            "impact_mitigation": "Melindungi hak mahasiswa atas penuaan atau perubahan penampilan alami dari sanksi diskriminatif algoritma AI."
        }

    # Kasus kombinasi anomali lainnya yang masih memiliki indikasi kehadiran wajar
    if distance_m <= 100.0 and late_minutes <= 30 and face_score >= 0.50:
        return {
            "status": "PERLU_VERIFIKASI_DOSEN",
            "is_valid": False,
            "requires_oversight": True,
            "decision_reason": f"Kombinasi parameter memerlukan peninjauan dosen (Skor: {face_score:.2f}, Jarak: {distance_m:.1f}m, Telat: {late_minutes}m).",
            "pdp_article": "Pasal 10 ayat (1) UU PDP",
            "oversight_level": "Human-in-the-loop",
            "impact_mitigation": "Penilaian manusia bermakna sebelum penetapan status akhir."
        }

    # Kegagalan mutlak
    return {
        "status": "TIDAK_SAH",
        "is_valid": False,
        "requires_oversight": False,
        "decision_reason": f"Tidak memenuhi kriteria minimum (Skor: {face_score:.2f}, Jarak: {distance_m:.1f}m, Telat: {late_minutes}m).",
        "pdp_article": "Pasal 16 ayat (2) UU PDP",
        "oversight_level": "Automated Rejection",
        "impact_mitigation": "Ditolak karena tidak ada bukti kehadiran fisik atau identitas yang valid."
    }


def run_benchmark() -> List[Dict[str, Any]]:
    """
    Menjalankan simulasi benchmark lengkap untuk 6 kasus mahasiswa (M1 s.d. M6).
    Membandingkan keluaran Rancangan Awal vs Rancangan UU PDP.
    Mengembalikan daftar kamus komprehensif untuk disajikan pada API, CLI, dan UI.
    """
    results = []

    for case in BENCHMARK_CASES:
        score = case["score"]
        dist = case["distance"]
        late = case["late"]
        cid = case["id"]

        init_res = evaluate_initial_rule(score, dist, late)
        pdp_res = evaluate_uu_pdp_rule(score, dist, late, context_note=case["keterangan"])

        # Menentukan apakah terjadi perbaikan etis / penyelamatan dari False Rejection
        rescued_from_false_rejection = (
            init_res["status"] == "TIDAK_SAH" and
            pdp_res["status"] == "PERLU_VERIFIKASI_DOSEN"
        )

        record = {
            # Metadata Kasus
            "case_id": cid,
            "id": cid,
            "name": case["name"],
            "nim": case["nim"],
            "keterangan": case["keterangan"],
            "detail_kondisi": case["detail_kondisi"],

            # Parameter Input
            "face_score": score,
            "similarity_score": score,
            "distance_m": dist,
            "distance_meters": dist,
            "late_minutes": late,

            # Hasil Rancangan Awal
            "rancangan_awal_status": init_res["status"],
            "rancangan_awal_alasan": init_res["decision_reason"],
            "initial_rule": init_res,

            # Hasil Rancangan UU PDP
            "rancangan_uu_pdp_status": pdp_res["status"],
            "rancangan_uu_pdp_alasan": pdp_res["decision_reason"],
            "requires_human_oversight": pdp_res["requires_oversight"],
            "pdp_article_reference": pdp_res.get("pdp_article", "UU PDP"),
            "oversight_level": pdp_res.get("oversight_level", "Human-in-the-loop"),
            "impact_mitigation": pdp_res.get("impact_mitigation", ""),
            "pdp_rule": pdp_res,

            # Perbandingan & Analisis Etis
            "status_berubah": init_res["status"] != pdp_res["status"],
            "rescued_from_false_rejection": rescued_from_false_rejection,
            "kesimpulan_perbandingan": (
                f"Status berubah dari [{init_res['status']}] menjadi [{pdp_res['status']}]. "
                f"Hak mahasiswa terlindungi dari otomasi tunggal yang merugikan."
                if init_res["status"] != pdp_res["status"] else
                f"Status konsisten [{pdp_res['status']}]."
            )
        }
        results.append(record)

    return results


def get_benchmark_summary(results: List[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Menghitung metrik ringkasan perbandingan etis antara Rancangan Awal dan Rancangan UU PDP.
    """
    if results is None:
        results = run_benchmark()

    total = len(results)
    awal_counts = {"HADIR": 0, "TERLAMBAT": 0, "TIDAK_SAH": 0}
    pdp_counts = {"HADIR": 0, "TERLAMBAT": 0, "PERLU_VERIFIKASI_DOSEN": 0, "TIDAK_SAH": 0}
    rescued_count = 0

    for r in results:
        awal_st = r["rancangan_awal_status"]
        pdp_st = r["rancangan_uu_pdp_status"]

        awal_counts[awal_st] = awal_counts.get(awal_st, 0) + 1
        pdp_counts[pdp_st] = pdp_counts.get(pdp_st, 0) + 1

        if r["rescued_from_false_rejection"]:
            rescued_count += 1

    return {
        "total_cases": total,
        "rancangan_awal": {
            "distribusi": awal_counts,
            "mahasiswa_dirugikan_otomasi_sepihak": awal_counts["TIDAK_SAH"],
            "persentase_penolakan": (awal_counts["TIDAK_SAH"] / total) * 100
        },
        "rancangan_uu_pdp": {
            "distribusi": pdp_counts,
            "mahasiswa_dilindungi_human_oversight": pdp_counts.get("PERLU_VERIFIKASI_DOSEN", 0),
            "persentase_human_oversight": (pdp_counts.get("PERLU_VERIFIKASI_DOSEN", 0) / total) * 100,
            "penolakan_sepihak_tanpa_hak_keberatan": 0
        },
        "penyelamatan_keadilan": {
            "kasus_terselamatkan": rescued_count,
            "daftar_kasus": [r["case_id"] for r in results if r["rescued_from_false_rejection"]],
            "deskripsi": "3 dari 6 mahasiswa (M3, M4, M5) terselamatkan dari vonis gugur presensi tidak sah yang merugikan hak mengikuti ujian akhir."
        }
    }
