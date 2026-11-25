"""
Database layer — Neon PostgreSQL (primary) with a SQLite fallback.

Design goals:
  * Neon + pgvector is the production path: face templates live in a
    ``vector(512)`` column with an HNSW cosine index, so 1:N matching happens
    inside Postgres instead of shipping every row to the application.
  * SQLite remains a zero-config local fallback. It has no vector type, so
    matching falls back to an in-process cosine scan (fine for a classroom).
  * Every schema change is additive and idempotent so an existing deployment
    can be migrated without losing data.
  * Attendance is tied to a ``session`` (course + room + schedule). The client
    never supplies ``late_minutes``; it is derived from the schedule.
"""

from __future__ import annotations

import json
import logging
import os
import sqlite3
import threading
from contextlib import contextmanager
from datetime import datetime, timezone
from typing import Any, Dict, Iterator, List, Optional

from app.core.rules import BENCHMARK_CASES, AttendanceStatus, HumanOversightStatus

logger = logging.getLogger("app.db")

# ==============================================================================
# CONFIGURATION
# ==============================================================================
DATABASE_URL: str = os.environ.get("DATABASE_URL", "").strip()

DB_PATH: str = os.path.abspath(
    os.environ.get("DB_PATH", os.path.join(os.path.dirname(__file__), "..", "..", "attendance.db"))
)

_USE_NEON: bool = False
_HAS_PGVECTOR: bool = False

_POOL = None
_POOL_LOCK = threading.Lock()


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _now_iso() -> str:
    return _now().isoformat()


def _seed_benchmark_enabled() -> bool:
    """Seed the M1-M6 student rows only when explicitly requested."""
    return os.environ.get("SEED_BENCHMARK_STUDENTS", "").strip().lower() in (
        "1",
        "true",
        "yes",
        "on",
    )


# ==============================================================================
# CONNECTION MANAGEMENT
# ==============================================================================
def _get_pool():
    """Lazily create a thread-safe psycopg2 connection pool."""
    global _POOL
    if _POOL is None:
        with _POOL_LOCK:
            if _POOL is None:
                from psycopg2.pool import ThreadedConnectionPool

                minconn = int(os.environ.get("DB_POOL_MIN", "1"))
                maxconn = int(os.environ.get("DB_POOL_MAX", "8"))
                _POOL = ThreadedConnectionPool(minconn, maxconn, DATABASE_URL)
                logger.info("Neon connection pool ready (min=%d, max=%d).", minconn, maxconn)
    return _POOL


@contextmanager
def _neon_conn() -> Iterator[Any]:
    """Borrow a pooled connection and always return it clean."""
    pool = _get_pool()
    conn = pool.getconn()
    try:
        conn.autocommit = False
        yield conn
    finally:
        try:
            conn.rollback()
        except Exception:  # noqa: BLE001 - connection may already be broken
            pass
        pool.putconn(conn)


def _get_sqlite_conn() -> sqlite3.Connection:
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA foreign_keys=ON;")
    return conn


def _init_neon_driver() -> bool:
    """Try to connect to Neon. Returns True when PostgreSQL is the active backend."""
    global _USE_NEON
    if not DATABASE_URL:
        _USE_NEON = False
        logger.info("DATABASE_URL kosong; memakai SQLite.")
        return False
    try:
        import psycopg2  # noqa: F401

        with _neon_conn() as conn:
            cur = conn.cursor()
            cur.execute("SELECT 1;")
            cur.fetchone()
        _USE_NEON = True
        logger.info("Neon PostgreSQL terhubung sebagai database utama.")
    except Exception as exc:  # noqa: BLE001
        _USE_NEON = False
        logger.warning("Neon tidak tersedia, fallback ke SQLite: %s", exc)
    return _USE_NEON


def is_using_neon() -> bool:
    return _USE_NEON


def has_pgvector() -> bool:
    return _HAS_PGVECTOR


# ==============================================================================
# SCHEMA
# ==============================================================================
def init_db() -> None:
    """Create/migrate the schema and seed the initial accounts."""
    _init_neon_driver()
    if _USE_NEON:
        _init_neon_schema()
    else:
        _init_sqlite_schema()

    try:
        seed_default_users()
    except Exception as exc:  # noqa: BLE001
        logger.warning("Gagal menyiapkan akun awal: %s", exc)


