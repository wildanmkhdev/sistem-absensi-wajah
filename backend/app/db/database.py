"""
Database layer: Neon PostgreSQL (primary) dengan fallback ke SQLite lokal.
Koneksi Neon dikonfigurasi via env var DATABASE_URL.
Embedding disimpan sebagai JSON array ke kolom TEXT/vector.
"""
import json
import os
import logging
import sqlite3
from datetime import datetime
from typing import Optional, List, Dict, Any

from app.core.rules import BENCHMARK_CASES, HumanOversightStatus, AttendanceStatus

logger = logging.getLogger("app.db")

# ==============================================================================
# KONFIGURASI KONEKSI
# ==============================================================================
DATABASE_URL: str = os.environ.get("DATABASE_URL", "").strip()

# SQLite sebagai fallback lokal
DB_PATH: str = os.path.abspath(
    os.environ.get("DB_PATH", os.path.join(os.path.dirname(__file__), "..", "..", "attendance.db"))
)

# Flag: True = pakai Neon, False = pakai SQLite
_USE_NEON: bool = False


def _init_neon_driver() -> bool:
    """Coba import psycopg2 dan connect ke Neon. Return True jika berhasil."""
    global _USE_NEON
    if not DATABASE_URL:
        _USE_NEON = False
        logger.info("DATABASE_URL kosong; memakai SQLite.")
        return False
    try:
        import psycopg2  # noqa: F401
        conn = _get_neon_conn()
        conn.close()
        _USE_NEON = True
        logger.info("Neon PostgreSQL terhubung sebagai database utama.")
    except Exception as e:
        _USE_NEON = False
        logger.warning(f"Neon tidak tersedia, fallback ke SQLite: {e}")
    return _USE_NEON


def _get_neon_conn():
    """Buat koneksi psycopg2 ke Neon."""
    import psycopg2
    import psycopg2.extras
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = False
    return conn


def _get_sqlite_conn() -> sqlite3.Connection:
    """Buat koneksi SQLite lokal."""
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


# ==============================================================================
# INIT DB
# ==============================================================================
def init_db() -> None:
    """
    Inisialisasi tabel di Neon (atau SQLite fallback) dan seed data M1-M6.
    """
    _init_neon_driver()

    if _USE_NEON:
        _init_neon_tables()
    else:
        _init_sqlite_tables()

    try:
        seed_default_users()
    except Exception as exc:  # seeding akun awal tidak boleh menggagalkan startup
        logger.warning("Gagal menyiapkan akun awal: %s", exc)


def is_using_neon() -> bool:
    """True jika backend database aktif adalah Neon PostgreSQL."""
    return _USE_NEON


# ==============================================================================
# USERS (AUTENTIKASI)
# ==============================================================================
def get_user_by_username(username: str) -> Optional[Dict[str, Any]]:
    """Ambil satu user berdasarkan username."""
    if _USE_NEON:
        conn = _get_neon_conn()
        cur = conn.cursor()
        try:
            cur.execute(
                "SELECT username, password_hash, role, nim, name, created_at::TEXT "
                "FROM users WHERE username = %s",
                (username,),
            )
            row = cur.fetchone()
        finally:
            conn.close()
    else:
        conn = _get_sqlite_conn()
        try:
            cur = conn.execute(
                "SELECT username, password_hash, role, nim, name, created_at "
                "FROM users WHERE username = ?",
                (username,),
            )
            row = cur.fetchone()
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


def upsert_user(
    username: str,
    password_hash: str,
    role: str,
    nim: Optional[str],
    name: str,
) -> Dict[str, Any]:
    """Buat atau perbarui user (idempoten berdasarkan username)."""
    if _USE_NEON:
        conn = _get_neon_conn()
        cur = conn.cursor()
        try:
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
        finally:
            conn.close()
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
                (username, password_hash, role, nim, name, datetime.now().isoformat()),
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
    """Jumlah user terdaftar."""
    if _USE_NEON:
        conn = _get_neon_conn()
        cur = conn.cursor()
        try:
            cur.execute("SELECT COUNT(*) FROM users;")
            return int(cur.fetchone()[0])
        finally:
            conn.close()
    conn = _get_sqlite_conn()
    try:
        return int(conn.execute("SELECT COUNT(*) FROM users;").fetchone()[0])
    finally:
        conn.close()


