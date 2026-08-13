"""Teste unitario direto do modulo local_api (import via sys.path, como
o proprio script faz consigo mesmo ao rodar `python server/local_api.py`).
Nao sobe servidor nem toca no banco real."""
from __future__ import annotations

import sqlite3
import sys
from pathlib import Path

import pytest

SERVER_DIR = Path(__file__).resolve().parent
if str(SERVER_DIR) not in sys.path:
    sys.path.insert(0, str(SERVER_DIR))

import local_api  # noqa: E402 - precisa vir depois do sys.path.insert


def test_db_connection_closes_on_exit(tmp_path, monkeypatch):
    monkeypatch.setattr(local_api, "DB_PATH", tmp_path / "unit-test.sqlite")
    with local_api.db_connection() as conn:
        conn.execute("CREATE TABLE IF NOT EXISTS t (id TEXT)")
    with pytest.raises(sqlite3.ProgrammingError):
        conn.execute("SELECT 1")


def test_db_connection_closes_even_on_error(tmp_path, monkeypatch):
    monkeypatch.setattr(local_api, "DB_PATH", tmp_path / "unit-test-error.sqlite")
    conn_ref = {}
    with pytest.raises(ValueError):
        with local_api.db_connection() as conn:
            conn_ref["conn"] = conn
            raise ValueError("erro de teste")
    with pytest.raises(sqlite3.ProgrammingError):
        conn_ref["conn"].execute("SELECT 1")
