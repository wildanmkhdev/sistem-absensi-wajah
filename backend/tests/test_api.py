"""Full API integration tests for production flows."""

from datetime import datetime, timedelta, timezone
from pathlib import Path

from app.core.rules import AttendanceStatus
from tests.conftest import data_uri, make_session

FIXTURES = Path(__file__).resolve().parent / "fixtures"


def test_health_endpoint(client):
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert data["database"]["backend"] in ("sqlite", "neon")
    assert data["face_engine"]["available"] is True


def test_auth_login_and_me(client):
    res = client.post("/api/auth/login", json={"username": "dosen", "password": "dosen123"})
    assert res.status_code == 200
    token = res.json()["token"]

    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["role"] == "dosen"


def test_register_requires_biometric_consent(client, student_headers):
    res = client.post(
        "/api/register",
        json={
            "nim": "2024001",
            "name": "Mahasiswa",
            "face_image": data_uri(FIXTURES / "obama_a.jpg"),
            "consent": False,
        },
        headers=student_headers,
    )
    assert res.status_code == 400
    assert "Persetujuan" in res.json()["detail"]


def test_register_rejects_duplicate_face_across_nim(client, student_headers, enrolled_student):
    # Enrolled student registered obama_a under 2024001. Now try enrolling obama_b under another NIM (as lecturer)
    lec_res = client.post("/api/auth/login", json={"username": "dosen", "password": "dosen123"})
    lec_h = {"Authorization": f"Bearer {lec_res.json()['token']}"}

    res = client.post(
        "/api/register",
        json={
            "nim": "2024999",
            "name": "Impostor Account",
            "face_image": data_uri(FIXTURES / "obama_b.jpg"),
            "consent": True,
        },
        headers=lec_h,
    )
    assert res.status_code == 409
    assert "sudah terdaftar pada NIM lain" in res.json()["detail"]


def test_presensi_happy_path_genuine(client, student_headers, enrolled_student, active_session):
    res = client.post(
        "/api/presensi",
        json={
            "session_id": active_session["id"],
            "face_image": data_uri(FIXTURES / "obama_b.jpg"),
            "latitude": -6.200000,
            "longitude": 106.816666,
            "gps_accuracy": 10.0,
        },
        headers=student_headers,
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] in (AttendanceStatus.HADIR.value, AttendanceStatus.TERLAMBAT.value)
    assert data["similarity_score"] > 0.60
    assert data["duplicate"] is False


def test_presensi_duplicate_is_idempotent(client, student_headers, enrolled_student, active_session):
    payload = {
        "session_id": active_session["id"],
        "face_image": data_uri(FIXTURES / "obama_b.jpg"),
        "latitude": -6.200000,
        "longitude": 106.816666,
        "gps_accuracy": 10.0,
    }
    first = client.post("/api/presensi", json=payload, headers=student_headers)
    assert first.status_code == 200
    first_id = first.json()["id"]

    second = client.post("/api/presensi", json=payload, headers=student_headers)
    assert second.status_code == 200
    assert second.json()["id"] == first_id
    assert second.json()["duplicate"] is True


def test_presensi_low_gps_accuracy_rejected(client, student_headers, enrolled_student, active_session):
    res = client.post(
        "/api/presensi",
        json={
            "session_id": active_session["id"],
            "face_image": data_uri(FIXTURES / "obama_b.jpg"),
            "latitude": -6.200000,
            "longitude": 106.816666,
            "gps_accuracy": 150.0,  # Max allowed is 50m
        },
        headers=student_headers,
    )
    assert res.status_code == 422
    assert "Akurasi GPS terlalu rendah" in res.json()["detail"]


def test_presensi_impostor_rejected(client, student_headers, enrolled_student, active_session):
    # Enrolled obama_a, submit biden
    res = client.post(
        "/api/presensi",
        json={
            "session_id": active_session["id"],
            "face_image": data_uri(FIXTURES / "biden.jpg"),
            "latitude": -6.200000,
            "longitude": 106.816666,
            "gps_accuracy": 8.0,
        },
        headers=student_headers,
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == AttendanceStatus.TIDAK_SAH.value
    assert data["similarity_score"] < 0.15


def test_simulate_dry_run_does_not_persist(client, lecturer_headers):
    # Stats before
    stats_before = client.get("/api/stats", headers=lecturer_headers).json()
    initial_total = stats_before["total_attendances"]

    sim = client.post("/api/presensi/simulate", json={"case_id": "M4"}, headers=lecturer_headers)
    assert sim.status_code == 200
    assert sim.json()["status"] == AttendanceStatus.PERLU_VERIFIKASI_DOSEN.value
    assert sim.json()["persisted"] is False

    stats_after = client.get("/api/stats", headers=lecturer_headers).json()
    assert stats_after["total_attendances"] == initial_total


def test_biometric_erasure(client, student_headers, enrolled_student, active_session):
    # Delete biometric
    erase = client.delete("/api/students/2024001/biometric", headers=student_headers)
    assert erase.status_code == 200

    # Next presensi must fail with 409 not enrolled
    res = client.post(
        "/api/presensi",
        json={
            "session_id": active_session["id"],
            "face_image": data_uri(FIXTURES / "obama_a.jpg"),
            "latitude": -6.200000,
            "longitude": 106.816666,
            "gps_accuracy": 5.0,
        },
        headers=student_headers,
    )
    assert res.status_code == 409
    assert "Wajah belum terdaftar" in res.json()["detail"]


def test_auth_register_new_student_with_face(client):
    payload = {
        "username": "ahmad_fauzi",
        "password": "password123",
        "nim": "2024777",
        "name": "Ahmad Fauzi",
        "face_image": data_uri(FIXTURES / "obama_a.jpg"),
        "consent": True,
    }
    res = client.post("/api/auth/register", json=payload)
    assert res.status_code == 201
    data = res.json()
    assert "token" in data
    assert data["user"]["username"] == "ahmad_fauzi"
    assert data["user"]["nim"] == "2024777"
    assert data["user"]["role"] == "mahasiswa"

    # Verify student was created with embedding
    me = client.get("/api/students/me", headers={"Authorization": f"Bearer {data['token']}"})
    assert me.status_code == 200
    assert me.json()["has_embedding"] is True


def test_student_can_replace_face_anytime(client, student_headers, enrolled_student):
    # Student 2024001 updates/replaces their own face with obama_b
    res = client.post(
        "/api/register",
        json={
            "nim": "2024001",
            "name": "Mahasiswa",
            "face_image": data_uri(FIXTURES / "obama_b.jpg"),
            "consent": True,
        },
        headers=student_headers,
    )
    assert res.status_code == 200
    assert "berhasil diperbarui" in res.json()["message"]


def test_student_register_mismatched_nim_blocked(client, student_headers):
    # Logged in as student 2024001, try to enroll face under another NIM
    res = client.post(
        "/api/register",
        json={
            "nim": "9999999",
            "name": "Mahasiswa Lain",
            "face_image": data_uri(FIXTURES / "obama_b.jpg"),
            "consent": True,
        },
        headers=student_headers,
    )
    assert res.status_code == 403
    assert "Mahasiswa hanya dapat mendaftarkan wajahnya sendiri" in res.json()["detail"]