def seed_default_users() -> None:
    """Seed akun awal hanya bila tabel users masih kosong."""
    if count_users() > 0:
        return

    from app.auth import hash_password  # lazy import: hindari circular import

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
            "name": "Ahmad Fauzi (M1 - Normal)",
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


def _init_neon_tables() -> None:
    conn = _get_neon_conn()
    cur = conn.cursor()
    try:
        # Aktifkan ekstensi pgvector jika belum (untuk kolom vector)
        try:
            cur.execute("CREATE EXTENSION IF NOT EXISTS vector;")
        except Exception:
            conn.rollback()

        cur.execute("""
        CREATE TABLE IF NOT EXISTS students (
            nim VARCHAR PRIMARY KEY,
            name VARCHAR NOT NULL,
            profile_image_path TEXT,
            embedding TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
        """)

        cur.execute("""
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
        """)

        cur.execute("""
        CREATE TABLE IF NOT EXISTS users (
            username VARCHAR PRIMARY KEY,
            password_hash TEXT NOT NULL,
            role VARCHAR NOT NULL,
            nim VARCHAR,
            name VARCHAR NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
        """)
        conn.commit()

        # Seed M1-M6 jika tabel students masih kosong
        cur.execute("SELECT COUNT(*) FROM students;")
        count = cur.fetchone()[0]
        if count == 0:
            logger.info("Seeding data mahasiswa benchmark M1-M6 ke Neon...")
            now_str = datetime.now().isoformat()
            for case in BENCHMARK_CASES:
                cur.execute(
                    """
                    INSERT INTO students (nim, name, profile_image_path, embedding, created_at)
                    VALUES (%s, %s, %s, %s, %s)
                    ON CONFLICT (nim) DO NOTHING;
                    """,
                    (
                        case["nim"],
                        f"{case['id']} - {case['name']}",
                        f"data/profiles/{case['nim']}.jpg",
                        None,
                        now_str,
                    ),
                )
            conn.commit()
            logger.info("Seeding Neon selesai.")
    finally:
        conn.close()


def _init_sqlite_tables() -> None:
    conn = _get_sqlite_conn()
    cursor = conn.cursor()
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS students (
        nim TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        profile_image_path TEXT,
        embedding TEXT,
        created_at TEXT NOT NULL
    );
    """)
    cursor.execute("""
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
    """)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        username TEXT PRIMARY KEY,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL,
        nim TEXT,
        name TEXT NOT NULL,
        created_at TEXT NOT NULL
    );
    """)
    conn.commit()

    cursor.execute("SELECT COUNT(*) FROM students;")
    count = cursor.fetchone()[0]
    if count == 0:
        now_str = datetime.now().isoformat()
        for case in BENCHMARK_CASES:
            cursor.execute(
                "INSERT OR REPLACE INTO students (nim, name, profile_image_path, embedding, created_at) VALUES (?, ?, ?, ?, ?)",
                (case["nim"], f"{case['id']} - {case['name']}", f"data/profiles/{case['nim']}.jpg", None, now_str),
            )
        conn.commit()
    conn.close()


# ==============================================================================
# HELPERS
# ==============================================================================
def _parse_embedding(raw) -> Optional[List[float]]:
    """Parse embedding dari JSON string atau list."""
    if raw is None:
        return None
    if isinstance(raw, list):
        return raw
    try:
        return json.loads(raw)
    except Exception:
        return None


def _serialize_embedding(embedding: Optional[List[float]]) -> Optional[str]:
    """Serialisasi embedding ke JSON string."""
    if embedding is None:
        return None
    return json.dumps(embedding)


# ==============================================================================
# STUDENTS
# ==============================================================================
def get_student(nim: str) -> Optional[Dict[str, Any]]:
    """Mengambil profil mahasiswa berdasarkan NIM."""
    if _USE_NEON:
        conn = _get_neon_conn()
        cur = conn.cursor()
        try:
            cur.execute("SELECT nim, name, profile_image_path, embedding, created_at::TEXT FROM students WHERE nim = %s", (nim,))
            row = cur.fetchone()
            if not row:
                return None
            d = {"nim": row[0], "name": row[1], "profile_image_path": row[2], "embedding": _parse_embedding(row[3]), "created_at": str(row[4])}
            return d
        finally:
            conn.close()
    else:
        conn = _get_sqlite_conn()
        cur = conn.cursor()
        cur.execute("SELECT * FROM students WHERE nim = ?", (nim,))
        row = cur.fetchone()
        conn.close()
        if not row:
            return None
        d = dict(row)
        d["embedding"] = _parse_embedding(d.get("embedding"))
        return d