def _init_neon_schema() -> None:
    global _HAS_PGVECTOR

    with _neon_conn() as conn:
        cur = conn.cursor()

        # pgvector is optional: if the extension cannot be installed we keep
        # the JSON column and fall back to in-process matching.
        try:
            cur.execute("CREATE EXTENSION IF NOT EXISTS vector;")
            conn.commit()
            _HAS_PGVECTOR = True
            logger.info("pgvector aktif.")
        except Exception as exc:  # noqa: BLE001
            conn.rollback()
            _HAS_PGVECTOR = False
            logger.warning("pgvector tidak tersedia; memakai pencarian di aplikasi: %s", exc)

        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS students (
                nim VARCHAR PRIMARY KEY,
                name VARCHAR NOT NULL,
                profile_image_path TEXT,
                embedding TEXT,
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
            """
        )
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS sessions (
                id SERIAL PRIMARY KEY,
                course_code VARCHAR NOT NULL,
                course_name VARCHAR NOT NULL,
                room_name VARCHAR,
                room_lat DOUBLE PRECISION NOT NULL,
                room_lon DOUBLE PRECISION NOT NULL,
                radius_m REAL NOT NULL DEFAULT 50,
                starts_at TIMESTAMPTZ NOT NULL,
                ends_at TIMESTAMPTZ NOT NULL,
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
            """
        )
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS attendances (
                id SERIAL PRIMARY KEY,
                nim VARCHAR NOT NULL,
                student_name VARCHAR NOT NULL,
                timestamp VARCHAR NOT NULL,
                similarity_score REAL NOT NULL,
                distance_meters REAL NOT NULL,
                late_minutes REAL NOT NULL,
                status VARCHAR NOT NULL,
                status_awal VARCHAR NOT NULL,
                status_uupdp VARCHAR NOT NULL,
                decision_reason TEXT NOT NULL,
                requires_human_oversight BOOLEAN NOT NULL DEFAULT FALSE,
                human_oversight_status VARCHAR NOT NULL DEFAULT 'NONE',
                note TEXT,
                resolved_by VARCHAR,
                resolution_note TEXT,
                resolved_at VARCHAR,
                photo_path TEXT,
                legal_basis TEXT,
                simulated_case VARCHAR
            );
            """
        )
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                username VARCHAR PRIMARY KEY,
                password_hash TEXT NOT NULL,
                role VARCHAR NOT NULL,
                nim VARCHAR,
                name VARCHAR NOT NULL,
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
            """
        )

        # --- Additive migrations -------------------------------------------
        student_columns = {
            "model_name": "VARCHAR",
            "model_version": "VARCHAR",
            "enrollment_count": "INTEGER NOT NULL DEFAULT 0",
            "consent_at": "TIMESTAMPTZ",
            "updated_at": "TIMESTAMPTZ",
        }
        for column, sql_type in student_columns.items():
            cur.execute(
                f"ALTER TABLE students ADD COLUMN IF NOT EXISTS {column} {sql_type};"
            )

        attendance_columns = {
            "session_id": "INTEGER",
            "gps_accuracy": "REAL",
            "model_version": "VARCHAR",
            "face_detection_score": "REAL",
        }
        for column, sql_type in attendance_columns.items():
            cur.execute(
                f"ALTER TABLE attendances ADD COLUMN IF NOT EXISTS {column} {sql_type};"
            )

        if _HAS_PGVECTOR:
            cur.execute(
                "ALTER TABLE students ADD COLUMN IF NOT EXISTS face_embedding vector(512);"
            )
            try:
                cur.execute(
                    """
                    CREATE INDEX IF NOT EXISTS students_face_embedding_hnsw
                    ON students USING hnsw (face_embedding vector_cosine_ops)
                    WITH (m = 16, ef_construction = 64);
                    """
                )
                conn.commit()
            except Exception as exc:  # noqa: BLE001
                # pgvector < 0.5 has no HNSW. Exact scan still works.
                conn.rollback()
                logger.warning(
                    "Index HNSW tidak dapat dibuat (pgvector lama?); "
                    "pencarian memakai exact scan: %s",
                    exc,
                )

        cur.execute(
            "CREATE INDEX IF NOT EXISTS attendances_nim_idx ON attendances (nim);"
        )
        cur.execute(
            "CREATE INDEX IF NOT EXISTS attendances_session_idx ON attendances (session_id);"
        )
        cur.execute(
            "CREATE INDEX IF NOT EXISTS attendances_status_idx ON attendances (status);"
        )
        cur.execute(
            """
            CREATE UNIQUE INDEX IF NOT EXISTS attendances_nim_session_uidx
            ON attendances (nim, session_id)
            WHERE session_id IS NOT NULL;
            """
        )
        cur.execute(
            "CREATE INDEX IF NOT EXISTS sessions_window_idx ON sessions (starts_at, ends_at);"
        )
        conn.commit()

    # NOTE: legacy JSON embeddings are intentionally NOT copied into
    # ``face_embedding``. They came from a different (hand-crafted) feature
    # extractor, so mixing them with ArcFace vectors would corrupt 1:N search.
    # Rows without a matching ``model_version`` are treated as "not enrolled"
    # and must be re-enrolled by their owner.

    _seed_benchmark_students()


def _init_sqlite_schema() -> None:
    conn = _get_sqlite_conn()
    cur = conn.cursor()
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS students (
            nim TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            profile_image_path TEXT,
            embedding TEXT,
            created_at TEXT NOT NULL
        );
        """
    )
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            course_code TEXT NOT NULL,
            course_name TEXT NOT NULL,
            room_name TEXT,
            room_lat REAL NOT NULL,
            room_lon REAL NOT NULL,
            radius_m REAL NOT NULL DEFAULT 50,
            starts_at TEXT NOT NULL,
            ends_at TEXT NOT NULL,
            created_at TEXT NOT NULL
        );
        """
    )
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS attendances (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nim TEXT NOT NULL,
            student_name TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            similarity_score REAL NOT NULL,
            distance_meters REAL NOT NULL,
            late_minutes REAL NOT NULL,
            status TEXT NOT NULL,
            status_awal TEXT NOT NULL,
            status_uupdp TEXT NOT NULL,
            decision_reason TEXT NOT NULL,
            requires_human_oversight INTEGER NOT NULL,
            human_oversight_status TEXT NOT NULL,
            note TEXT,
            resolved_by TEXT,
            resolution_note TEXT,
            resolved_at TEXT,
            photo_path TEXT,
            legal_basis TEXT,
            simulated_case TEXT
        );
        """
    )
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            username TEXT PRIMARY KEY,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL,
            nim TEXT,
            name TEXT NOT NULL,
            created_at TEXT NOT NULL
        );
        """
    )

    def _add_missing(table: str, columns: Dict[str, str]) -> None:
        existing = {row[1] for row in cur.execute(f"PRAGMA table_info({table});").fetchall()}
        for column, sql_type in columns.items():
            if column not in existing:
                cur.execute(f"ALTER TABLE {table} ADD COLUMN {column} {sql_type};")

    _add_missing(
        "students",
        {
            "model_name": "TEXT",
            "model_version": "TEXT",
            "enrollment_count": "INTEGER NOT NULL DEFAULT 0",
            "consent_at": "TEXT",
            "updated_at": "TEXT",
        },
    )
    _add_missing(
        "attendances",
        {
            "session_id": "INTEGER",
            "gps_accuracy": "REAL",
            "model_version": "TEXT",
            "face_detection_score": "REAL",
        },
    )

    cur.execute(
        "CREATE INDEX IF NOT EXISTS attendances_nim_idx ON attendances (nim);"
    )
    cur.execute(
        "CREATE INDEX IF NOT EXISTS attendances_session_idx ON attendances (session_id);"
    )
    cur.execute(
        "CREATE INDEX IF NOT EXISTS attendances_status_idx ON attendances (status);"
    )
    cur.execute(
        """
        CREATE UNIQUE INDEX IF NOT EXISTS attendances_nim_session_uidx
        ON attendances (nim, session_id)
        WHERE session_id IS NOT NULL;
        """
    )
    cur.execute(
        "CREATE INDEX IF NOT EXISTS sessions_window_idx ON sessions (starts_at, ends_at);"
    )
    conn.commit()
    conn.close()

    _seed_benchmark_students()


def _seed_benchmark_students() -> None:
    if not _seed_benchmark_enabled():
        return
    existing = count_students()
    if existing > 0:
        return

    logger.info("Seeding data mahasiswa benchmark M1-M6...")
    for case in BENCHMARK_CASES:
        create_or_update_student(
            nim=case["nim"],
            name=f"{case['id']} - {case['name']}",
            profile_image_path=None,
            embedding=None,
        )


