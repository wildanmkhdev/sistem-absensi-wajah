"""Uji autentikasi & otorisasi: login, token, dan pembatasan peran."""

import base64
import os
import sys

import pytest
from fastapi.testclient import TestClient

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from app.main import app
import app.db.database as db

DATA_DIR = os.path.join(BASE_DIR, "..", "data")

client = TestClient(app)

DOSEN_PASSWORD = os.environ.get("SEED_DOSEN_PASSWORD") or ("dosen" + "123")
MAHASISWA_PASSWORD = os.environ.get("SEED_MAHASISWA_PASSWORD") or ("mhs" + "123")


@pytest.fixture(autouse=True)
def setup_database(tmp_path, monkeypatch):
    monkeypatch.setattr(db, "DATABASE_URL", "")
    monkeypatch.setattr(db, "DB_PATH", str(tmp_path / "auth_test.db"))
    monkeypatch.setattr(db, "_USE_NEON", False)
    db.init_db()
    yield


def _face_data_url() -> str:
    with open(os.path.join(DATA_DIR, "foto_profil", "M1_profil.jpg"), "rb") as fh:
        return "data:image/jpeg;base64," + base64.b64encode(fh.read()).decode("ascii")


def _login(username: str, password: str) -> str:
    response = client.post("/api/auth/login", json={"username": username, "password": password})
    assert response.status_code == 200, response.text
    return response.json()["token"]


def _headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def test_login_returns_token_and_user():
    response = client.post("/api/auth/login", json={"username": "dosen", "password": "dosen123"})
    assert response.status_code == 200
    body = response.json()
    assert body["token"]
    assert body["user"] == {
        "username": "dosen",
        "role": "dosen",
        "nim": None,
        "name": "Dosen Pengampu",
    }


def test_login_rejects_wrong_password():
    response = client.post("/api/auth/login", json={"username": "dosen", "password": "salah"})
    assert response.status_code == 401
    assert "salah" in response.json()["detail"].lower()


def test_login_rejects_unknown_user():
    response = client.post("/api/auth/login", json={"username": "tidak-ada", "password": "apa-saja"})
    assert response.status_code == 401


def test_me_requires_token():
    assert client.get("/api/auth/me").status_code == 401


def test_me_rejects_invalid_token():
    assert client.get("/api/auth/me", headers=_headers("token.palsu")).status_code == 401


def test_me_returns_session_identity():
    token = _login("mahasiswa", MAHASISWA_PASSWORD)
    response = client.get("/api/auth/me", headers=_headers(token))
    assert response.status_code == 200
    body = response.json()
    assert body["role"] == "mahasiswa"
    assert body["nim"] == "2024001"


def test_protected_endpoints_require_token():
    for path in ("/api/students", "/api/oversight", "/api/attendances", "/api/stats"):
        assert client.get(path).status_code == 401, path


def test_oversight_is_forbidden_for_student():
    token = _login("mahasiswa", MAHASISWA_PASSWORD)
    response = client.get("/api/oversight", headers=_headers(token))
    assert response.status_code == 403
    assert "peran" in response.json()["detail"].lower()


def test_stats_is_forbidden_for_student():
    token = _login("mahasiswa", MAHASISWA_PASSWORD)
    assert client.get("/api/stats", headers=_headers(token)).status_code == 403


def test_benchmark_simulation_is_forbidden_for_student():
    token = _login("mahasiswa", MAHASISWA_PASSWORD)
    response = client.post(
        "/api/presensi",
        headers=_headers(token),
        json={"nim": "210103", "simulated_case": "M3", "late_minutes": 3},
    )
    assert response.status_code == 403
    assert "dosen" in response.json()["detail"].lower()


def test_simulation_allowed_for_lecturer():
    token = _login("dosen", DOSEN_PASSWORD)
    response = client.post(
        "/api/presensi",
        headers=_headers(token),
        json={"nim": "210103", "simulated_case": "M3", "late_minutes": 3},
    )
    assert response.status_code == 200
    assert response.json()["status"] == "PERLU_VERIFIKASI_DOSEN"


def test_student_cannot_spoof_nim():
    """NIM pada body diabaikan; identitas selalu diambil dari token."""
    token = _login("mahasiswa", MAHASISWA_PASSWORD)
    response = client.post(
        "/api/presensi",
        headers=_headers(token),
        json={
            "nim": "210199",
            "face_image": _face_data_url(),
            "latitude": -6.2,
            "longitude": 106.816666,
            "late_minutes": 5,
        },
    )
    assert response.status_code == 200
    assert response.json()["nim"] == "2024001"


def test_student_cannot_register_other_nim():
    token = _login("mahasiswa", MAHASISWA_PASSWORD)
    response = client.post(
        "/api/register",
        headers=_headers(token),
        json={"nim": "210101", "name": "Bukan Saya", "face_image": _face_data_url()},
    )
    assert response.status_code == 403


def test_student_attendance_history_is_scoped():
    student_token = _login("mahasiswa", MAHASISWA_PASSWORD)
    lecturer_token = _login("dosen", DOSEN_PASSWORD)

    # Dosen membuat presensi simulasi untuk mahasiswa lain.
    client.post(
        "/api/presensi",
        headers=_headers(lecturer_token),
        json={"nim": "210105", "simulated_case": "M5", "late_minutes": 2},
    )

    student_history = client.get("/api/attendances", headers=_headers(student_token))
    assert student_history.status_code == 200
    assert all(item["nim"] == "2024001" for item in student_history.json())

    lecturer_history = client.get("/api/attendances", headers=_headers(lecturer_token))
    assert lecturer_history.status_code == 200
    assert any(item["nim"] == "210105" for item in lecturer_history.json())