def create_or_update_student(
    nim: str,
    name: str,
    profile_image_path: Optional[str] = None,
    embedding: Optional[List[float]] = None,
) -> Dict[str, Any]:
    """Menyimpan atau memperbarui data mahasiswa beserta vektor biometrik."""
    emb_json = _serialize_embedding(embedding)
    now_str = datetime.now().isoformat()

    if _USE_NEON:
        conn = _get_neon_conn()
        cur = conn.cursor()
        try:
            cur.execute(
                """
                INSERT INTO students (nim, name, profile_image_path, embedding, created_at)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (nim) DO UPDATE SET
                    name = EXCLUDED.name,
                    profile_image_path = COALESCE(EXCLUDED.profile_image_path, students.profile_image_path),
                    embedding = COALESCE(EXCLUDED.embedding, students.embedding);
                """,
                (nim, name, profile_image_path, emb_json, now_str),
            )
            conn.commit()
        finally:
            conn.close()
    else:
        conn = _get_sqlite_conn()
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO students (nim, name, profile_image_path, embedding, created_at)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(nim) DO UPDATE SET
                name=excluded.name,
                profile_image_path=COALESCE(excluded.profile_image_path, students.profile_image_path),
                embedding=COALESCE(excluded.embedding, students.embedding);
            """,
            (nim, name, profile_image_path, emb_json, now_str),
        )
        conn.commit()
        conn.close()

    return get_student(nim) or {"nim": nim, "name": name, "created_at": now_str}


def get_all_students() -> List[Dict[str, Any]]:
    """Mengambil semua daftar mahasiswa terdaftar."""
    if _USE_NEON:
        conn = _get_neon_conn()
        cur = conn.cursor()
        try:
            cur.execute("SELECT nim, name, profile_image_path, (embedding IS NOT NULL) AS has_embedding, created_at::TEXT FROM students ORDER BY nim ASC")
            rows = cur.fetchall()
            return [{"nim": r[0], "name": r[1], "profile_image_path": r[2], "has_embedding": bool(r[3]), "created_at": str(r[4])} for r in rows]
        finally:
            conn.close()
    else:
        conn = _get_sqlite_conn()
        cur = conn.cursor()
        cur.execute("SELECT nim, name, profile_image_path, (embedding IS NOT NULL) as has_embedding, created_at FROM students ORDER BY nim ASC")
        rows = cur.fetchall()
        conn.close()
        result = []
        for r in rows:
            item = dict(r)
            item["has_embedding"] = bool(item["has_embedding"])
            result.append(item)
        return result


def get_all_students_with_embeddings() -> List[Dict[str, Any]]:
    """Mengambil semua mahasiswa yang memiliki vektor biometrik (untuk 1:N matching)."""
    if _USE_NEON:
        conn = _get_neon_conn()
        cur = conn.cursor()
        try:
            cur.execute(
                "SELECT nim, name, profile_image_path, embedding, created_at::TEXT FROM students WHERE embedding IS NOT NULL"
            )
            rows = cur.fetchall()
            result = []
            for r in rows:
                emb = _parse_embedding(r[3])
                if emb:
                    result.append({"nim": r[0], "name": r[1], "profile_image_path": r[2], "embedding": emb, "created_at": str(r[4])})
            return result
        finally:
            conn.close()
    else:
        conn = _get_sqlite_conn()
        cur = conn.cursor()
        cur.execute("SELECT nim, name, profile_image_path, embedding, created_at FROM students WHERE embedding IS NOT NULL")
        rows = cur.fetchall()
        conn.close()
        result = []
        for r in rows:
            d = dict(r)
            d["embedding"] = _parse_embedding(d.get("embedding"))
            if d["embedding"]:
                result.append(d)
        return result


# ==============================================================================
# ATTENDANCES
# ==============================================================================
def create_attendance(record: Dict[str, Any]) -> Dict[str, Any]:
    """Menyimpan pencatatan presensi mahasiswa ke database."""
    if _USE_NEON:
        conn = _get_neon_conn()
        cur = conn.cursor()
        try:
            cur.execute(
                """
                INSERT INTO attendances (
                    nim, student_name, timestamp, similarity_score, distance_meters,
                    late_minutes, status, status_awal, status_uupdp, decision_reason,
                    requires_human_oversight, human_oversight_status, note, resolved_by,
                    resolution_note, resolved_at, photo_path, legal_basis, simulated_case
                ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                RETURNING id;
                """,
                (
                    record["nim"],
                    record["student_name"],
                    record.get("timestamp", datetime.now().isoformat()),
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
                ),
            )
            inserted_id = cur.fetchone()[0]
            conn.commit()
        finally:
            conn.close()
        return get_attendance_by_id(inserted_id) or record
    else:
        conn = _get_sqlite_conn()
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO attendances (
                nim, student_name, timestamp, similarity_score, distance_meters,
                late_minutes, status, status_awal, status_uupdp, decision_reason,
                requires_human_oversight, human_oversight_status, note, resolved_by,
                resolution_note, resolved_at, photo_path, legal_basis, simulated_case
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            """,
            (
                record["nim"],
                record["student_name"],
                record.get("timestamp", datetime.now().isoformat()),
                float(record["similarity_score"]),
                float(record["distance_meters"]),
                float(record["late_minutes"]),
                record["status"],
                record.get("status_awal", record["status"]),
                record.get("status_uupdp", record["status"]),
                record.get("decision_reason", ""),
                1 if record.get("requires_human_oversight") else 0,
                record.get("human_oversight_status", HumanOversightStatus.NONE.value),
                record.get("note"),
                record.get("resolved_by"),
                record.get("resolution_note"),
                record.get("resolved_at"),
                record.get("photo_path"),
                record.get("legal_basis"),
                record.get("simulated_case"),
            ),
        )
        conn.commit()
        inserted_id = cur.lastrowid
        conn.close()
        return get_attendance_by_id(inserted_id) or record


