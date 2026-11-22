"""Shared pytest fixtures.

Environment must be configured *before* importing ``app.main`` because
``app.db.database`` reads ``DB_PATH`` at import time.
"""

import base64
import os
from pathlib import Path

import pytest

os.environ.setdefault("AUTH_SECRET", "test-secret-not-for-production")
os.environ.setdefault("DATABASE_URL", "")
os.environ.setdefault("APP_ENV", "test")
os.environ.setdefault("FACE_ORT_THREADS", "2")

FIXTURES = Path(__file__).resolve().parent / "fixtures"
REPO_ROOT = Path(__file__).resolve().parents[2]


def data_uri(path: Path) -> str:
    raw = path.read_bytes()
    return "data:image/jpeg;base64," + base64.b64encode(raw).decode("ascii")


@pytest.fixture()
def client(tmp_path, monkeypatch):
    """Fresh SQLite database and a TestClient per test."""
    from app.db import database

    db_file = tmp_path / "attendance.db"
    monkeypatch.setattr(database, "DB_PATH", str(db_file))
    monkeypatch.setattr(database, "_USE_NEON", False)
    monkeypatch.setattr(database, "_HAS_PGVECTOR", False)

    from fastapi.testclient import TestClient

    from app.main import app

    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture()
def student_token(client):
    response = client.post(
        "/api/auth/login", json={"username": "mahasiswa", "password": "mhs123"}
    )
    assert response.status_code == 200, response.text
    return response.json()["token"]


@pytest.fixture()
def lecturer_token(client):
    response = client.post(
        "/api/auth/login", json={"username": "dosen", "password": "dosen123"}
    )
    assert response.status_code == 200, response.text
    return response.json()["token"]


@pytest.fixture()
def student_headers(student_token):
    return {"Authorization": f"Bearer {student_token}"}


@pytest.fixture()
def lecturer_headers(lecturer_token):
    return {"Authorization": f"Bearer {lecturer_token}"}


@pytest.fixture()
def enrolled_student(client, student_headers):
    response = client.post(
        "/api/register",
        json={
            "nim": "2024001",
            "name": "Mahasiswa Demo",
            "face_image": data_uri(FIXTURES / "obama_a.jpg"),
            "consent": True,
        },
        headers=student_headers,
    )
    assert response.status_code == 200, response.text
    return response.json()


def make_session(client, lecturer_headers, *, start_offset_minutes=-5, duration_minutes=60):
    from datetime import datetime, timedelta, timezone

    now = datetime.now(timezone.utc)
    response = client.post(
        "/api/sessions",
        json={
            "course_code": "IF101",
            "course_name": "Kecerdasan Buatan",
            "room_name": "Lab AI",
            "latitude": -6.2,
            "longitude": 106.816666,
            "radius_m": 50,
            "starts_at": (now + timedelta(minutes=start_offset_minutes)).isoformat(),
            "ends_at": (
                now + timedelta(minutes=start_offset_minutes + duration_minutes)
            ).isoformat(),
        },
        headers=lecturer_headers,
    )
    assert response.status_code == 201, response.text
    return response.json()


@pytest.fixture()
def active_session(client, lecturer_headers):
    return make_session(client, lecturer_headers)
