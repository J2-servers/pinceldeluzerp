"""Teste unitario do modulo auth (import via sys.path, como os demais testes
de servidor). Verifica o PBKDF2 compativel com o frontend e os utilitarios de
sessao. Nao sobe servidor nem toca no banco real."""
from __future__ import annotations

import sys
from pathlib import Path

SERVER_DIR = Path(__file__).resolve().parent
if str(SERVER_DIR) not in sys.path:
    sys.path.insert(0, str(SERVER_DIR))

from auth import constant_time_eq, generate_session_token, hash_password, verify_password  # noqa: E402 - precisa vir depois do sys.path.insert


def test_hash_then_verify_roundtrip():
    stored = hash_password("uma-senha-boa")
    assert verify_password("uma-senha-boa", stored) is True


def test_wrong_password_fails():
    stored = hash_password("uma-senha-boa")
    assert verify_password("senha-errada", stored) is False


def test_hash_format_has_four_parts():
    stored = hash_password("x")
    parts = stored.split("$")
    assert len(parts) == 4
    assert parts[0] == "pbkdf2"
    assert parts[1] == "150000"


def test_verify_rejects_malformed_hash():
    assert verify_password("qualquer", "nao-e-um-hash-valido") is False
    assert verify_password("qualquer", None) is False
    assert verify_password("qualquer", "") is False


def test_two_hashes_of_same_password_differ_by_salt():
    a = hash_password("repetida")
    b = hash_password("repetida")
    assert a != b
    assert verify_password("repetida", a) is True
    assert verify_password("repetida", b) is True


def test_session_tokens_are_unique_and_reasonably_long():
    tokens = {generate_session_token() for _ in range(20)}
    assert len(tokens) == 20
    assert all(len(token) >= 32 for token in tokens)


def test_constant_time_eq():
    assert constant_time_eq("abc", "abc") is True
    assert constant_time_eq("abc", "abd") is False
    assert constant_time_eq("", "") is True