def get_attendance_by_id(attendance_id: int) -> Optional[Dict[str, Any]]:
    """Mengambil rekaman presensi berdasarkan ID."""
    if _USE_NEON:
        conn = _get_neon_conn()
        cur = conn.cursor()
        try:
            cur.execute("SELECT * FROM attendances WHERE id = %s", (attendance_id,))
            row = cur.fetchone()
            if not row:
                return None
            cols = [desc[0] for desc in cur.description]
            d = dict(zip(cols, row))
            d["requires_human_oversight"] = bool(d.get("requires_human_oversight"))
            return d
        finally:
            conn.close()
    else:
        conn = _get_sqlite_conn()
        cur = conn.cursor()
        cur.execute("SELECT * FROM attendances WHERE id = ?", (attendance_id,))
        row = cur.fetchone()
        conn.close()
        if not row:
            return None
        d = dict(row)
        d["requires_human_oversight"] = bool(d.get("requires_human_oversight"))
        return d


def get_pending_oversight() -> List[Dict[str, Any]]:
    """Mengambil presensi yang memerlukan verifikasi dosen (UU PDP Pasal 34)."""
    if _USE_NEON:
        conn = _get_neon_conn()
        cur = conn.cursor()
        try:
            cur.execute(
                """
                SELECT * FROM attendances
                WHERE status = %s OR human_oversight_status = %s
                ORDER BY id DESC
                """,
                (AttendanceStatus.PERLU_VERIFIKASI_DOSEN.value, HumanOversightStatus.PENDING.value),
            )
            rows = cur.fetchall()
            cols = [desc[0] for desc in cur.description]
            result = []
            for r in rows:
                d = dict(zip(cols, r))
                d["requires_human_oversight"] = bool(d.get("requires_human_oversight"))
                result.append(d)
            return result
        finally:
            conn.close()
    else:
        conn = _get_sqlite_conn()
        cur = conn.cursor()
        cur.execute(
            "SELECT * FROM attendances WHERE status = ? OR human_oversight_status = ? ORDER BY id DESC",
            (AttendanceStatus.PERLU_VERIFIKASI_DOSEN.value, HumanOversightStatus.PENDING.value),
        )
        rows = cur.fetchall()
        conn.close()
        result = []
        for r in rows:
            d = dict(r)
            d["requires_human_oversight"] = bool(d.get("requires_human_oversight"))
            result.append(d)
        return result


