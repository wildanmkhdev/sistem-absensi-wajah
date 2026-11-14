"""
Smoke Test Suite untuk Modul Machine Learning & Benchmark Presensi
Sistem Presensi Wajah Berbasis AI (Studi Kasus Kelompok 6 & UU PDP)

Menguji:
1. Ekstraksi Face Embedding 512-D dari gambar dan Base64 string.
2. Perhitungan Cosine Similarity normalisasi [0.0 - 1.0].
3. Eksekusi 6 Kasus Benchmark Mahasiswa (M1 s.d. M6).
4. Pencetakan Tabel Perbandingan Rancangan Awal vs Rancangan UU PDP.
"""

import sys
import os
import base64
import io
import numpy as np
from PIL import Image, ImageDraw

# Pastikan path backend terdaftar
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.ml.engine import (
    process_face_image,
    compute_similarity,
    extract_features_numpy,
    generate_benchmark_embedding,
)
from app.ml.benchmark import (
    run_benchmark,
    get_benchmark_summary,
    BENCHMARK_CASES,
)


def create_test_face_image(hair_color=(40, 25, 15), bg_color=(235, 220, 200)) -> Image.Image:
    """Membuat gambar wajah sintetis untuk pengujian deterministik."""
    img = Image.new("RGB", (160, 160), bg_color)
    draw = ImageDraw.Draw(img)

    # Rambut & Kontur Kepala
    draw.ellipse([30, 20, 130, 120], fill=hair_color)
    # Wajah
    draw.ellipse([45, 40, 115, 130], fill=(240, 205, 175))
    # Mata Kiri & Kanan
    draw.ellipse([55, 65, 72, 80], fill=(30, 30, 30))
    draw.ellipse([88, 65, 105, 80], fill=(30, 30, 30))
    # Hidung
    draw.polygon([(80, 80), (75, 100), (85, 100)], fill=(210, 160, 130))
    # Bibir
    draw.rectangle([68, 110, 92, 118], fill=(190, 70, 70))

    return img


def test_embedding_generation():
    print("[1/4] Menguji Ekstraksi Face Embedding (512-D)...")
    img1 = create_test_face_image()

    # Tes dari objek PIL Image
    emb1 = process_face_image(img1)
    assert isinstance(emb1, np.ndarray), "Embedding harus berupa numpy.ndarray"
    assert emb1.shape == (512,), f"Dimensi embedding harus (512,), didapat: {emb1.shape}"
    assert np.issubdtype(emb1.dtype, np.floating), f"Tipe data harus floating, didapat: {emb1.dtype}"

    # Tes dari raw Bytes
    buf = io.BytesIO()
    img1.save(buf, format="JPEG")
    bytes_data = buf.getvalue()
    emb_bytes = process_face_image(bytes_data)
    assert emb_bytes.shape == (512,), "Ekstraksi dari bytes gagal menghasilkan 512-D"

    # Tes dari Base64 string
    b64_str = base64.b64encode(bytes_data).decode("utf-8")
    emb_b64 = process_face_image(b64_str)
    assert emb_b64.shape == (512,), "Ekstraksi dari raw base64 gagal menghasilkan 512-D"

    # Tes dari Data URI format
    data_uri = f"data:image/jpeg;base64,{b64_str}"
    emb_uri = process_face_image(data_uri)
    assert emb_uri.shape == (512,), "Ekstraksi dari data URI gagal menghasilkan 512-D"

    # Verifikasi konsistensi numerik
    sim_self = compute_similarity(emb1, emb_bytes)
    assert sim_self >= 0.99, f"Embedding dari bytes terkompresi harus sangat mirip (sim={sim_self})"
    print(f"      OK - Ekstraksi berhasil dari PIL, Bytes, Base64, dan Data URI (Dimensi: {emb1.shape}).")


