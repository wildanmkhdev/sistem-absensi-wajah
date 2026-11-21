"""
Autentikasi & otorisasi berbasis token untuk Sistem Presensi Wajah.

- Password disimpan sebagai PBKDF2-HMAC-SHA256 (salt acak, 200k iterasi).
- Token sesi stateless: payload JSON + HMAC-SHA256, ditandatangani `AUTH_SECRET`.
- Semua primitif memakai standard library (tanpa dependency tambahan).

Set `AUTH_SECRET` di environment produksi. Bila kosong, dipakai secret acak
per-proses (sesi tidak bertahan setelah restart) dan sebuah warning dicatat.
"""

import base64
import hashlib
import hmac
import json
import logging
import os
import secrets
import time
from typing import Any, Dict, Optional

from fastapi import Header, HTTPException, status

logger = logging.getLogger("app.auth")

PBKDF2_ALGORITHM = "pbkdf2_sha256"
PBKDF2_ITERATIONS = int(os.environ.get("AUTH_PBKDF2_ITERATIONS", "200000"))
TOKEN_TTL_SECONDS = int(os.environ.get("AUTH_TOKEN_TTL_SECONDS", str(12 * 3600)))

_ENV_SECRET = os.environ.get("AUTH_SECRET", "").strip()
_EPHEMERAL_SECRET: Optional[str] = None


def _secret() -> bytes:
    """Kunci HMAC untuk menandatangani token."""
    if _ENV_SECRET:
        return _ENV_SECRET.encode("utf-8")

    global _EPHEMERAL_SECRET
    if _EPHEMERAL_SECRET is None:
        _EPHEMERAL_SECRET = secrets.token_urlsafe(48)
        logger.warning(
            "AUTH_SECRET tidak diset; memakai secret sementara. "
            "Sesi akan hangus setiap proses restart."
        )
    return _EPHEMERAL_SECRET.encode("utf-8")


# ==============================================================================
# PASSWORD HASHING
# ==============================================================================
def hash_password(password: str) -> str:
    """Hash password menjadi `pbkdf2_sha256$iterasi$salt_hex$hash_hex`."""
    if not password:
        raise ValueError("Password tidak boleh kosong.")
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, PBKDF2_ITERATIONS)
    return f"{PBKDF2_ALGORITHM}${PBKDF2_ITERATIONS}${salt.hex()}${digest.hex()}"


def verify_password(password: str, stored_hash: str) -> bool:
    """Verifikasi password terhadap hash tersimpan (timing-safe)."""
    if not password or not stored_hash:
        return False
    try:
        algorithm, iterations, salt_hex, digest_hex = stored_hash.split("$")
        if algorithm != PBKDF2_ALGORITHM:
            return False
        digest = hashlib.pbkdf2_hmac(
            "sha256", password.encode("utf-8"), bytes.fromhex(salt_hex), int(iterations)
        )
        return hmac.compare_digest(digest.hex(), digest_hex)
    except (ValueError, TypeError):
        return False


# ==============================================================================
# TOKEN SESI
# ==============================================================================
def _b64e(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")


def _b64d(text: str) -> bytes:
    padding = "=" * (-len(text) % 4)
    return base64.urlsafe_b64decode(text + padding)


def _sign(body: str) -> str:
    return _b64e(hmac.new(_secret(), body.encode("ascii"), hashlib.sha256).digest())


def create_token(user: Dict[str, Any]) -> str:
    """Buat token sesi bertanda tangan untuk satu user."""
    now = int(time.time())
    payload = {
        "sub": user["username"],
        "role": user["role"],
        "nim": user.get("nim"),
        "name": user["name"],
        "iat": now,
        "exp": now + TOKEN_TTL_SECONDS,
    }
    body = _b64e(json.dumps(payload, separators=(",", ":"), ensure_ascii=False).encode("utf-8"))
    return f"{body}.{_sign(body)}"


def verify_token(token: str) -> Optional[Dict[str, Any]]:
    """Validasi tanda tangan & masa berlaku token. Return payload atau None."""
    if not token or "." not in token:
        return None
    body, signature = token.rsplit(".", 1)
    try:
        if not hmac.compare_digest(signature, _sign(body)):
            return None
        payload = json.loads(_b64d(body).decode("utf-8"))
    except (ValueError, TypeError, json.JSONDecodeError):
        return None

    if not isinstance(payload, dict) or not payload.get("sub") or not payload.get("role"):
        return None
    if int(payload.get("exp", 0)) < int(time.time()):
        return None
    return payload


# ==============================================================================
# FASTAPI DEPENDENCIES
# ==============================================================================
def _unauthorized(detail: str = "Sesi tidak valid atau kedaluwarsa.") -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )


def get_current_user(authorization: Optional[str] = Header(default=None)) -> Dict[str, Any]:
    """Dependency: wajib token Bearer yang valid."""
    if not authorization or not authorization.lower().startswith("bearer "):
        raise _unauthorized("Token autentikasi tidak ditemukan.")
    payload = verify_token(authorization.split(" ", 1)[1].strip())
    if payload is None:
        raise _unauthorized()
    return payload


def require_role(*roles: str):
    """Factory dependency: batasi endpoint ke role tertentu."""
    from fastapi import Depends  # local import menjaga modul ringan

    def _dependency(user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
        if user.get("role") not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Akses ditolak untuk peran ini.",
            )
        return user

    return _dependency


require_dosen = require_role("dosen")
require_mahasiswa = require_role("mahasiswa")
require_authenticated = get_current_user