# ==============================================================================
# HELPERS
# ==============================================================================
def _parse_embedding(raw: Any) -> Optional[List[float]]:
    if raw is None:
        return None
    if isinstance(raw, list):
        return [float(x) for x in raw]
    text = str(raw).strip()
    if not text:
        return None
    try:
        if text.startswith("["):
            return [float(x) for x in json.loads(text)]
        return [float(x) for x in text.strip("[]").split(",") if x.strip()]
    except Exception:  # noqa: BLE001
        return None


def _serialize_embedding(embedding: Optional[List[float]]) -> Optional[str]:
    if embedding is None:
        return None
    return json.dumps([float(x) for x in embedding])


def _to_vector_literal(embedding: List[float]) -> str:
    return "[" + ",".join(f"{float(x):.8f}" for x in embedding) + "]"


def _cosine(a: List[float], b: List[float]) -> float:
    if not a or not b or len(a) != len(b):
        return 0.0
    dot = 0.0
    na = 0.0
    nb = 0.0
    for x, y in zip(a, b):
        dot += x * y
        na += x * x
        nb += y * y
    if na <= 1e-12 or nb <= 1e-12:
        return 0.0
    return max(0.0, dot / ((na ** 0.5) * (nb ** 0.5)))


def _iso(value: Any) -> Optional[str]:
    if value is None:
        return None
    if isinstance(value, datetime):
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return value.isoformat()
    return str(value)


# ==============================================================================
# USERS
# ==============================================================================
def get_user_by_username(username: str) -> Optional[Dict[str, Any]]:
    if _USE_NEON:
        with _neon_conn() as conn:
            cur = conn.cursor()
            cur.execute(
                "SELECT username, password_hash, role, nim, name, created_at::TEXT "
                "FROM users WHERE username = %s",
                (username,),
            )
            row = cur.fetchone()
    else:
        conn = _get_sqlite_conn()
        try:
            row = conn.execute(
                "SELECT username, password_hash, role, nim, name, created_at "
                "FROM users WHERE username = ?",
                (username,),
            ).fetchone()
        finally:
            conn.close()

    if not row:
        return None
    return {
        "username": row[0],
        "password_hash": row[1],
        "role": row[2],
        "nim": row[3],
        "name": row[4],
        "created_at": str(row[5]),
    }


def get_user_by_nim(nim: str) -> Optional[Dict[str, Any]]:
    if not nim:
        return None
    if _USE_NEON:
        with _neon_conn() as conn:
            cur = conn.cursor()
            cur.execute(
                "SELECT username, password_hash, role, nim, name, created_at::TEXT "
                "FROM users WHERE nim = %s",
                (nim,),
            )
            row = cur.fetchone()
    else:
        conn = _get_sqlite_conn()
        try:
            row = conn.execute(
                "SELECT username, password_hash, role, nim, name, created_at "
                "FROM users WHERE nim = ?",
                (nim,),
            ).fetchone()
        finally:
            conn.close()

    if not row:
        return None
    return {
        "username": row[0],
        "password_hash": row[1],
        "role": row[2],
        "nim": row[3],
        "name": row[4],
        "created_at": str(row[5]),
    }


def update_user_nim(username: str, nim: str, name: Optional[str] = None) -> bool:
    if _USE_NEON:
        with _neon_conn() as conn:
            cur = conn.cursor()
            if name:
                cur.execute(
                    "UPDATE users SET nim = %s, name = %s WHERE username = %s",
                    (nim, name, username),
                )
            else:
                cur.execute(
                    "UPDATE users SET nim = %s WHERE username = %s",
                    (nim, username),
                )
            conn.commit()
            return bool(cur.rowcount)
    conn = _get_sqlite_conn()
    try:
        if name:
            cur = conn.execute(
                "UPDATE users SET nim = ?, name = ? WHERE username = ?",
                (nim, name, username),
            )
        else:
            cur = conn.execute(
                "UPDATE users SET nim = ? WHERE username = ?",
                (nim, username),
            )
        conn.commit()
        return bool(cur.rowcount)
    finally:
        conn.close()


def upsert_user(
    username: str,
    password_hash: str,
    role: str,
    nim: Optional[str],
    name: str,
) -> Dict[str, Any]:
    if _USE_NEON:
        with _neon_conn() as conn:
            cur = conn.cursor()
            cur.execute(
                """
                INSERT INTO users (username, password_hash, role, nim, name)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (username) DO UPDATE SET
                    password_hash = EXCLUDED.password_hash,
                    role = EXCLUDED.role,
                    nim = EXCLUDED.nim,
                    name = EXCLUDED.name;
                """,
                (username, password_hash, role, nim, name),
            )
            conn.commit()
    else:
        conn = _get_sqlite_conn()
        try:
            conn.execute(
                """
                INSERT INTO users (username, password_hash, role, nim, name, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(username) DO UPDATE SET
                    password_hash=excluded.password_hash,
                    role=excluded.role,
                    nim=excluded.nim,
                    name=excluded.name;
                """,
                (username, password_hash, role, nim, name, _now_iso()),
            )
            conn.commit()
        finally:
            conn.close()

    return get_user_by_username(username) or {
        "username": username,
        "role": role,
        "nim": nim,
        "name": name,
    }


def count_users() -> int:
    if _USE_NEON:
        with _neon_conn() as conn:
            cur = conn.cursor()
            cur.execute("SELECT COUNT(*) FROM users;")
            return int(cur.fetchone()[0])
    conn = _get_sqlite_conn()
    try:
        return int(conn.execute("SELECT COUNT(*) FROM users;").fetchone()[0])
    finally:
        conn.close()


def seed_default_users() -> None:
    if count_users() > 0:
        return

    from app.auth import hash_password  # lazy import to avoid a cycle

    defaults = [
        {
            "username": os.environ.get("SEED_DOSEN_USERNAME", "dosen"),
            "password": os.environ.get("SEED_DOSEN_PASSWORD", "dosen123"),
            "role": "dosen",
            "nim": None,
            "name": "Dosen Pengampu",
        },
        {
            "username": os.environ.get("SEED_MAHASISWA_USERNAME", "mahasiswa"),
            "password": os.environ.get("SEED_MAHASISWA_PASSWORD", "mhs123"),
            "role": "mahasiswa",
            "nim": "2024001",
            "name": "Mahasiswa Demo",
        },
    ]
    for user in defaults:
        upsert_user(
            username=user["username"],
            password_hash=hash_password(user["password"]),
            role=user["role"],
            nim=user["nim"],
            name=user["name"],
        )
    logger.info("Akun awal dibuat: %s", ", ".join(u["username"] for u in defaults))


