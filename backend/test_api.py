import sys
import os
import io
import base64
import pytest
from fastapi.testclient import TestClient
from PIL import Image, ImageDraw

# Pastikan backend berada dalam path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from app.main import app
import app.db.database as db

client = TestClient(app)

DATA_DIR = os.path.join(BASE_DIR, "..", "data")


def _image_data_url(*parts: str) -> str:
    """Baca gambar uji dari folder data/ dan ubah menjadi data URL Base64."""
    with open(os.path.join(DATA_DIR, *parts), "rb") as fh:
        return "data:image/jpeg;base64," + base64.b64encode(fh.read()).decode("ascii")


def _generated_probe_data_url() -> str:
    """Wajah sintetis unik agar uji 1:N tidak bertabrakan dengan enrollment bawaan DB."""
    img = Image.new("RGB", (160, 160), (12, 88, 140))
    draw = ImageDraw.Draw(img)
    draw.ellipse([30, 20, 130, 120], fill=(9, 9, 9))
    draw.ellipse([45, 40, 115, 130], fill=(205, 240, 230))
    draw.ellipse([55, 65, 72, 80], fill=(250, 250, 250))
    draw.ellipse([88, 65, 105, 80], fill=(250, 250, 250))
    draw.polygon([(80, 80), (75, 100), (85, 100)], fill=(120, 60, 30))
    draw.rectangle([68, 110, 92, 118], fill=(30, 30, 200))
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=100)
    return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode("ascii")


def _non_face_probe_data_url() -> str:
    """Gambar non-wajah deterministik untuk menguji ketidakcocokan biometrik."""
    img = Image.new("RGB", (160, 160), (30, 40, 80))
    draw = ImageDraw.Draw(img)
    draw.rectangle([20, 20, 140, 140], fill=(220, 220, 50))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode("ascii")


