import os
import sys
from urllib.parse import parse_qsl, urlencode

# Backend package root (backend/app/...) on sys.path.
_BACKEND = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
if _BACKEND not in sys.path:
    sys.path.insert(0, _BACKEND)

# Vercel filesystem: only /tmp is writable, so SQLite lives there.
os.environ.setdefault("DB_PATH", "/tmp/attendance.db")
os.environ.setdefault("DATABASE_URL", "")

from app.main import app as fastapi_app  # noqa: E402


async def app(scope, receive, send):
    """ASGI wrapper restoring the original request path stripped by the Vercel rewrite."""
    if scope["type"] == "http":
        pairs = parse_qsl(scope.get("query_string", b"").decode("latin-1"), keep_blank_values=True)
        original_path = None
        kept = []
        for key, value in pairs:
            if key == "_orig_path":
                original_path = value
            else:
                kept.append((key, value))
        if original_path:
            scope = dict(scope)
            scope["path"] = original_path
            scope["raw_path"] = original_path.encode()
            scope["query_string"] = urlencode(kept).encode()
    await fastapi_app(scope, receive, send)