# ==============================================================================
# STUDENTS
# ==============================================================================
def _student_row_to_dict(row: Any, columns: List[str]) -> Dict[str, Any]:
    data = dict(zip(columns, row))
    data["embedding"] = _parse_embedding(data.get("embedding"))
    data["has_embedding"] = bool(data.get("embedding"))
    data["created_at"] = _iso(data.get("created_at"))
    data["updated_at"] = _iso(data.get("updated_at"))
    data["consent_at"] = _iso(data.get("consent_at"))
    return data


def get_student(nim: str) -> Optional[Dict[str, Any]]:
    if _USE_NEON:
        with _neon_conn() as conn:
            cur = conn.cursor()
            cur.execute(
                """
                SELECT nim, name, profile_image_path, embedding, created_at,
                       model_name, model_version, enrollment_count, consent_at, updated_at
                FROM students WHERE nim = %s
                """,
                (nim,),
            )
            row = cur.fetchone()
            if not row:
                return None
            columns = [d[0] for d in cur.description]
            return _student_row_to_dict(row, columns)

    conn = _get_sqlite_conn()
    try:
        row = conn.execute("SELECT * FROM students WHERE nim = ?", (nim,)).fetchone()
    finally:
        conn.close()
    if not row:
        return None
    data = dict(row)
    return _student_row_to_dict(list(data.values()), list(data.keys()))


def create_or_update_student(
    nim: str,
    name: str,
    profile_image_path: Optional[str] = None,
    embedding: Optional[List[float]] = None,
    model_name: Optional[str] = None,
    model_version: Optional[str] = None,
    consent: bool = False,
) -> Dict[str, Any]:
    """Insert or update a student profile and (optionally) a face template."""
    emb_json = _serialize_embedding(embedding)
    vector_literal = _to_vector_literal(embedding) if embedding else None
    now = _now_iso()
    consent_at = now if consent else None

    if _USE_NEON:
        with _neon_conn() as conn:
            cur = conn.cursor()
            if _HAS_PGVECTOR:
                cur.execute(
                    """
                    INSERT INTO students (
                        nim, name, profile_image_path, embedding, face_embedding,
                        model_name, model_version, enrollment_count, consent_at,
                        created_at, updated_at
                    )
                    VALUES (%s, %s, %s, %s, %s::vector, %s, %s,
                            CASE WHEN %s::vector IS NULL THEN 0 ELSE 1 END,
                            %s, %s, %s)
                    ON CONFLICT (nim) DO UPDATE SET
                        name = EXCLUDED.name,
                        profile_image_path = COALESCE(EXCLUDED.profile_image_path, students.profile_image_path),
                        embedding = COALESCE(EXCLUDED.embedding, students.embedding),
                        face_embedding = COALESCE(EXCLUDED.face_embedding, students.face_embedding),
                        model_name = COALESCE(EXCLUDED.model_name, students.model_name),
                        model_version = COALESCE(EXCLUDED.model_version, students.model_version),
                        enrollment_count = students.enrollment_count
                            + CASE WHEN EXCLUDED.face_embedding IS NULL THEN 0 ELSE 1 END,
                        consent_at = COALESCE(EXCLUDED.consent_at, students.consent_at),
                        updated_at = EXCLUDED.updated_at;
                    """,
                    (
                        nim,
                        name,
                        profile_image_path,
                        emb_json,
                        vector_literal,
                        model_name,
                        model_version,
                        vector_literal,
                        consent_at,
                        now,
                        now,
                    ),
                )
            else:
                cur.execute(
                    """
                    INSERT INTO students (
                        nim, name, profile_image_path, embedding, model_name,
                        model_version, enrollment_count, consent_at, created_at, updated_at
                    )
                    VALUES (%s, %s, %s, %s, %s, %s,
                            CASE WHEN %s IS NULL THEN 0 ELSE 1 END, %s, %s, %s)
                    ON CONFLICT (nim) DO UPDATE SET
                        name = EXCLUDED.name,
                        profile_image_path = COALESCE(EXCLUDED.profile_image_path, students.profile_image_path),
                        embedding = COALESCE(EXCLUDED.embedding, students.embedding),
                        model_name = COALESCE(EXCLUDED.model_name, students.model_name),
                        model_version = COALESCE(EXCLUDED.model_version, students.model_version),
                        enrollment_count = students.enrollment_count
                            + CASE WHEN EXCLUDED.embedding IS NULL THEN 0 ELSE 1 END,
                        consent_at = COALESCE(EXCLUDED.consent_at, students.consent_at),
                        updated_at = EXCLUDED.updated_at;
                    """,
                    (
                        nim,
                        name,
                        profile_image_path,
                        emb_json,
                        model_name,
                        model_version,
                        emb_json,
                        consent_at,
                        now,
                        now,
                    ),
                )
            conn.commit()
    else:
        conn = _get_sqlite_conn()
        try:
            conn.execute(
                """
                INSERT INTO students (
                    nim, name, profile_image_path, embedding, model_name,
                    model_version, enrollment_count, consent_at, created_at, updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?,
                        CASE WHEN ? IS NULL THEN 0 ELSE 1 END, ?, ?, ?)
                ON CONFLICT(nim) DO UPDATE SET
                    name=excluded.name,
                    profile_image_path=COALESCE(excluded.profile_image_path, students.profile_image_path),
                    embedding=COALESCE(excluded.embedding, students.embedding),
                    model_name=COALESCE(excluded.model_name, students.model_name),
                    model_version=COALESCE(excluded.model_version, students.model_version),
                    enrollment_count=students.enrollment_count
                        + CASE WHEN excluded.embedding IS NULL THEN 0 ELSE 1 END,
                    consent_at=COALESCE(excluded.consent_at, students.consent_at),
                    updated_at=excluded.updated_at;
                """,
                (
                    nim,
                    name,
                    profile_image_path,
                    emb_json,
                    model_name,
                    model_version,
                    emb_json,
                    consent_at,
                    now,
                    now,
                ),
            )
            conn.commit()
        finally:
            conn.close()

    return get_student(nim) or {"nim": nim, "name": name, "created_at": now}


def get_student_embedding(nim: str) -> Optional[List[float]]:
    """Return the stored face template, preferring the pgvector column."""
    if _USE_NEON:
        with _neon_conn() as conn:
            cur = conn.cursor()
            if _HAS_PGVECTOR:
                cur.execute(
                    "SELECT face_embedding::text, embedding FROM students WHERE nim = %s",
                    (nim,),
                )
                row = cur.fetchone()
                if not row:
                    return None
                vector = _parse_embedding(row[0]) if row[0] else None
                return vector or _parse_embedding(row[1])
            cur.execute("SELECT embedding FROM students WHERE nim = %s", (nim,))
            row = cur.fetchone()
            return _parse_embedding(row[0]) if row else None

    conn = _get_sqlite_conn()
    try:
        row = conn.execute("SELECT embedding FROM students WHERE nim = ?", (nim,)).fetchone()
    finally:
        conn.close()
    return _parse_embedding(row[0]) if row else None