@pytest.fixture(autouse=True)
def setup_database(tmp_path, monkeypatch):
    """Setiap test memakai database SQLite sementara; DB lokal pengguna tidak disentuh."""
    monkeypatch.setattr(db, "DATABASE_URL", "")
    monkeypatch.setattr(db, "DB_PATH", str(tmp_path / "attendance_test.db"))
    monkeypatch.setattr(db, "_USE_NEON", False)
    db.init_db()
    yield


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
        "face_image": _image_data_url("foto_profil", "M1_profil.jpg"),
    }
    response = client.post("/api/register", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["has_embedding"] is True
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
    face_image = _image_data_url("foto_profil", "M2_profil.jpg")
    client.post(
        "/api/register",
        json={"nim": "888004", "name": "Uji Jarak Fatal", "face_image": face_image},
    )
    payload = {
        "nim": "888004",
        "face_image": face_image,
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
    client.post(
        "/api/presensi",
        json={
            "nim": "210101",
            "name": "Arya Pratama",
            "face_image": None,
            "late_minutes": 5.0,
            "simulated_case": "M1",
        },
    )

    att_res = client.get("/api/attendances")
    assert att_res.status_code == 200
    assert isinstance(att_res.json(), list)
    assert len(att_res.json()) >= 1

    stats_res = client.get("/api/stats")
    assert stats_res.status_code == 200
    stats = stats_res.json()
    assert "total_attendances" in stats
    assert "hadir_count" in stats
    assert stats["total_attendances"] >= 1


def test_presensi_auto_identity_uses_1toN_match():
    """Regresi: jalur 1:N AUTO harus mengenali wajah terdaftar, bukan NameError -> skor 0.0.

    Memakai wajah sintetis unik (bukan aset data/) karena DB lokal dapat sudah
    memiliki enrollment dengan embedding identik, yang membuat hasil 1:N ambigu.
    """
    face_image = _generated_probe_data_url()

    register_res = client.post(
        "/api/register",
        json={"nim": "888001", "name": "Uji Selfie Match", "face_image": face_image},
    )
    assert register_res.status_code == 200
    registered = register_res.json()
    assert registered["success"] is True
    assert registered["has_embedding"] is True

    response = client.post(
        "/api/presensi",
        json={
            "nim": None,
            "name": None,
            "face_image": face_image,
            "latitude": -6.200000,
            "longitude": 106.816666,
            "late_minutes": 0,
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["nim"] == "888001"
    assert data["name"] == "Uji Selfie Match"
    assert data["similarity_score"] >= 0.85


def test_presensi_rejects_missing_evidence():
    """Presensi non-simulasi tanpa foto wajah harus ditolak fail-closed."""
    response = client.post("/api/presensi", json={"nim": "210101"})
    assert response.status_code == 400
    assert "face_image" in response.json()["detail"]


def test_presensi_rejects_missing_gps():
    """Presensi non-simulasi tanpa koordinat GPS harus ditolak fail-closed."""
    response = client.post(
        "/api/presensi",
        json={
            "nim": "210101",
            "face_image": _image_data_url("foto_swafoto", "M1_selfie.jpg"),
        },
    )
    assert response.status_code == 400
    assert "latitude" in response.json()["detail"]


def test_presensi_simulation_allows_null_face():
    """Simulasi benchmark M1-M6 tetap sah tanpa foto wajah maupun koordinat GPS."""
    response = client.post(
        "/api/presensi",
        json={"nim": "210103", "face_image": None, "late_minutes": 3, "simulated_case": "M3"},
    )
    assert response.status_code == 200
    assert response.json()["status"] == "PERLU_VERIFIKASI_DOSEN"


def test_presensi_1to1_without_reference_embedding_fails_closed():
    """Verifikasi 1:1 tanpa embedding referensi tidak boleh menghasilkan skor lolos."""
    response = client.post(
        "/api/presensi",
        json={
            "nim": "888006",
            "face_image": _generated_probe_data_url(),
            "latitude": -6.200000,
            "longitude": 106.816666,
            "late_minutes": 0,
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["similarity_score"] == 0.0
    assert data["status"] == "TIDAK_SAH"


def test_presensi_1to1_mismatched_face_fails():
    """Wajah yang berbeda dari embedding referensi harus gagal verifikasi 1:1.

    Aset data/foto_* saling mirip (M1_profil vs M6_selfie terukur 0.98), jadi
    ketidakcocokan diuji dengan gambar non-wajah deterministik (terukur ~0.07).
    """
    client.post(
        "/api/register",
        json={
            "nim": "888003",
            "name": "Wajah A",
            "face_image": _image_data_url("foto_profil", "M1_profil.jpg"),
        },
    )
    response = client.post(
        "/api/presensi",
        json={
            "nim": "888003",
            "face_image": _non_face_probe_data_url(),
            "latitude": -6.200000,
            "longitude": 106.816666,
            "late_minutes": 0,
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["similarity_score"] < 0.85
    assert data["status"] == "TIDAK_SAH"


def test_register_requires_face_image():
    """Pendaftaran biometrik tanpa foto wajah harus ditolak."""
    response = client.post("/api/register", json={"nim": "888010", "name": "Tanpa Foto"})
    assert response.status_code == 400
    assert "face_image" in response.json()["detail"]


def test_register_rejects_invalid_base64():
    """Pendaftaran dengan gambar rusak harus ditolak sebelum menulis ke database."""
    response = client.post(
        "/api/register",
        json={
            "nim": "888012",
            "name": "Base64 Rusak",
            "face_image": "data:image/jpeg;base64,not-valid-base64!!!",
        },
    )
    assert response.status_code == 400
    assert "Gagal mengekstrak" in response.json()["detail"]


def test_register_failure_preserves_existing_embedding():
    """Re-registrasi gagal tidak boleh menghapus embedding yang sudah tersimpan."""
    nim = "888011"
    ok_res = client.post(
        "/api/register",
        json={
            "nim": nim,
            "name": "Simpan Embedding",
            "face_image": _image_data_url("foto_swafoto", "M1_selfie.jpg"),
        },
    )
    assert ok_res.status_code == 200
    assert ok_res.json()["has_embedding"] is True

    bad_res = client.post(
        "/api/register",
        json={
            "nim": nim,
            "name": "Simpan Embedding",
            "face_image": "data:image/jpeg;base64,not-valid-base64!!!",
        },
    )
    assert bad_res.status_code == 400

    students = client.get("/api/students").json()
    stored = next(student for student in students if student["nim"] == nim)
    assert stored["has_embedding"] is True
