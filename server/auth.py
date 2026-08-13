"""Hash de senha (PBKDF2-SHA256) e tokens de sessao para a API local.

Formato do hash e identico ao gerado antes no navegador por
src/lib/auth/crypto.js (`pbkdf2$<iter>$<saltB64>$<hashB64>`, base64 padrao),
entao senhas existentes continuam validas.
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import secrets

ITERATIONS = 150_000
KEY_LEN = 32
HASH_NAME = "sha256"


def hash_password(password: str, iterations: int = ITERATIONS) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac(HASH_NAME, password.encode("utf-8"), salt, iterations, dklen=KEY_LEN)
    salt_b64 = base64.b64encode(salt).decode("ascii")
    digest_b64 = base64.b64encode(digest).decode("ascii")
    return f"pbkdf2${iterations}${salt_b64}${digest_b64}"


def verify_password(password: str, stored: str | None) -> bool:
    if not stored or not isinstance(stored, str):
        return False
    parts = stored.split("$")
    if len(parts) != 4 or parts[0] != "pbkdf2":
        return False
    try:
        iterations = int(parts[1])
        salt = base64.b64decode(parts[2])
        expected = base64.b64decode(parts[3])
    except (ValueError, TypeError):
        return False
    if iterations <= 0:
        return False
    actual = hashlib.pbkdf2_hmac(HASH_NAME, password.encode("utf-8"), salt, iterations, dklen=len(expected) or KEY_LEN)
    return hmac.compare_digest(actual, expected)


def generate_session_token() -> str:
    return secrets.token_urlsafe(32)


def constant_time_eq(a: str, b: str) -> bool:
    return hmac.compare_digest(str(a or "").encode("utf-8"), str(b or "").encode("utf-8"))