def get_all_students() -> List[Dict[str, Any]]:
    if _USE_NEON:
        has_emb_expr = (
            "(embedding IS NOT NULL OR face_embedding IS NOT NULL)"
            if _HAS_PGVECTOR
            else "(embedding IS NOT NULL)"
        )
        with _neon_conn() as conn:
            cur = conn.cursor()
            cur.execute(
                f"""
                SELECT nim, name, profile_image_path,
                       {has_emb_expr} AS has_embedding,
                       model_version, enrollment_count, consent_at, created_at::TEXT
                FROM students ORDER BY nim ASC
                """
            )
            rows = cur.fetchall()
            return [
                {
                    "nim": r[0],
                    "name": r[1],
                    "profile_image_path": r[2],
                    "has_embedding": bool(r[3]),
                    "model_version": r[4],
                    "enrollment_count": r[5],
                    "consent_at": _iso(r[6]),
                    "created_at": str(r[7]),
                }
                for r in rows
            ]

    conn = _get_sqlite_conn()
    try:
        rows = conn.execute(
            """
            SELECT nim, name, profile_image_path, (embedding IS NOT NULL) AS has_embedding,
                   model_version, enrollment_count, consent_at, created_at
            FROM students ORDER BY nim ASC
            """
        ).fetchall()
    finally:
        conn.close()
    return [dict(r) for r in rows]


def get_all_students_with_embeddings() -> List[Dict[str, Any]]:
    """Fallback path for SQLite / installations without pgvector."""
    if _USE_NEON:
        with _neon_conn() as conn:
            cur = conn.cursor()
            cur.execute(
                "SELECT nim, name, profile_image_path, embedding, model_version, created_at::TEXT "
                "FROM students WHERE embedding IS NOT NULL"
            )
            rows = cur.fetchall()
            result = []
            for r in rows:
                emb = _parse_embedding(r[3])
                if emb:
                    result.append(
                        {
                            "nim": r[0],
                            "name": r[1],
                            "profile_image_path": r[2],
                            "embedding": emb,
                            "model_version": r[4],
                            "created_at": str(r[5]),
                        }
                    )
            return result

    conn = _get_sqlite_conn()
    try:
        rows = conn.execute(
            "SELECT nim, name, profile_image_path, embedding, model_version, created_at "
            "FROM students WHERE embedding IS NOT NULL"
        ).fetchall()
    finally:
        conn.close()
    result = []
    for r in rows:
        data = dict(r)
        data["embedding"] = _parse_embedding(data.get("embedding"))
        if data["embedding"]:
            result.append(data)
    return result