def test_similarity_computation():
    print("[2/4] Menguji Komputasi Cosine Similarity...")
    img_person_a = create_test_face_image(hair_color=(20, 20, 20), bg_color=(240, 220, 200))
    img_person_b = Image.new("RGB", (160, 160), (30, 40, 80))
    d_b = ImageDraw.Draw(img_person_b)
    d_b.rectangle([20, 20, 140, 140], fill=(220, 220, 50))

    emb_a1 = process_face_image(img_person_a)
    emb_a2 = process_face_image(img_person_a)
    emb_b = process_face_image(img_person_b)

    # Uji Wajah Identik: cos(theta) harus 1.0
    sim_identical = compute_similarity(emb_a1, emb_a2)
    assert abs(sim_identical - 1.0) < 1e-4, f"Wajah identik harus bernilai 1.0, didapat {sim_identical}"

    # Uji Wajah/Gambar Berbeda
    sim_diff = compute_similarity(emb_a1, emb_b)
    assert 0.0 <= sim_diff < 0.85, f"Wajah berbeda tidak boleh lolos ambang batas 0.85, didapat {sim_diff}"

    # Uji Generator Benchmark Sintetis (Target Eksak 0.78 untuk M3)
    b_base, b_target = generate_benchmark_embedding(0.78, emb_a1)
    sim_target = compute_similarity(b_base, b_target)
    assert abs(sim_target - 0.78) < 1e-3, f"Simulasi target harus 0.78, didapat {sim_target}"

    print(f"      OK - Identik: {sim_identical:.4f} | Berbeda: {sim_diff:.4f} | Target Sintetis: {sim_target:.4f}")


def test_benchmark_rules():
    print("[3/4] Menguji Logika 6 Kasus Benchmark (M1 s.d. M6)...")
    results = run_benchmark()
    assert len(results) == 6, f"Harus ada 6 hasil benchmark mahasiswa, didapat {len(results)}"

    cases_map = {r["case_id"]: r for r in results}

    # M1: Skor 0.92, 20m, 5m -> HADIR pada keduanya
    assert cases_map["M1"]["rancangan_awal_status"] == "HADIR"
    assert cases_map["M1"]["rancangan_uu_pdp_status"] == "HADIR"
    assert not cases_map["M1"]["requires_human_oversight"]

    # M2: Skor 0.85, 50m, 15m -> HADIR pada keduanya (batas toleransi)
    assert cases_map["M2"]["rancangan_awal_status"] == "HADIR"
    assert cases_map["M2"]["rancangan_uu_pdp_status"] == "HADIR"
    assert not cases_map["M2"]["requires_human_oversight"]

    # M3: Skor 0.78, 15m, 3m (Kacamata baru, redup)
    # Awal: TIDAK_SAH | UU PDP: PERLU_VERIFIKASI_DOSEN
    assert cases_map["M3"]["rancangan_awal_status"] == "TIDAK_SAH"
    assert cases_map["M3"]["rancangan_uu_pdp_status"] == "PERLU_VERIFIKASI_DOSEN"
    assert cases_map["M3"]["requires_human_oversight"] is True

    # M4: Skor 0.95, 70m, 0m (GPS drift dalam gedung)
    # Awal: TIDAK_SAH | UU PDP: PERLU_VERIFIKASI_DOSEN
    assert cases_map["M4"]["rancangan_awal_status"] == "TIDAK_SAH"
    assert cases_map["M4"]["rancangan_uu_pdp_status"] == "PERLU_VERIFIKASI_DOSEN"
    assert cases_map["M4"]["requires_human_oversight"] is True

    # M5: Skor 0.40, 10m, 2m (Foto profil lama 6 tahun)
    # Awal: TIDAK_SAH | UU PDP: PERLU_VERIFIKASI_DOSEN
    assert cases_map["M5"]["rancangan_awal_status"] == "TIDAK_SAH"
    assert cases_map["M5"]["rancangan_uu_pdp_status"] == "PERLU_VERIFIKASI_DOSEN"
    assert cases_map["M5"]["requires_human_oversight"] is True

    # M6: Skor 0.91, 30m, 28m -> TERLAMBAT pada keduanya
    assert cases_map["M6"]["rancangan_awal_status"] == "TERLAMBAT"
    assert cases_map["M6"]["rancangan_uu_pdp_status"] == "TERLAMBAT"
    assert not cases_map["M6"]["requires_human_oversight"]

    summary = get_benchmark_summary(results)
    assert summary["penyelamatan_keadilan"]["kasus_terselamatkan"] == 3
    print("      OK - Seluruh aturan M1 s.d. M6 tervalidasi 100% sesuai Modul 13 & UU PDP.")
    return results, summary