def resolve_oversight(
    attendance_id: int,
    approved: bool,
    lecturer_note: str,
    resolved_by: str = "Dosen Pengampu",
) -> Optional[Dict[str, Any]]:
    """Menyelesaikan kasus human oversight oleh dosen."""
    current = get_attendance_by_id(attendance_id)
    if not current:
        return None

    now_str = datetime.now().isoformat()
    late = current.get("late_minutes", 0)

    if approved:
        new_status = AttendanceStatus.HADIR.value if late <= 15.0 else AttendanceStatus.TERLAMBAT.value
        oversight_status = HumanOversightStatus.APPROVED.value
    else:
        new_status = AttendanceStatus.TIDAK_SAH.value
        oversight_status = HumanOversightStatus.REJECTED.value

    if _USE_NEON:
        conn = _get_neon_conn()
        cur = conn.cursor()
        try:
            cur.execute(
                """
                UPDATE attendances
                SET status = %s, human_oversight_status = %s,
                    resolution_note = %s, resolved_by = %s, resolved_at = %s
                WHERE id = %s
                """,
                (new_status, oversight_status, lecturer_note, resolved_by, now_str, attendance_id),
            )
            conn.commit()
        finally:
            conn.close()
    else:
        conn = _get_sqlite_conn()
        cur = conn.cursor()
        cur.execute(
            "UPDATE attendances SET status=?, human_oversight_status=?, resolution_note=?, resolved_by=?, resolved_at=? WHERE id=?",
            (new_status, oversight_status, lecturer_note, resolved_by, now_str, attendance_id),
        )
        conn.commit()
        conn.close()

    return get_attendance_by_id(attendance_id)


def get_all_attendances(limit: int = 100) -> List[Dict[str, Any]]:
    """Mengambil semua riwayat rekaman presensi terbaru."""
    if _USE_NEON:
        conn = _get_neon_conn()
        cur = conn.cursor()
        try:
            cur.execute("SELECT * FROM attendances ORDER BY id DESC LIMIT %s", (limit,))
            rows = cur.fetchall()
            cols = [desc[0] for desc in cur.description]
            result = []
            for r in rows:
                d = dict(zip(cols, r))
                d["requires_human_oversight"] = bool(d.get("requires_human_oversight"))
                result.append(d)
            return result
        finally:
            conn.close()
    else:
        conn = _get_sqlite_conn()
        cur = conn.cursor()
        cur.execute("SELECT * FROM attendances ORDER BY id DESC LIMIT ?", (limit,))
        rows = cur.fetchall()
        conn.close()
        result = []
        for r in rows:
            d = dict(r)
            d["requires_human_oversight"] = bool(d.get("requires_human_oversight"))
            result.append(d)
        return result


def get_attendance_stats() -> Dict[str, int]:
    """Menghitung agregasi statistik presensi."""
    if _USE_NEON:
        conn = _get_neon_conn()
        cur = conn.cursor()
        try:
            cur.execute("SELECT COUNT(*) FROM attendances")
            total = cur.fetchone()[0]
            cur.execute("SELECT COUNT(*) FROM attendances WHERE status = %s", (AttendanceStatus.HADIR.value,))
            hadir = cur.fetchone()[0]
            cur.execute("SELECT COUNT(*) FROM attendances WHERE status = %s", (AttendanceStatus.TERLAMBAT.value,))
            terlambat = cur.fetchone()[0]
            cur.execute(
                "SELECT COUNT(*) FROM attendances WHERE status = %s OR human_oversight_status = %s",
                (AttendanceStatus.PERLU_VERIFIKASI_DOSEN.value, HumanOversightStatus.PENDING.value),
            )
            pending = cur.fetchone()[0]
            cur.execute("SELECT COUNT(*) FROM attendances WHERE status = %s", (AttendanceStatus.TIDAK_SAH.value,))
            tidak_sah = cur.fetchone()[0]
        finally:
            conn.close()
    else:
        conn = _get_sqlite_conn()
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM attendances"); total = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM attendances WHERE status = ?", (AttendanceStatus.HADIR.value,)); hadir = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM attendances WHERE status = ?", (AttendanceStatus.TERLAMBAT.value,)); terlambat = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM attendances WHERE status = ? OR human_oversight_status = ?", (AttendanceStatus.PERLU_VERIFIKASI_DOSEN.value, HumanOversightStatus.PENDING.value)); pending = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM attendances WHERE status = ?", (AttendanceStatus.TIDAK_SAH.value,)); tidak_sah = cur.fetchone()[0]
        conn.close()

    return {
        "total_attendances": total,
        "hadir_count": hadir,
        "terlambat_count": terlambat,
        "pending_oversight_count": pending,
        "tidak_sah_count": tidak_sah,
    }
