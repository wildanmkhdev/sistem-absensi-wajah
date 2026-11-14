import sys
import os
import pytest
from fastapi.testclient import TestClient

# Pastikan backend berada dalam path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from app.main import app
from app.db.database import init_db

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_database():
    """Memastikan database terinisialisasi sebelum setiap test suite."""
    init_db()


def test_health_endpoint():
    """Uji endpoint GET /health."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "UU No. 27/2022" in data["legal_compliance"]


def test_classroom_info():
    """Uji endpoint GET /api/classroom."""
    response = client.get("/api/classroom")
    assert response.status_code == 200
    data = response.json()
    assert "latitude" in data
    assert "longitude" in data
    assert data["max_valid_distance_meters"] == 50.0


def test_get_students():
    """Uji endpoint GET /api/students mengembalikan data mahasiswa (auto-seeded M1-M6)."""
    response = client.get("/api/students")
    assert response.status_code == 200
    students = response.json()
    assert len(students) >= 6
    nims = [s["nim"] for s in students]
    assert "210101" in nims  # M1
    assert "210103" in nims  # M3


def test_register_student():
    """Uji endpoint POST /api/register mendaftarkan mahasiswa baru."""
    payload = {
        "nim": "999001",
        "name": "Zaky Hendrawan",
        "face_image": None,
    }
    response = client.post("/api/register", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["nim"] == "999001"
    assert data["name"] == "Zaky Hendrawan"


def test_presensi_case_m1_hadir():
    """Uji Kasus M1: Skor 0.92, Jarak 20m, Late 5m -> HADIR."""
    payload = {
        "nim": "210101",
        "name": "Arya Pratama",
        "face_image": None,
        "latitude": -6.200180,  # ~20m dari -6.200000
        "longitude": 106.816666,
        "late_minutes": 5.0,
        "simulated_case": "M1",
    }
    response = client.post("/api/presensi", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "HADIR"
    assert data["initial_rule_status"] == "HADIR"
    assert data["requires_human_oversight"] is False


def test_presensi_case_m2_hadir_at_boundary():
    """Uji Kasus M2: Tepat di semua batas (Skor 0.85, Jarak 50m, Late 15m) -> HADIR."""
    payload = {
        "nim": "210102",
        "name": "Budi Santoso",
        "face_image": None,
        "latitude": -6.200450,
        "longitude": 106.816666,
        "late_minutes": 15.0,
        "simulated_case": "M2",
    }
    response = client.post("/api/presensi", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "HADIR"
    assert data["initial_rule_status"] == "HADIR"


def test_presensi_case_m3_human_oversight_borderline():
    """Uji Kasus M3: Kacamata baru & redup (Skor 0.78, Jarak 15m, Late 3m) -> PERLU_VERIFIKASI_DOSEN."""
    payload = {
        "nim": "210103",
        "name": "Citra Dewi",
        "face_image": None,
        "latitude": -6.200135,
        "longitude": 106.816666,
        "late_minutes": 3.0,
        "simulated_case": "M3",
    }
    response = client.post("/api/presensi", json=payload)
    assert response.status_code == 200
    data = response.json()
    # Pada rancangan awal: ditolak kaku (TIDAK_SAH)
    assert data["initial_rule_status"] == "TIDAK_SAH"
    # Pada rancangan UU PDP: dilindungi oleh human oversight
    assert data["status"] == "PERLU_VERIFIKASI_DOSEN"
    assert data["requires_human_oversight"] is True
    assert data["human_oversight_status"] == "PENDING"


def test_presensi_case_m4_human_oversight_gps_drift():
    """Uji Kasus M4: GPS drift gedung beton (Skor 0.95, Jarak 70m, Late 0m) -> PERLU_VERIFIKASI_DOSEN."""
    payload = {
        "nim": "210104",
        "name": "Dodi Wijaya",
        "face_image": None,
        "latitude": -6.200630,
        "longitude": 106.816666,
        "late_minutes": 0.0,
        "simulated_case": "M4",
    }
    response = client.post("/api/presensi", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["initial_rule_status"] == "TIDAK_SAH"
    assert data["status"] == "PERLU_VERIFIKASI_DOSEN"
    assert data["requires_human_oversight"] is True


def test_presensi_case_m5_human_oversight_old_photo():
    """Uji Kasus M5: Foto profil 6 tahun lalu (Skor 0.40, Jarak 10m, Late 2m) -> PERLU_VERIFIKASI_DOSEN."""
    payload = {
        "nim": "210105",
        "name": "Eka Saputra",
        "face_image": None,
        "latitude": -6.200090,
        "longitude": 106.816666,
        "late_minutes": 2.0,
        "simulated_case": "M5",
    }
    response = client.post("/api/presensi", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["initial_rule_status"] == "TIDAK_SAH"
    assert data["status"] == "PERLU_VERIFIKASI_DOSEN"
    assert data["requires_human_oversight"] is True


def test_presensi_case_m6_terlambat():
    """Uji Kasus M6: Keterlambatan 28 menit -> TERLAMBAT (keduanya sepakat)."""
    payload = {
        "nim": "210106",
        "name": "Fajar Nugraha",
        "face_image": None,
        "latitude": -6.200270,
        "longitude": 106.816666,
        "late_minutes": 28.0,
        "simulated_case": "M6",
    }
    response = client.post("/api/presensi", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "TERLAMBAT"
    assert data["initial_rule_status"] == "TERLAMBAT"
    assert data["requires_human_oversight"] is False


def test_presensi_fatal_violation_distance():
    """Uji pelanggaran fatal: Jarak 200 meter jauh di luar kampus -> TIDAK_SAH."""
    payload = {
        "nim": "210101",
        "face_image": None,
        "latitude": -6.202000,  # ~222 meter
        "longitude": 106.816666,
        "late_minutes": 0.0,
    }
    response = client.post("/api/presensi", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "TIDAK_SAH"
    assert data["requires_human_oversight"] is False


def test_oversight_workflow_approve_and_reject():
    """Uji workflow Human Oversight (Daftar antrean verifikasi & Resolusi dosen)."""
    # 1. Buat presensi yang memicu PERLU_VERIFIKASI_DOSEN
    presensi_res = client.post(
        "/api/presensi",
        json={
            "nim": "210103",
            "name": "Citra Dewi",
            "face_image": None,
            "latitude": -6.200135,
            "longitude": 106.816666,
            "late_minutes": 3.0,
            "simulated_case": "M3",
        },
    )
    presensi_data = presensi_res.json()
    attendance_id = presensi_data["id"]

    # 2. Periksa bahwa antrean oversight memuat record ini
    oversight_res = client.get("/api/oversight")
    assert oversight_res.status_code == 200
    oversight_list = oversight_res.json()
    matching = [item for item in oversight_list if item["id"] == attendance_id]
    assert len(matching) > 0

    # 3. Dosen menyetujui (Approve) presensi dengan catatan
    resolve_payload = {
        "attendance_id": attendance_id,
        "approved": True,
        "lecturer_note": "Terkonfirmasi mahasiswa hadir fisik di ruang kelas, mengenakan kacamata baru berbingkai tebal.",
        "lecturer_name": "Dr. Ir. Suendri, M.Kom",
    }
    resolve_res = client.post("/api/oversight/resolve", json=resolve_payload)
    assert resolve_res.status_code == 200
    resolve_data = resolve_res.json()
    assert resolve_data["success"] is True
    assert resolve_data["new_status"] == "HADIR"
    assert resolve_data["human_oversight_status"] == "APPROVED"


def test_benchmark_endpoint():
    """Uji endpoint GET /api/benchmark mengembalikan 6 kasus lengkap."""
    response = client.get("/api/benchmark")
    assert response.status_code == 200
    benchmark_list = response.json()
    assert len(benchmark_list) == 6

    case_ids = [item["case_id"] for item in benchmark_list]
    assert case_ids == ["M1", "M2", "M3", "M4", "M5", "M6"]

    # Pastikan status M3, M4, M5 mencerminkan human oversight
    m3 = next(item for item in benchmark_list if item["case_id"] == "M3")
    assert m3["status_initial"] == "TIDAK_SAH"
    assert m3["status_uupdp"] == "PERLU_VERIFIKASI_DOSEN"
    assert m3["requires_human_oversight"] is True


def test_attendances_and_stats_endpoints():
    """Uji endpoint GET /api/attendances dan GET /api/stats."""
    att_res = client.get("/api/attendances")
    assert att_res.status_code == 200
    assert isinstance(att_res.json(), list)

    stats_res = client.get("/api/stats")
    assert stats_res.status_code == 200
    stats = stats_res.json()
    assert "total_attendances" in stats
    assert "hadir_count" in stats
    assert stats["total_attendances"] >= 1