def print_benchmark_table(results, summary):
    print("\n" + "=" * 115)
    print("   BENCHMARK EVALUASI SISTEM PRESENSI WAJAH: RANCANGAN AWAL VS RANCANGAN UU PDP (MODUL 13)")
    print("=" * 115)

    header = f"{'ID':<4} | {'Skor':<6} | {'Jarak':<7} | {'Telat':<6} | {'Rancangan Awal':<15} | {'Rancangan UU PDP':<23} | {'Keterangan Kasus Lapangan'}"
    print(header)
    print("-" * 115)

    for r in results:
        cid = r["case_id"]
        skor = f"{r['face_score']:.2f}"
        jarak = f"{r['distance_m']:.0f}m"
        telat = f"{r['late_minutes']}m"
        st_awal = r["rancangan_awal_status"]
        st_pdp = r["rancangan_uu_pdp_status"]
        ket = r["keterangan"]

        # Indikator perubahan
        if r["rescued_from_false_rejection"]:
            simbol = " [TERSELAMATKAN]"
        else:
            simbol = ""

        row = f"{cid:<4} | {skor:<6} | {jarak:<7} | {telat:<6} | {st_awal:<15} | {st_pdp + simbol:<23} | {ket}"
        print(row)

    print("-" * 115)
    print("\nRINGKASAN ANALISIS KEPATUHAN UU NO. 27 TAHUN 2022 (UU PDP):")
    print(f"1. Total Kasus Uji: {summary['total_cases']} Mahasiswa.")
    print(f"2. Rancangan Awal (Aturan Kaku):")
    print(f"   - Hadir: {summary['rancangan_awal']['distribusi']['HADIR']}")
    print(f"   - Terlambat: {summary['rancangan_awal']['distribusi']['TERLAMBAT']}")
    print(f"   - TIDAK SAH (Ditolak Otomatis): {summary['rancangan_awal']['distribusi']['TIDAK_SAH']} ({summary['rancangan_awal']['persentase_penolakan']:.0f}%)")
    print(f"   -> MASALAH: 3 Mahasiswa dirugikan secara sepihak akibat otomasi tunggal tanpa penilaian manusia.")
    print(f"3. Rancangan UU PDP (Human Oversight - Human-in-the-Loop):")
    print(f"   - Hadir (Otomatis): {summary['rancangan_uu_pdp']['distribusi']['HADIR']}")
    print(f"   - Terlambat (Otomatis): {summary['rancangan_uu_pdp']['distribusi']['TERLAMBAT']}")
    print(f"   - PERLU VERIFIKASI DOSEN: {summary['rancangan_uu_pdp']['distribusi']['PERLU_VERIFIKASI_DOSEN']} ({summary['rancangan_uu_pdp']['persentase_human_oversight']:.0f}%)")
    print(f"   - TIDAK SAH Mutlak: {summary['rancangan_uu_pdp']['distribusi']['TIDAK_SAH']}")
    print(f"   -> SOLUSI ETIS: M3 (kacamata/redup), M4 (GPS drift), dan M5 (foto lama) dialihkan ke Dosen.")
    print(f"   -> Sesuai Pasal 10 ayat (1) & Pasal 34 ayat (2) UU PDP (Larangan Otomasi Tunggal Merugikan).")
    print("=" * 115)


def main():
    print("=================================================================")
    print("   MEMULAI SMOKE TEST ML & BENCHMARK PRESENSI WAJAH (KELOMPOK 6)  ")
    print("=================================================================")

    test_embedding_generation()
    test_similarity_computation()
    results, summary = test_benchmark_rules()

    print("[4/4] Mencetak Tabel Hasil Benchmark Lengkap...")
    print_benchmark_table(results, summary)

    print("\nSEMUA PENGUJIAN SMOKE TEST BERHASIL DENGAN EXIT CODE 0.")
    sys.exit(0)


if __name__ == "__main__":
    main()