def find_best_matches(
    embedding: List[float], limit: int = 5, model_version: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Return the closest enrolled students by cosine similarity.

    Uses pgvector's HNSW index on Neon; otherwise performs an in-process scan.
    Templates from a different model version are excluded, because vectors from
    different models are not comparable.
    """
    if not embedding:
        return []

    if _USE_NEON and _HAS_PGVECTOR:
        literal = _to_vector_literal(embedding)
        query = (
            "SELECT nim, name, model_version, "
            "GREATEST(0.0, LEAST(1.0, 1 - (face_embedding <=> %s::vector))) AS similarity "
            "FROM students WHERE face_embedding IS NOT NULL"
        )
        params: List[Any] = [literal]
        if model_version:
            # Strict match: a NULL model_version means a legacy template from a
            # different feature extractor and is never comparable.
            query += " AND model_version = %s"
            params.append(model_version)
        query += " ORDER BY face_embedding <=> %s::vector LIMIT %s"
        params.extend([literal, limit])

        with _neon_conn() as conn:
            cur = conn.cursor()
            cur.execute(query, params)
            rows = cur.fetchall()
        return [
            {
                "nim": r[0],
                "name": r[1],
                "model_version": r[2],
                "similarity": float(r[3]),
            }
            for r in rows
        ]

    candidates = get_all_students_with_embeddings()
    scored = []
    for cand in candidates:
        if model_version and cand.get("model_version") != model_version:
            continue
        similarity = _cosine(embedding, cand["embedding"])
        scored.append(
            {
                "nim": cand["nim"],
                "name": cand["name"],
                "model_version": cand.get("model_version"),
                "similarity": similarity,
            }
        )
    scored.sort(key=lambda item: item["similarity"], reverse=True)
    return scored[:limit]


def count_students() -> int:
    if _USE_NEON:
        with _neon_conn() as conn:
            cur = conn.cursor()
            cur.execute("SELECT COUNT(*) FROM students;")
            return int(cur.fetchone()[0])
    conn = _get_sqlite_conn()
    try:
        return int(conn.execute("SELECT COUNT(*) FROM students;").fetchone()[0])
    finally:
        conn.close()


def delete_student_biometric(nim: str) -> bool:
    """Erase the face template (right to erasure) while keeping the identity."""
    if _USE_NEON:
        with _neon_conn() as conn:
            cur = conn.cursor()
            if _HAS_PGVECTOR:
                cur.execute(
                    "UPDATE students SET embedding = NULL, face_embedding = NULL, "
                    "model_name = NULL, model_version = NULL, enrollment_count = 0, "
                    "updated_at = %s WHERE nim = %s",
                    (_now_iso(), nim),
                )
            else:
                cur.execute(
                    "UPDATE students SET embedding = NULL, model_name = NULL, "
                    "model_version = NULL, enrollment_count = 0, updated_at = %s "
                    "WHERE nim = %s",
                    (_now_iso(), nim),
                )
            updated = cur.rowcount
            conn.commit()
            return bool(updated)
    conn = _get_sqlite_conn()
    try:
        cur = conn.execute(
            "UPDATE students SET embedding = NULL, model_name = NULL, "
            "model_version = NULL, enrollment_count = 0, updated_at = ? WHERE nim = ?",
            (_now_iso(), nim),
        )
        conn.commit()
        return bool(cur.rowcount)
    finally:
        conn.close()


# ==============================================================================
# SESSIONS
# ==============================================================================
_SESSION_COLUMNS = [
    "id",
    "course_code",
    "course_name",
    "room_name",
    "room_lat",
    "room_lon",
    "radius_m",
    "starts_at",
    "ends_at",
    "created_at",
]


def _session_row_to_dict(row: Any) -> Dict[str, Any]:
    data = dict(zip(_SESSION_COLUMNS, row))
    data["starts_at"] = _iso(data.get("starts_at"))
    data["ends_at"] = _iso(data.get("ends_at"))
    data["created_at"] = _iso(data.get("created_at"))
    return data


def create_session(
    course_code: str,
    course_name: str,
    room_lat: float,
    room_lon: float,
    starts_at: str,
    ends_at: str,
    room_name: Optional[str] = None,
    radius_m: float = 50.0,
) -> Dict[str, Any]:
    if _USE_NEON:
        with _neon_conn() as conn:
            cur = conn.cursor()
            cur.execute(
                """
                INSERT INTO sessions (
                    course_code, course_name, room_name, room_lat, room_lon,
                    radius_m, starts_at, ends_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id;
                """,
                (
                    course_code,
                    course_name,
                    room_name,
                    float(room_lat),
                    float(room_lon),
                    float(radius_m),
                    starts_at,
                    ends_at,
                ),
            )
            session_id = cur.fetchone()[0]
            conn.commit()
        return get_session(int(session_id)) or {}

    conn = _get_sqlite_conn()
    try:
        cur = conn.execute(
            """
            INSERT INTO sessions (
                course_code, course_name, room_name, room_lat, room_lon,
                radius_m, starts_at, ends_at, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                course_code,
                course_name,
                room_name,
                float(room_lat),
                float(room_lon),
                float(radius_m),
                starts_at,
                ends_at,
                _now_iso(),
            ),
        )
        conn.commit()
        session_id = int(cur.lastrowid)
    finally:
        conn.close()
    return get_session(session_id) or {}


def get_session(session_id: int) -> Optional[Dict[str, Any]]:
    if _USE_NEON:
        with _neon_conn() as conn:
            cur = conn.cursor()
            cur.execute(
                "SELECT id, course_code, course_name, room_name, room_lat, room_lon, "
                "radius_m, starts_at, ends_at, created_at FROM sessions WHERE id = %s",
                (session_id,),
            )
            row = cur.fetchone()
        return _session_row_to_dict(row) if row else None

    conn = _get_sqlite_conn()
    try:
        row = conn.execute("SELECT * FROM sessions WHERE id = ?", (session_id,)).fetchone()
    finally:
        conn.close()
    if not row:
        return None
    data = dict(row)
    return _session_row_to_dict([data.get(c) for c in _SESSION_COLUMNS])


DUMMY_ACTIVE_COURSES = [
    {
        "course_code": "IF3201",
        "course_name": "Kecerdasan Buatan & Pengenalan Pola",
        "room_name": "UINSU Tuntungan - Lab AI & Komputer (Gedung B Lt. 2)",
        "radius_m": 50.0,
    },
    {
        "course_code": "IF3105",
        "course_name": "Pengolahan Citra Digital & Visi Komputer",
        "room_name": "UINSU Tuntungan - Lab Multimedia & Robotika (Gedung B Lt. 3)",
        "radius_m": 50.0,
    },
    {
        "course_code": "IF2204",
        "course_name": "Rekayasa Perangkat Lunak Terdistribusi",
        "room_name": "UINSU Tuntungan - Ruang Kuliah R-302 (FST UINSU Lt. 3)",
        "radius_m": 50.0,
    },
    {
        "course_code": "IF4102",
        "course_name": "Etika Profesi & Hukum Privasi Data (UU PDP)",
        "room_name": "UINSU Tuntungan - Auditorium H.M. Arsyad Thalib Lubis",
        "radius_m": 60.0,
    },
]


def ensure_dummy_active_sessions(existing_sessions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Auto-provision rich active dummy sessions at UINSU Tuntungan for prototype testing."""
    from datetime import timedelta
    from app.core.geo import DEFAULT_CLASSROOM_LAT, DEFAULT_CLASSROOM_LON

    existing_codes = {s.get("course_code") for s in existing_sessions}
    now = _now()
    starts = (now - timedelta(minutes=10)).isoformat()
    ends = (now + timedelta(hours=8)).isoformat()

    added: List[Dict[str, Any]] = []
    for dummy in DUMMY_ACTIVE_COURSES:
        if dummy["course_code"] not in existing_codes:
            try:
                session = create_session(
                    course_code=dummy["course_code"],
                    course_name=dummy["course_name"],
                    room_lat=DEFAULT_CLASSROOM_LAT,
                    room_lon=DEFAULT_CLASSROOM_LON,
                    starts_at=starts,
                    ends_at=ends,
                    room_name=dummy["room_name"],
                    radius_m=dummy["radius_m"],
                )
                if session:
                    added.append(session)
                    existing_codes.add(dummy["course_code"])
            except Exception as exc:  # noqa: BLE001
                logger.warning("Gagal membuat sesi dummy %s: %s", dummy["course_code"], exc)

    return [*existing_sessions, *added]


def get_active_sessions(now: Optional[str] = None) -> List[Dict[str, Any]]:
    moment = now or _now_iso()
    sessions: List[Dict[str, Any]] = []
    if _USE_NEON:
        with _neon_conn() as conn:
            cur = conn.cursor()
            cur.execute(
                """
                SELECT id, course_code, course_name, room_name, room_lat, room_lon,
                       radius_m, starts_at, ends_at, created_at
                FROM sessions
                WHERE starts_at <= %s AND ends_at >= %s
                ORDER BY starts_at ASC
                """,
                (moment, moment),
            )
            rows = cur.fetchall()
        sessions = [_session_row_to_dict(r) for r in rows]
    else:
        conn = _get_sqlite_conn()
        try:
            rows = conn.execute(
                "SELECT * FROM sessions WHERE starts_at <= ? AND ends_at >= ? ORDER BY starts_at ASC",
                (moment, moment),
            ).fetchall()
        finally:
            conn.close()
        sessions = [_session_row_to_dict([dict(r).get(c) for c in _SESSION_COLUMNS]) for r in rows]

    if len(sessions) < len(DUMMY_ACTIVE_COURSES):
        sessions = ensure_dummy_active_sessions(sessions)

    return sessions


def list_sessions(limit: int = 50) -> List[Dict[str, Any]]:
    if _USE_NEON:
        with _neon_conn() as conn:
            cur = conn.cursor()
            cur.execute(
                "SELECT id, course_code, course_name, room_name, room_lat, room_lon, "
                "radius_m, starts_at, ends_at, created_at FROM sessions "
                "ORDER BY starts_at DESC LIMIT %s",
                (limit,),
            )
            rows = cur.fetchall()
        return [_session_row_to_dict(r) for r in rows]

    conn = _get_sqlite_conn()
    try:
        rows = conn.execute(
            "SELECT * FROM sessions ORDER BY starts_at DESC LIMIT ?", (limit,)
        ).fetchall()
    finally:
        conn.close()
    return [_session_row_to_dict([dict(r).get(c) for c in _SESSION_COLUMNS]) for r in rows]


# ==============================================================================
# ATTENDANCES
# ==============================================================================
_ATTENDANCE_FIELDS = [
    "nim",
    "student_name",
    "timestamp",
    "similarity_score",
    "distance_meters",
    "late_minutes",
    "status",
    "status_awal",
    "status_uupdp",
    "decision_reason",
    "requires_human_oversight",
    "human_oversight_status",
    "note",
    "resolved_by",
    "resolution_note",
    "resolved_at",
    "photo_path",
    "legal_basis",
    "simulated_case",
    "session_id",
    "gps_accuracy",
    "model_version",
    "face_detection_score",
]


def _attendance_values(record: Dict[str, Any]) -> List[Any]:
    return [
        record["nim"],
        record["student_name"],
        record.get("timestamp", _now_iso()),
        float(record["similarity_score"]),
        float(record["distance_meters"]),
        float(record["late_minutes"]),
        record["status"],
        record.get("status_awal", record["status"]),
        record.get("status_uupdp", record["status"]),
        record.get("decision_reason", ""),
        bool(record.get("requires_human_oversight", False)),
        record.get("human_oversight_status", HumanOversightStatus.NONE.value),
        record.get("note"),
        record.get("resolved_by"),
        record.get("resolution_note"),
        record.get("resolved_at"),
        record.get("photo_path"),
        record.get("legal_basis"),
        record.get("simulated_case"),
        record.get("session_id"),
        record.get("gps_accuracy"),
        record.get("model_version"),
        record.get("face_detection_score"),
    ]


def create_attendance(record: Dict[str, Any]) -> Dict[str, Any]:
    """Persist an attendance record. Returns the existing row on duplicate."""
    values = _attendance_values(record)

    if _USE_NEON:
        import psycopg2

        placeholders = ",".join(["%s"] * len(_ATTENDANCE_FIELDS))
        columns = ",".join(_ATTENDANCE_FIELDS)
        with _neon_conn() as conn:
            cur = conn.cursor()
            try:
                cur.execute(
                    f"INSERT INTO attendances ({columns}) VALUES ({placeholders}) RETURNING id;",
                    values,
                )
                inserted_id = cur.fetchone()[0]
                conn.commit()
            except psycopg2.errors.UniqueViolation:
                conn.rollback()
                existing = get_attendance_by_nim_session(
                    record["nim"], record.get("session_id")
                )
                if existing:
                    return existing
                raise
        return get_attendance_by_id(int(inserted_id)) or record

    conn = _get_sqlite_conn()
    try:
        placeholders = ",".join(["?"] * len(_ATTENDANCE_FIELDS))
        columns = ",".join(_ATTENDANCE_FIELDS)
        try:
            cur = conn.execute(
                f"INSERT INTO attendances ({columns}) VALUES ({placeholders})",
                [1 if isinstance(v, bool) else v for v in values],
            )
            conn.commit()
            inserted_id = int(cur.lastrowid)
        except sqlite3.IntegrityError:
            conn.rollback()
            existing = get_attendance_by_nim_session(record["nim"], record.get("session_id"))
            if existing:
                return existing
            raise
    finally:
        conn.close()
    return get_attendance_by_id(inserted_id) or record


def _attendance_select(where: str = "", params: tuple = (), limit: Optional[int] = None):
    base = (
        "SELECT a.*, s.course_code, s.course_name, s.room_name "
        "FROM attendances a LEFT JOIN sessions s ON s.id = a.session_id "
    )
    if where:
        base += f"WHERE {where} "
    base += "ORDER BY a.id DESC"
    if limit:
        base += " LIMIT ?"
        params = params + (limit,)
    return base, params


def _attendance_row(row: Any, columns: List[str]) -> Dict[str, Any]:
    data = dict(zip(columns, row))
    data["requires_human_oversight"] = bool(data.get("requires_human_oversight"))
    return data


def get_attendance_by_id(attendance_id: int) -> Optional[Dict[str, Any]]:
    if _USE_NEON:
        with _neon_conn() as conn:
            cur = conn.cursor()
            cur.execute(
                "SELECT a.*, s.course_code, s.course_name, s.room_name "
                "FROM attendances a LEFT JOIN sessions s ON s.id = a.session_id "
                "WHERE a.id = %s",
                (attendance_id,),
            )
            row = cur.fetchone()
            if not row:
                return None
            columns = [d[0] for d in cur.description]
        return _attendance_row(row, columns)

    conn = _get_sqlite_conn()
    try:
        row = conn.execute(
            "SELECT a.*, s.course_code, s.course_name, s.room_name "
            "FROM attendances a LEFT JOIN sessions s ON s.id = a.session_id "
            "WHERE a.id = ?",
            (attendance_id,),
        ).fetchone()
    finally:
        conn.close()
    if not row:
        return None
    data = dict(row)
    return _attendance_row(list(data.values()), list(data.keys()))


def get_attendance_by_nim_session(
    nim: str, session_id: Optional[int]
) -> Optional[Dict[str, Any]]:
    if session_id is None:
        return None
    if _USE_NEON:
        with _neon_conn() as conn:
            cur = conn.cursor()
            cur.execute(
                "SELECT a.*, s.course_code, s.course_name, s.room_name "
                "FROM attendances a LEFT JOIN sessions s ON s.id = a.session_id "
                "WHERE a.nim = %s AND a.session_id = %s ORDER BY a.id DESC LIMIT 1",
                (nim, session_id),
            )
            row = cur.fetchone()
            if not row:
                return None
            columns = [d[0] for d in cur.description]
        return _attendance_row(row, columns)

    conn = _get_sqlite_conn()
    try:
        row = conn.execute(
            "SELECT a.*, s.course_code, s.course_name, s.room_name "
            "FROM attendances a LEFT JOIN sessions s ON s.id = a.session_id "
            "WHERE a.nim = ? AND a.session_id = ? ORDER BY a.id DESC LIMIT 1",
            (nim, session_id),
        ).fetchone()
    finally:
        conn.close()
    if not row:
        return None
    data = dict(row)
    return _attendance_row(list(data.values()), list(data.keys()))


def get_pending_oversight() -> List[Dict[str, Any]]:
    where = "a.status = ? OR a.human_oversight_status = ?"
    params = (
        AttendanceStatus.PERLU_VERIFIKASI_DOSEN.value,
        HumanOversightStatus.PENDING.value,
    )
    if _USE_NEON:
        sql = (
            "SELECT a.*, s.course_code, s.course_name, s.room_name "
            "FROM attendances a LEFT JOIN sessions s ON s.id = a.session_id "
            "WHERE a.status = %s OR a.human_oversight_status = %s ORDER BY a.id DESC"
        )
        with _neon_conn() as conn:
            cur = conn.cursor()
            cur.execute(sql, params)
            rows = cur.fetchall()
            columns = [d[0] for d in cur.description]
        return [_attendance_row(r, columns) for r in rows]

    sql, params = _attendance_select(where, params)
    conn = _get_sqlite_conn()
    try:
        rows = conn.execute(sql, params).fetchall()
    finally:
        conn.close()
    return [_attendance_row(list(dict(r).values()), list(dict(r).keys())) for r in rows]


def resolve_oversight(
    attendance_id: int,
    approved: bool,
    lecturer_note: str,
    resolved_by: str = "Dosen Pengampu",
) -> Optional[Dict[str, Any]]:
    current = get_attendance_by_id(attendance_id)
    if not current:
        return None

    late = float(current.get("late_minutes") or 0)
    if approved:
        new_status = (
            AttendanceStatus.HADIR.value
            if late <= 15.0
            else AttendanceStatus.TERLAMBAT.value
        )
        oversight_status = HumanOversightStatus.APPROVED.value
    else:
        new_status = AttendanceStatus.TIDAK_SAH.value
        oversight_status = HumanOversightStatus.REJECTED.value

    now = _now_iso()
    if _USE_NEON:
        with _neon_conn() as conn:
            cur = conn.cursor()
            cur.execute(
                """
                UPDATE attendances
                SET status = %s, human_oversight_status = %s, resolution_note = %s,
                    resolved_by = %s, resolved_at = %s
                WHERE id = %s
                """,
                (new_status, oversight_status, lecturer_note, resolved_by, now, attendance_id),
            )
            conn.commit()
    else:
        conn = _get_sqlite_conn()
        try:
            conn.execute(
                "UPDATE attendances SET status=?, human_oversight_status=?, resolution_note=?, "
                "resolved_by=?, resolved_at=? WHERE id=?",
                (new_status, oversight_status, lecturer_note, resolved_by, now, attendance_id),
            )
            conn.commit()
        finally:
            conn.close()

    return get_attendance_by_id(attendance_id)


def get_all_attendances(limit: int = 100, nim: Optional[str] = None) -> List[Dict[str, Any]]:
    if _USE_NEON:
        sql = (
            "SELECT a.*, s.course_code, s.course_name, s.room_name "
            "FROM attendances a LEFT JOIN sessions s ON s.id = a.session_id "
        )
        params: List[Any] = []
        if nim:
            sql += "WHERE a.nim = %s "
            params.append(nim)
        sql += "ORDER BY a.id DESC LIMIT %s"
        params.append(limit)
        with _neon_conn() as conn:
            cur = conn.cursor()
            cur.execute(sql, params)
            rows = cur.fetchall()
            columns = [d[0] for d in cur.description]
        return [_attendance_row(r, columns) for r in rows]

    where = "a.nim = ?" if nim else ""
    params = (nim,) if nim else ()
    sql, params = _attendance_select(where, params, limit=limit)
    conn = _get_sqlite_conn()
    try:
        rows = conn.execute(sql, params).fetchall()
    finally:
        conn.close()
    result = []
    for r in rows:
        data = dict(r)
        result.append(_attendance_row(list(data.values()), list(data.keys())))
    return result


def get_attendance_stats() -> Dict[str, int]:
    """Aggregate stats, excluding simulated benchmark rows."""
    condition = "(simulated_case IS NULL OR simulated_case = '')"
    if _USE_NEON:
        with _neon_conn() as conn:
            cur = conn.cursor()
            cur.execute(f"SELECT COUNT(*) FROM attendances WHERE {condition}")
            total = int(cur.fetchone()[0])
            cur.execute(
                f"SELECT COUNT(*) FROM attendances WHERE {condition} AND status = %s",
                (AttendanceStatus.HADIR.value,),
            )
            hadir = int(cur.fetchone()[0])
            cur.execute(
                f"SELECT COUNT(*) FROM attendances WHERE {condition} AND status = %s",
                (AttendanceStatus.TERLAMBAT.value,),
            )
            terlambat = int(cur.fetchone()[0])
            cur.execute(
                f"SELECT COUNT(*) FROM attendances WHERE {condition} AND "
                "(status = %s OR human_oversight_status = %s)",
                (
                    AttendanceStatus.PERLU_VERIFIKASI_DOSEN.value,
                    HumanOversightStatus.PENDING.value,
                ),
            )
            pending = int(cur.fetchone()[0])
            cur.execute(
                f"SELECT COUNT(*) FROM attendances WHERE {condition} AND status = %s",
                (AttendanceStatus.TIDAK_SAH.value,),
            )
            tidak_sah = int(cur.fetchone()[0])
    else:
        conn = _get_sqlite_conn()
        try:
            total = int(conn.execute(f"SELECT COUNT(*) FROM attendances WHERE {condition}").fetchone()[0])
            hadir = int(
                conn.execute(
                    f"SELECT COUNT(*) FROM attendances WHERE {condition} AND status = ?",
                    (AttendanceStatus.HADIR.value,),
                ).fetchone()[0]
            )
            terlambat = int(
                conn.execute(
                    f"SELECT COUNT(*) FROM attendances WHERE {condition} AND status = ?",
                    (AttendanceStatus.TERLAMBAT.value,),
                ).fetchone()[0]
            )
            pending = int(
                conn.execute(
                    f"SELECT COUNT(*) FROM attendances WHERE {condition} AND "
                    "(status = ? OR human_oversight_status = ?)",
                    (
                        AttendanceStatus.PERLU_VERIFIKASI_DOSEN.value,
                        HumanOversightStatus.PENDING.value,
                    ),
                ).fetchone()[0]
            )
            tidak_sah = int(
                conn.execute(
                    f"SELECT COUNT(*) FROM attendances WHERE {condition} AND status = ?",
                    (AttendanceStatus.TIDAK_SAH.value,),
                ).fetchone()[0]
            )
        finally:
            conn.close()

    return {
        "total_attendances": total,
        "hadir_count": hadir,
        "terlambat_count": terlambat,
        "pending_oversight_count": pending,
        "tidak_sah_count": tidak_sah,
    }
