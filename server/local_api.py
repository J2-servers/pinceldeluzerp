from __future__ import annotations

import base64
import hashlib
import ipaddress
import json
import math
import mimetypes
import os
import re
import shutil
import socket
import sqlite3
import sys
import threading
import time
import traceback
import urllib.error
import urllib.parse
import urllib.request
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any

import auth

ROOT = Path(__file__).resolve().parents[1]
DB_PATH = Path(os.environ.get("PINCEL_LUZ_DB", ROOT / "database" / "pincel-luz-erp.sqlite"))
UPLOAD_DIR = Path(os.environ.get("PINCEL_LUZ_UPLOAD_DIR", ROOT / "storage" / "uploads"))
BACKUP_DIR = Path(os.environ.get("PINCEL_LUZ_BACKUP_DIR", ROOT / "storage" / "backups"))
HOST = os.environ.get("PINCEL_LUZ_API_HOST", "127.0.0.1")
PORT = int(os.environ.get("PINCEL_LUZ_API_PORT", "8787"))
ADMIN_PASSWORD = os.environ.get("PINCEL_LUZ_ADMIN_PASSWORD", "troque-esta-senha")
API_TOKEN = os.environ.get("PINCEL_LUZ_API_TOKEN", "")
DEFAULT_ALLOWED_ORIGINS = "http://127.0.0.1:5173,http://localhost:5173,http://127.0.0.1:8080,http://localhost:8080"
# Entidades usadas pelo frontend que nao tem arquivo em erp-schema/entities/
# (criadas dinamicamente em runtime: AuditLog interno, config/perfis de
# precificacao e o log de mensagens do WhatsApp).
EXTRA_ENTITIES_WITHOUT_SCHEMA = {
    "LaborRateProfile", "PartnerContribution", "PartnerEquity",
    "PricingSettings", "ServicePricingProfile", "WhatsAppMessageLog",
}


def load_known_entities() -> set[str]:
    schema_dir = ROOT / "erp-schema" / "entities"
    from_schema = {path.stem for path in schema_dir.glob("*.jsonc")} if schema_dir.exists() else set()
    return from_schema | EXTRA_ENTITIES_WITHOUT_SCHEMA


KNOWN_ENTITIES = load_known_entities()


def assert_known_entity(entity_name: str) -> None:
    if entity_name not in KNOWN_ENTITIES:
        raise ValueError(f"Entidade desconhecida: {entity_name}")

ALLOWED_ORIGINS_RAW = os.environ.get("PINCEL_LUZ_ALLOWED_ORIGINS", "").strip() or DEFAULT_ALLOWED_ORIGINS
ALLOWED_ORIGINS = {
    origin.strip()
    for origin in ALLOWED_ORIGINS_RAW.split(",")
    if origin.strip()
}

ALLOWED_UPLOAD_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg", ".ico", ".pdf"}
MAX_UPLOAD_BYTES = 15 * 1024 * 1024  # 15MB
BACKUP_INTERVAL_SECONDS = int(os.environ.get("PINCEL_LUZ_BACKUP_INTERVAL_SECONDS", str(24 * 60 * 60)))
BACKUP_RETENTION_COUNT = int(os.environ.get("PINCEL_LUZ_BACKUP_RETENTION_COUNT", "14"))
BACKUP_SCHEDULER_CHECK_SECONDS = int(os.environ.get("PINCEL_LUZ_BACKUP_CHECK_SECONDS", str(60 * 60)))
SCHEDULED_BACKUP_REASON = "scheduled-daily"
SESSION_TTL_SECONDS = 12 * 60 * 60  # 12h, mesmo valor usado antes no client
AUTH_EXEMPT_PATHS = {
    "/api/local/health",
    "/api/local/auth/status",
    "/api/local/auth/bootstrap",
    "/api/local/auth/login",
}


class ForbiddenError(Exception):
    """Acao nao permitida dado o estado atual (mapeia para HTTP 403)."""


def status_for_error(error: Exception) -> int:
    if isinstance(error, ForbiddenError):
        return 403
    if isinstance(error, PermissionError):
        return 401
    if isinstance(error, ValueError):
        return 400
    return 500

SYSTEM_FIELDS = {
    "id": "string",
    "created_date": "string",
    "updated_date": "string",
    "created_by_id": "string",
    "created_by": "string",
    "updated_by": "string",
    "is_sample": "boolean",
}


def q(identifier: str) -> str:
    return '"' + identifier.replace('"', '""') + '"'


def safe_name(name: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9_]", "_", str(name))
    if not cleaned or cleaned[0].isdigit():
        cleaned = f"_{cleaned}"
    return cleaned


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def infer_json_type(value: Any) -> str:
    if isinstance(value, bool):
        return "boolean"
    if isinstance(value, int) and not isinstance(value, bool):
        return "integer"
    if isinstance(value, float):
        return "number"
    if isinstance(value, list):
        return "array"
    if isinstance(value, dict):
        return "object"
    return "string"


def sqlite_type(json_type: str) -> str:
    return {
        "integer": "INTEGER",
        "number": "REAL",
        "boolean": "INTEGER",
        "array": "TEXT",
        "object": "TEXT",
    }.get(json_type, "TEXT")


def to_db_value(value: Any) -> Any:
    if isinstance(value, bool):
        return 1 if value else 0
    if isinstance(value, (dict, list)):
        return json.dumps(value, ensure_ascii=False)
    return value


def from_db_value(value: Any, json_type: str) -> Any:
    if value is None:
        return None
    if json_type == "boolean":
        return bool(value)
    if json_type in {"array", "object"} and isinstance(value, str):
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            return [] if json_type == "array" else {}
    return value


def _contains_ci(haystack: Any, needle: Any) -> int:
    """Funcao SQL customizada: substring case-insensitive com dobra de
    maiusculas/minusculas Unicode (SQLite LIKE so cobre ASCII)."""
    return 1 if str(needle or "").lower() in str(haystack or "").lower() else 0


def connect() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys=ON")
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=5000")
    conn.create_function("contains_ci", 2, _contains_ci)
    ensure_metadata(conn)
    return conn


@contextmanager
def db_connection():
    """Como `with connect() as conn:`, mas fecha a conexao ao sair
    (o context manager nativo do sqlite3 so faz commit/rollback)."""
    conn = connect()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def ensure_metadata(conn: sqlite3.Connection) -> None:
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS _meta_tables (
          table_name TEXT PRIMARY KEY,
          source_schema TEXT,
          source_data TEXT,
          records_count INTEGER,
          imported_count INTEGER,
          generated_at TEXT
        )
        """
    )
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS _schema_columns (
          table_name TEXT,
          column_name TEXT,
          original_name TEXT,
          json_type TEXT,
          sqlite_type TEXT,
          description TEXT,
          PRIMARY KEY (table_name, column_name)
        )
        """
    )
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS _sessions (
          token TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          created_at TEXT NOT NULL,
          expires_at TEXT NOT NULL
        )
        """
    )
    try:
        user_table = conn.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?", ("User",)).fetchone()
        if user_table:
            columns = {row["name"] for row in conn.execute('PRAGMA table_info("User")').fetchall()}
            if "email" in columns:
                conn.execute('CREATE UNIQUE INDEX IF NOT EXISTS "ux_user_email" ON "User"("email")')
    except sqlite3.Error as error:
        # Best-effort: se ja existem e-mails duplicados num banco antigo, nao trava o boot.
        print(f"Aviso: nao foi possivel garantir indice unico em User.email: {error}", file=sys.stderr)


def create_session(conn: sqlite3.Connection, user_id: str) -> dict[str, Any]:
    token = auth.generate_session_token()
    created_at = now_iso()
    expires_at = (datetime.now(timezone.utc) + timedelta(seconds=SESSION_TTL_SECONDS)).isoformat()
    conn.execute(
        "INSERT INTO _sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
        (token, user_id, created_at, expires_at),
    )
    return {"token": token, "expires_at": expires_at}


def delete_session(conn: sqlite3.Connection, token: str) -> None:
    if token:
        conn.execute("DELETE FROM _sessions WHERE token=?", (token,))


def validate_session(conn: sqlite3.Connection, token: str) -> dict[str, Any] | None:
    if not token:
        return None
    row = conn.execute("SELECT user_id, expires_at FROM _sessions WHERE token=?", (token,)).fetchone()
    if not row:
        return None
    if row["expires_at"] < now_iso():
        conn.execute("DELETE FROM _sessions WHERE token=?", (token,))
        conn.commit()
        return None
    user = fetch_one_by_id(conn, "User", row["user_id"])
    if not user or user.get("active") is False:
        return None
    return user


def sanitize_user(row: dict[str, Any] | None) -> dict[str, Any] | None:
    if not row:
        return None
    clean = dict(row)
    clean.pop("password_hash", None)
    return clean


def prepare_user_payload(payload: dict[str, Any], require_password: bool) -> dict[str, Any]:
    clean = dict(payload)
    clean.pop("password_hash", None)  # nunca aceito em texto/hash direto do cliente
    password = clean.pop("password", None)
    if password:
        if len(str(password)) < 6:
            raise ValueError("A senha precisa ter ao menos 6 caracteres.")
        clean["password_hash"] = auth.hash_password(str(password))
    elif require_password:
        raise ValueError("Informe uma senha.")
    if clean.get("email"):
        clean["email"] = str(clean["email"]).strip().lower()
    return clean


def table_exists(conn: sqlite3.Connection, table_name: str) -> bool:
    row = conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
        (table_name,),
    ).fetchone()
    return bool(row)


def load_column_map(conn: sqlite3.Connection, entity_name: str) -> dict[str, dict[str, str]]:
    rows = conn.execute(
        "SELECT column_name, original_name, json_type, sqlite_type FROM _schema_columns WHERE table_name=?",
        (entity_name,),
    ).fetchall()
    return {
        row["original_name"]: {
            "column": row["column_name"],
            "json_type": row["json_type"] or "string",
            "sqlite_type": row["sqlite_type"] or "TEXT",
        }
        for row in rows
    }


def ensure_entity_table(conn: sqlite3.Connection, entity_name: str, sample: dict[str, Any] | None = None) -> None:
    fields = dict(SYSTEM_FIELDS)
    for key, value in (sample or {}).items():
        fields.setdefault(key, infer_json_type(value))

    if not table_exists(conn, entity_name):
        columns = []
        for field, json_type in fields.items():
            col = safe_name(field)
            if field == "id":
                columns.append(f"{q(col)} TEXT PRIMARY KEY")
            else:
                columns.append(f"{q(col)} {sqlite_type(json_type)}")
        conn.execute(f"CREATE TABLE IF NOT EXISTS {q(entity_name)} ({', '.join(columns)})")

    existing = {row["name"] for row in conn.execute(f"PRAGMA table_info({q(entity_name)})").fetchall()}
    for field, json_type in fields.items():
        column = safe_name(field)
        if column not in existing:
            conn.execute(f"ALTER TABLE {q(entity_name)} ADD COLUMN {q(column)} {sqlite_type(json_type)}")
        conn.execute(
            """
            INSERT OR REPLACE INTO _schema_columns
            (table_name, column_name, original_name, json_type, sqlite_type, description)
            VALUES (?, ?, ?, ?, ?, '')
            """,
            (entity_name, column, field, json_type, sqlite_type(json_type)),
        )
    conn.execute(
        """
        INSERT OR IGNORE INTO _meta_tables
        (table_name, source_schema, source_data, records_count, imported_count, generated_at)
        VALUES (?, '', '', 0, 0, ?)
        """,
        (entity_name, now_iso()),
    )


def ensure_payload_columns(conn: sqlite3.Connection, entity_name: str, payload: dict[str, Any]) -> dict[str, dict[str, str]]:
    ensure_entity_table(conn, entity_name, payload)
    column_map = load_column_map(conn, entity_name)
    existing = {row["name"] for row in conn.execute(f"PRAGMA table_info({q(entity_name)})").fetchall()}
    for field, value in payload.items():
        if field in column_map:
            continue
        column = safe_name(field)
        json_type = infer_json_type(value)
        if column not in existing:
            conn.execute(f"ALTER TABLE {q(entity_name)} ADD COLUMN {q(column)} {sqlite_type(json_type)}")
        conn.execute(
            """
            INSERT OR REPLACE INTO _schema_columns
            (table_name, column_name, original_name, json_type, sqlite_type, description)
            VALUES (?, ?, ?, ?, ?, '')
            """,
            (entity_name, column, field, json_type, sqlite_type(json_type)),
        )
    return load_column_map(conn, entity_name)


def row_to_dict(row: sqlite3.Row, column_map: dict[str, dict[str, str]]) -> dict[str, Any]:
    by_column = {info["column"]: (field, info["json_type"]) for field, info in column_map.items()}
    result: dict[str, Any] = {}
    for column in row.keys():
        field, json_type = by_column.get(column, (column, "string"))
        result[field] = from_db_value(row[column], json_type)
    return result


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def sqlite_integrity(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {"ok": False, "message": "Arquivo nao encontrado", "tables": 0, "rows": {}}
    try:
        conn = sqlite3.connect(path)
        try:
            result = conn.execute("PRAGMA integrity_check").fetchone()
            message = result[0] if result else "sem resposta"
            tables = conn.execute("SELECT COUNT(*) FROM sqlite_master WHERE type='table'").fetchone()[0]
            rows: dict[str, int | None] = {}
            for row in conn.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"):
                table_name = row[0]
                try:
                    rows[table_name] = conn.execute(f"SELECT COUNT(*) FROM {q(table_name)}").fetchone()[0]
                except sqlite3.Error:
                    rows[table_name] = None
            return {"ok": message == "ok", "message": message, "tables": tables, "rows": rows}
        finally:
            conn.close()
    except sqlite3.Error as error:
        return {"ok": False, "message": str(error), "tables": 0, "rows": {}}


def audit_system_event(action: str, entity_name: str, entity_id: str, metadata: dict[str, Any] | None = None) -> None:
    try:
        timestamp = now_iso()
        payload = {
            "id": f"AuditLog_{int(time.time() * 1000)}_{os.urandom(3).hex()}",
            "created_date": timestamp,
            "updated_date": timestamp,
            "module": "system",
            "entity_name": entity_name,
            "entity_id": entity_id,
            "action": action,
            "user_email": "local@pinceldeluz.local",
            "document_number": entity_id,
            "metadata": json.dumps(metadata or {}, ensure_ascii=False),
        }
        with db_connection() as conn:
            column_map = ensure_payload_columns(conn, "AuditLog", payload)
            fields = [field for field in payload if field in column_map]
            columns = [column_map[field]["column"] for field in fields]
            placeholders = ", ".join("?" for _ in columns)
            conn.execute(
                f"INSERT OR REPLACE INTO {q('AuditLog')} ({', '.join(q(column) for column in columns)}) VALUES ({placeholders})",
                [to_db_value(payload[field]) for field in fields],
            )
            conn.commit()
    except Exception as error:
        print(f"Falha ao auditar evento {action}: {error}", file=sys.stderr)


def backup_manifest(path: Path) -> dict[str, Any]:
    sidecar = path.with_suffix(path.suffix + ".json")
    sidecar_data: dict[str, Any] = {}
    if sidecar.exists():
        try:
            sidecar_data = json.loads(sidecar.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            sidecar_data = {}
    stat = path.stat()
    integrity = sqlite_integrity(path)
    return {
        "file_name": path.name,
        "size_bytes": stat.st_size,
        "created_at": datetime.fromtimestamp(stat.st_mtime, timezone.utc).isoformat(),
        "sha256": sidecar_data.get("sha256") or sha256_file(path),
        "integrity_ok": integrity["ok"],
        "integrity_message": integrity["message"],
        "table_count": integrity.get("tables", 0),
        "row_count": sum(value for value in integrity.get("rows", {}).values() if isinstance(value, int)),
        "reason": sidecar_data.get("reason", ""),
        "download_url": "",
    }


def list_sqlite_backups() -> list[dict[str, Any]]:
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    backups = [backup_manifest(path) for path in BACKUP_DIR.glob("*.sqlite") if path.is_file()]
    backups.sort(key=lambda item: item["created_at"], reverse=True)
    return backups


def create_sqlite_backup(reason: str = "manual") -> dict[str, Any]:
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    if not DB_PATH.exists():
        raise RuntimeError(f"Banco nao encontrado em {DB_PATH}")
    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    target = BACKUP_DIR / f"pincel-luz-erp-{timestamp}.sqlite"
    source = sqlite3.connect(DB_PATH)
    try:
        source.execute("PRAGMA wal_checkpoint(FULL)")
        destination = sqlite3.connect(target)
        try:
            source.backup(destination)
        finally:
            destination.close()
    finally:
        source.close()
    integrity = sqlite_integrity(target)
    if not integrity["ok"]:
        target.unlink(missing_ok=True)
        raise RuntimeError(f"Backup criado, mas falhou na integridade: {integrity['message']}")
    manifest = {
        "created_at": now_iso(),
        "source": str(DB_PATH),
        "file_name": target.name,
        "reason": reason or "manual",
        "sha256": sha256_file(target),
        "integrity": integrity,
    }
    target.with_suffix(target.suffix + ".json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    result = backup_manifest(target)
    audit_system_event("backup_create", "SQLiteBackup", target.name, result)
    return result


def prune_scheduled_backups(keep: int = BACKUP_RETENTION_COUNT) -> None:
    """Apaga backups agendados antigos alem dos `keep` mais recentes.
    Nunca mexe em backups manuais ou de seguranca pre-restauracao."""
    scheduled: list[Path] = []
    for path in BACKUP_DIR.glob("*.sqlite"):
        sidecar = path.with_suffix(path.suffix + ".json")
        if not sidecar.exists():
            continue
        try:
            manifest = json.loads(sidecar.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            continue
        if str(manifest.get("reason", "")) == SCHEDULED_BACKUP_REASON:
            scheduled.append(path)
    scheduled.sort(key=lambda item: item.stat().st_mtime, reverse=True)
    for stale in scheduled[keep:]:
        stale.unlink(missing_ok=True)
        stale.with_suffix(stale.suffix + ".json").unlink(missing_ok=True)


def run_backup_scheduler() -> None:
    """Thread daemon: garante um backup por dia (retendo os ultimos
    BACKUP_RETENTION_COUNT agendados), sem depender de ninguem clicar em nada."""
    while True:
        try:
            if DB_PATH.exists():
                backups = list_sqlite_backups()
                newest_at = datetime.fromisoformat(backups[0]["created_at"]) if backups else None
                due = newest_at is None or (datetime.now(timezone.utc) - newest_at) >= timedelta(seconds=BACKUP_INTERVAL_SECONDS)
                if due:
                    create_sqlite_backup(SCHEDULED_BACKUP_REASON)
                    prune_scheduled_backups()
        except Exception as error:  # nunca deve derrubar a thread nem o servidor
            print(f"Aviso: backup agendado falhou: {error}", file=sys.stderr)
        time.sleep(BACKUP_SCHEDULER_CHECK_SECONDS)


def resolve_backup_file(file_name: str) -> Path:
    candidate = (BACKUP_DIR / Path(file_name).name).resolve()
    root = BACKUP_DIR.resolve()
    if not str(candidate).startswith(str(root)) or candidate.suffix != ".sqlite" or not candidate.exists():
        raise RuntimeError("Backup nao encontrado ou invalido")
    return candidate


def restore_sqlite_backup(file_name: str, password: str) -> dict[str, Any]:
    if not auth.constant_time_eq(password, ADMIN_PASSWORD):
        raise RuntimeError("Senha administrativa invalida")
    source = resolve_backup_file(file_name)
    integrity = sqlite_integrity(source)
    if not integrity["ok"]:
        raise RuntimeError(f"Backup reprovado na verificacao de integridade: {integrity['message']}")
    safety_backup = create_sqlite_backup(f"pre-restore-{source.name}")
    shutil.copy2(source, DB_PATH)
    restored_integrity = sqlite_integrity(DB_PATH)
    if not restored_integrity["ok"]:
        shutil.copy2(BACKUP_DIR / safety_backup["file_name"], DB_PATH)
        raise RuntimeError(f"Restauracao falhou e o banco anterior foi recolocado: {restored_integrity['message']}")
    result = {
        "restored_from": source.name,
        "restored_sha256": sha256_file(DB_PATH),
        "safety_backup": safety_backup,
        "integrity": restored_integrity,
    }
    audit_system_event("backup_restore", "SQLiteBackup", source.name, result)
    return result


def download_sqlite_backup(file_name: str, password: str) -> dict[str, Any]:
    if not auth.constant_time_eq(password, ADMIN_PASSWORD):
        raise RuntimeError("Senha administrativa invalida")
    source = resolve_backup_file(file_name)
    integrity = sqlite_integrity(source)
    if not integrity["ok"]:
        raise RuntimeError(f"Backup reprovado na verificacao de integridade: {integrity['message']}")
    audit_system_event("backup_download", "SQLiteBackup", source.name, {"sha256": sha256_file(source)})
    return {
        "file_name": source.name,
        "mime_type": "application/x-sqlite3",
        "base64": base64.b64encode(source.read_bytes()).decode("ascii"),
        "sha256": sha256_file(source),
    }


def fetch_all(conn: sqlite3.Connection, table_name: str) -> list[dict[str, Any]]:
    if not table_exists(conn, table_name):
        return []
    column_map = load_column_map(conn, table_name)
    rows = conn.execute(f"SELECT * FROM {q(table_name)}").fetchall()
    return [row_to_dict(row, column_map) for row in rows]


def fetch_one_by_id(conn: sqlite3.Connection, table_name: str, record_id: str) -> dict[str, Any] | None:
    if not table_exists(conn, table_name):
        return None
    column_map = load_column_map(conn, table_name)
    row = conn.execute(f"SELECT * FROM {q(table_name)} WHERE id=?", (record_id,)).fetchone()
    return row_to_dict(row, column_map) if row else None


def insert_local_record(conn: sqlite3.Connection, entity_name: str, payload: dict[str, Any]) -> dict[str, Any]:
    timestamp = now_iso()
    record = dict(payload)
    record.setdefault("id", f"{entity_name}_{int(time.time() * 1000)}_{os.urandom(3).hex()}")
    record.setdefault("created_date", timestamp)
    record["updated_date"] = timestamp
    column_map = ensure_payload_columns(conn, entity_name, record)
    fields = [field for field in record if field in column_map]
    columns = [column_map[field]["column"] for field in fields]
    placeholders = ", ".join("?" for _ in columns)
    conn.execute(
        f"INSERT OR REPLACE INTO {q(entity_name)} ({', '.join(q(column) for column in columns)}) VALUES ({placeholders})",
        [to_db_value(record[field]) for field in fields],
    )
    return record


def update_local_record(conn: sqlite3.Connection, entity_name: str, record_id: str, payload: dict[str, Any]) -> dict[str, Any] | None:
    if not table_exists(conn, entity_name):
        return None
    record = dict(payload)
    record["updated_date"] = now_iso()
    column_map = ensure_payload_columns(conn, entity_name, record)
    fields = [field for field in record if field != "id" and field in column_map]
    if fields:
        assignments = ", ".join(f"{q(column_map[field]['column'])}=?" for field in fields)
        values = [to_db_value(record[field]) for field in fields]
        values.append(record_id)
        conn.execute(f"UPDATE {q(entity_name)} SET {assignments} WHERE id=?", values)
    return fetch_one_by_id(conn, entity_name, record_id)


def money_value(value: Any) -> float:
    try:
        return round(float(value or 0), 2)
    except (TypeError, ValueError):
        return 0.0


# ── Estoque: ajuste atomico com custo medio ponderado ────────────
# Substitui o read-modify-write que o frontend fazia em JS (ler Product.quantity,
# calcular e dar PATCH), que permitia dois usuarios venderem alem do estoque.

STOCK_MOVEMENT_TYPES = {"entrada", "saida", "ajuste", "devolucao", "estorno"}
STOCK_MOVEMENT_REASON_REQUIRED = {"ajuste", "devolucao"}
STOCK_BULK_MAX_ITEMS = 50


def require_stock_number(value: Any, field_name: str) -> float:
    """Converte um campo numerico obrigatorio, rejeitando ausencia e lixo."""
    if value is None or isinstance(value, bool):
        raise ValueError(f"Campo {field_name} e obrigatorio e precisa ser numerico.")
    try:
        number = float(value)
    except (TypeError, ValueError) as error:
        raise ValueError(f"Campo {field_name} precisa ser numerico.") from error
    if not math.isfinite(number):
        raise ValueError(f"Campo {field_name} precisa ser um numero finito.")
    return number


def parse_stock_unit_cost(value: Any, field_name: str = "unit_cost") -> float | None:
    if value is None or value == "":
        return None
    cost = require_stock_number(value, field_name)
    if cost < 0:
        raise ValueError(f"Campo {field_name} nao pode ser negativo.")
    return cost


def format_stock_quantity(value: float) -> str:
    """10.0 -> '10', 1.25 -> '1.25' (mensagens de erro mais legiveis)."""
    number = round(float(value), 4)
    return str(int(number)) if number == int(number) else str(number)


def parse_stock_movement_context(payload: dict[str, Any]) -> dict[str, str]:
    """Valida movement_type/reason e resolve os campos comuns do movimento."""
    movement_type = str(payload.get("movement_type") or "").strip().lower()
    if movement_type not in STOCK_MOVEMENT_TYPES:
        allowed = ", ".join(sorted(STOCK_MOVEMENT_TYPES))
        raise ValueError(f"movement_type invalido. Use um destes: {allowed}.")
    reason = str(payload.get("reason") or "").strip()
    if movement_type in STOCK_MOVEMENT_REASON_REQUIRED and not reason:
        raise ValueError(f"Informe o motivo (reason) para movimentos do tipo {movement_type}.")
    return {
        "movement_type": movement_type,
        "reason": reason,
        "reference_id": str(payload.get("reference_id") or "").strip(),
        "user_name": str(payload.get("user_name") or "").strip(),
        "date": str(payload.get("date") or "").strip() or datetime.now().strftime("%Y-%m-%d"),
    }


def plan_stock_adjustment(
    conn: sqlite3.Connection,
    product_id: str,
    delta: float,
    unit_cost: float | None,
    movement_type: str,
    name_in_errors: bool = False,
) -> dict[str, Any]:
    """Le o produto e calcula quantidade/custo resultantes, sem gravar nada.

    Levanta ValueError quando o produto nao existe ou o saldo ficaria negativo.
    Entradas com unit_cost recalculam o custo medio ponderado:
    (qtd_atual * custo_atual + delta * unit_cost) / (qtd_atual + delta),
    assumindo unit_cost como novo custo quando o saldo atual e zero/negativo."""
    row = conn.execute(f'SELECT * FROM {q("Product")} WHERE id=?', (product_id,)).fetchone()
    if not row:
        raise ValueError(f"Produto nao encontrado: {product_id}." if name_in_errors else "Produto nao encontrado.")
    product = row_to_dict(row, load_column_map(conn, "Product"))
    current_quantity = float(product.get("quantity") or 0)
    current_cost = float(product.get("cost_price") or 0)
    new_quantity = current_quantity + delta
    if new_quantity < 0:
        available = format_stock_quantity(current_quantity)
        requested = format_stock_quantity(abs(delta))
        if name_in_errors:
            raise ValueError(f"Estoque insuficiente para {product.get('name') or product_id}: disponivel {available}, solicitado {requested}.")
        raise ValueError(f"Estoque insuficiente: disponivel {available}, solicitado {requested}.")
    new_cost = current_cost
    cost_changed = False
    if movement_type == "entrada" and unit_cost is not None and unit_cost > 0 and delta > 0:
        if current_quantity <= 0:
            new_cost = round(unit_cost, 4)
        else:
            new_cost = round((current_quantity * current_cost + delta * unit_cost) / (current_quantity + delta), 4)
        cost_changed = True
    return {
        "product": product,
        "delta": delta,
        "unit_cost": unit_cost,
        "previous_quantity": current_quantity,
        "new_quantity": new_quantity,
        "previous_cost": current_cost,
        "new_cost": new_cost,
        "cost_changed": cost_changed,
    }


def apply_stock_adjustment(conn: sqlite3.Connection, plan: dict[str, Any], context: dict[str, str]) -> tuple[dict[str, Any], dict[str, Any]]:
    """Grava o novo saldo (e custo, quando recalculado) e insere o StockMovement
    correspondente. Precisa rodar dentro da mesma transacao do plano."""
    product = plan["product"]
    timestamp = now_iso()
    if plan["cost_changed"]:
        conn.execute(
            f'UPDATE {q("Product")} SET "quantity"=?, "cost_price"=?, "updated_date"=? WHERE "id"=?',
            (plan["new_quantity"], plan["new_cost"], timestamp, product["id"]),
        )
    else:
        conn.execute(
            f'UPDATE {q("Product")} SET "quantity"=?, "updated_date"=? WHERE "id"=?',
            (plan["new_quantity"], timestamp, product["id"]),
        )
    movement_payload: dict[str, Any] = {
        "product_id": product["id"],
        "product_name": product.get("name") or "",
        "type": context["movement_type"],
        "quantity": abs(plan["delta"]),
        "reason": context["reason"],
        "date": context["date"],
        "previous_quantity": plan["previous_quantity"],
        "new_quantity": plan["new_quantity"],
        "previous_cost": plan["previous_cost"],
        "reference_id": context["reference_id"],
        "user_name": context["user_name"],
    }
    if plan["unit_cost"] is not None:
        movement_payload["unit_cost"] = plan["unit_cost"]
    if plan["cost_changed"]:
        movement_payload["new_cost"] = plan["new_cost"]
    movement = insert_local_record(conn, "StockMovement", movement_payload)
    product_summary = {
        "id": product["id"],
        "name": product.get("name") or "",
        "quantity": plan["new_quantity"],
        "cost_price": plan["new_cost"] if plan["cost_changed"] else plan["previous_cost"],
    }
    return product_summary, movement


def adjust_stock(payload: dict[str, Any]) -> dict[str, Any]:
    """Ajuste atomico de estoque de um produto.

    Toda a sequencia ler-validar-gravar roda numa unica transacao com lock de
    escrita (BEGIN IMMEDIATE), entao duas baixas simultaneas nunca vendem alem
    do saldo: a segunda espera o lock e revalida contra o saldo ja atualizado."""
    if not isinstance(payload, dict):
        raise ValueError("Payload precisa ser objeto JSON.")
    product_id = str(payload.get("product_id") or "").strip()
    if not product_id:
        raise ValueError("Campo product_id e obrigatorio.")
    delta = require_stock_number(payload.get("delta"), "delta")
    if delta == 0:
        raise ValueError("Campo delta precisa ser diferente de zero.")
    unit_cost = parse_stock_unit_cost(payload.get("unit_cost"))
    context = parse_stock_movement_context(payload)
    with db_connection() as conn:
        # BEGIN IMMEDIATE precisa ser o primeiro comando da conexao (antes de
        # qualquer DML que abriria transacao implicita) para ja segurar o lock
        # de escrita durante a leitura do saldo. O commit explicito abaixo
        # encerra a transacao; o commit do db_connection() vira no-op.
        conn.execute("BEGIN IMMEDIATE")
        try:
            ensure_payload_columns(conn, "Product", {"name": "", "quantity": 0.0, "cost_price": 0.0})
            plan = plan_stock_adjustment(conn, product_id, delta, unit_cost, context["movement_type"])
            product_summary, movement = apply_stock_adjustment(conn, plan, context)
            conn.commit()
        except Exception:
            conn.rollback()
            raise
    return {"product": product_summary, "movement": movement}


def adjust_stock_bulk(payload: dict[str, Any]) -> dict[str, Any]:
    """Versao em lote do adjust_stock: valida todos os itens e so entao aplica,
    tudo na mesma transacao — ou tudo entra, ou nada entra.

    Itens repetidos do mesmo produto tem os deltas somados (e o unit_cost
    combinado por media ponderada dos proprios itens) antes de validar/aplicar,
    gerando um unico StockMovement por produto."""
    if not isinstance(payload, dict):
        raise ValueError("Payload precisa ser objeto JSON.")
    raw_items = payload.get("items")
    if not isinstance(raw_items, list) or not raw_items:
        raise ValueError("Campo items precisa ser uma lista com ao menos 1 item.")
    if len(raw_items) > STOCK_BULK_MAX_ITEMS:
        raise ValueError(f"Campo items aceita no maximo {STOCK_BULK_MAX_ITEMS} itens por chamada.")
    context = parse_stock_movement_context(payload)
    merged: dict[str, dict[str, float]] = {}
    ordered_ids: list[str] = []
    for index, item in enumerate(raw_items, start=1):
        if not isinstance(item, dict):
            raise ValueError(f"Item {index} invalido: precisa ser um objeto.")
        product_id = str(item.get("product_id") or "").strip()
        if not product_id:
            raise ValueError(f"Item {index} sem product_id.")
        delta = require_stock_number(item.get("delta"), f"delta (item {index})")
        if delta == 0:
            raise ValueError(f"Item {index} com delta zero.")
        unit_cost = parse_stock_unit_cost(item.get("unit_cost"), f"unit_cost (item {index})")
        if product_id not in merged:
            merged[product_id] = {"delta": 0.0, "costed_quantity": 0.0, "costed_total": 0.0}
            ordered_ids.append(product_id)
        entry = merged[product_id]
        entry["delta"] += delta
        if unit_cost is not None and unit_cost > 0 and delta > 0:
            entry["costed_quantity"] += delta
            entry["costed_total"] += delta * unit_cost
    with db_connection() as conn:
        conn.execute("BEGIN IMMEDIATE")
        try:
            ensure_payload_columns(conn, "Product", {"name": "", "quantity": 0.0, "cost_price": 0.0})
            plans: list[dict[str, Any]] = []
            for product_id in ordered_ids:
                entry = merged[product_id]
                unit_cost = entry["costed_total"] / entry["costed_quantity"] if entry["costed_quantity"] > 0 else None
                plans.append(plan_stock_adjustment(conn, product_id, entry["delta"], unit_cost, context["movement_type"], name_in_errors=True))
            products: list[dict[str, Any]] = []
            movements: list[dict[str, Any]] = []
            for plan in plans:
                product_summary, movement = apply_stock_adjustment(conn, plan, context)
                products.append(product_summary)
                movements.append(movement)
            conn.commit()
        except Exception:
            conn.rollback()
            raise
    return {"products": products, "movements": movements}


def run_system_integrity_audit() -> dict[str, Any]:
    with db_connection() as conn:
        sales = fetch_all(conn, "SalesOrder")
        sales_items = fetch_all(conn, "SalesOrderItem")
        quotes = fetch_all(conn, "ProductQuote")
        quote_items = fetch_all(conn, "QuotationItem")
        service_orders = fetch_all(conn, "ServiceOrder")
        transactions = fetch_all(conn, "Transaction")
        products = fetch_all(conn, "Product")
        stock_movements = fetch_all(conn, "StockMovement")

    sales_by_id = {item.get("id"): item for item in sales}
    items_by_sale: dict[str, list[dict[str, Any]]] = {}
    for item in sales_items:
        items_by_sale.setdefault(item.get("sales_order_id") or "", []).append(item)
    service_by_sale: dict[str, list[dict[str, Any]]] = {}
    for item in service_orders:
        service_by_sale.setdefault(item.get("sales_order_id") or "", []).append(item)
    transactions_by_order: dict[str, list[dict[str, Any]]] = {}
    for item in transactions:
        transactions_by_order.setdefault(item.get("order_id") or "", []).append(item)
    quote_items_by_id: dict[str, list[dict[str, Any]]] = {}
    for item in quote_items:
        quote_items_by_id.setdefault(item.get("quotation_id") or "", []).append(item)
    product_ids = {item.get("id") for item in products}

    findings: list[dict[str, Any]] = []

    for order in sales:
        order_id = order.get("id") or ""
        if not order.get("client_name"):
            findings.append({"code": "SALE_NO_CLIENT", "severity": "critica", "entity": "SalesOrder", "entity_id": order_id, "message": f"Venda {order.get('order_number') or order_id} sem cliente.", "auto_fix": False})
        if not items_by_sale.get(order_id):
            findings.append({"code": "SALE_NO_ITEMS", "severity": "critica", "entity": "SalesOrder", "entity_id": order_id, "message": f"Venda {order.get('order_number') or order_id} sem itens detalhados.", "auto_fix": False})
        if order.get("status") == "em_producao" and not service_by_sale.get(order_id):
            findings.append({"code": "SALE_NO_SERVICE_ORDER", "severity": "alta", "entity": "SalesOrder", "entity_id": order_id, "message": f"Venda {order.get('order_number')} esta em producao, mas nao tem OS vinculada.", "auto_fix": True})
        should_have_transaction = order.get("payment_status") == "pago" or order.get("status") == "entregue"
        if should_have_transaction and money_value(order.get("total")) > 0 and not transactions_by_order.get(order_id):
            findings.append({"code": "SALE_NO_FINANCIAL_ENTRY", "severity": "critica", "entity": "SalesOrder", "entity_id": order_id, "message": f"Venda {order.get('order_number')} consta paga/entregue, mas nao tem entrada financeira.", "auto_fix": True})
        if service_by_sale.get(order_id) and len(service_by_sale[order_id]) > 1:
            findings.append({"code": "DUPLICATE_SERVICE_ORDER", "severity": "media", "entity": "SalesOrder", "entity_id": order_id, "message": f"Venda {order.get('order_number')} possui mais de uma OS vinculada.", "auto_fix": False})

    for item in sales_items:
        sale_id = item.get("sales_order_id")
        if sale_id and sale_id not in sales_by_id:
            findings.append({"code": "ORPHAN_SALE_ITEM", "severity": "alta", "entity": "SalesOrderItem", "entity_id": item.get("id"), "message": f"Item de venda {item.get('product_name') or item.get('id')} nao tem venda pai.", "auto_fix": False})

    for quote in quotes:
        quote_id = quote.get("id") or ""
        if not quote_items_by_id.get(quote_id):
            findings.append({"code": "QUOTE_NO_ITEMS", "severity": "alta", "entity": "ProductQuote", "entity_id": quote_id, "message": f"Orcamento {quote.get('quote_number') or quote_id} sem itens detalhados.", "auto_fix": True})
        if money_value(quote.get("final_price")) < money_value(quote.get("total_cost")):
            active_margin_risk = quote.get("status") in {"enviado", "aprovado"}
            findings.append({
                "code": "QUOTE_NEGATIVE_MARGIN",
                "severity": "critica" if active_margin_risk else "alta",
                "entity": "ProductQuote",
                "entity_id": quote_id,
                "message": f"Orcamento {quote.get('quote_number')} esta abaixo do custo." + (" Foi retirado do fluxo ativo para revisao." if active_margin_risk else ""),
                "auto_fix": active_margin_risk,
            })

    for product in products:
        if money_value(product.get("quantity")) < 0:
            findings.append({"code": "NEGATIVE_STOCK", "severity": "critica", "entity": "Product", "entity_id": product.get("id"), "message": f"Produto {product.get('name')} esta com estoque negativo.", "auto_fix": False})

    for movement in stock_movements:
        product_id = movement.get("product_id")
        if product_id and product_id not in product_ids:
            findings.append({"code": "STOCK_MOVEMENT_NO_PRODUCT", "severity": "alta", "entity": "StockMovement", "entity_id": movement.get("id"), "message": f"Movimento de estoque {movement.get('id')} aponta para produto inexistente.", "auto_fix": False})

    score = max(0, 100 - (sum(12 for item in findings if item["severity"] == "critica") + sum(7 for item in findings if item["severity"] == "alta") + sum(3 for item in findings if item["severity"] == "media")))
    return {
        "checked_at": now_iso(),
        "score": score,
        "summary": {
            "findings": len(findings),
            "critical": sum(1 for item in findings if item["severity"] == "critica"),
            "high": sum(1 for item in findings if item["severity"] == "alta"),
            "medium": sum(1 for item in findings if item["severity"] == "media"),
            "auto_fixable": sum(1 for item in findings if item["auto_fix"]),
            "sales": len(sales),
            "quotes": len(quotes),
            "service_orders": len(service_orders),
            "transactions": len(transactions),
        },
        "findings": findings,
    }


def repair_system_integrity() -> dict[str, Any]:
    before = run_system_integrity_audit()
    fixed: list[dict[str, Any]] = []
    with db_connection() as conn:
        for finding in before["findings"]:
            if not finding.get("auto_fix"):
                continue
            if finding["code"] == "SALE_NO_SERVICE_ORDER":
                order = fetch_one_by_id(conn, "SalesOrder", finding.get("entity_id") or "")
                if not order:
                    continue
                record = insert_local_record(conn, "ServiceOrder", {
                    "title": f"OS - {order.get('order_number') or order.get('id')}",
                    "client_id": order.get("client_id") or "",
                    "client_name": order.get("client_name") or "Cliente",
                    "sales_order_id": order.get("id"),
                    "description": order.get("items") or "Servico vinculado automaticamente a venda.",
                    "priority": "normal",
                    "deadline": order.get("delivery_date") or "",
                    "status": "aguardando",
                })
                fixed.append({"code": finding["code"], "entity_id": order.get("id"), "created_id": record["id"]})
            if finding["code"] == "SALE_NO_FINANCIAL_ENTRY":
                order = fetch_one_by_id(conn, "SalesOrder", finding.get("entity_id") or "")
                if not order:
                    continue
                transaction = insert_local_record(conn, "Transaction", {
                    "type": "entrada",
                    "amount": money_value(order.get("total")),
                    "description": f"Venda {order.get('order_number') or order.get('id')} - {order.get('client_name') or 'Cliente'}",
                    "category": "vendas",
                    "payment_method": order.get("payment_method") or "pix",
                    "date": datetime.now().strftime("%Y-%m-%d"),
                    "client_id": order.get("client_id") or "",
                    "order_id": order.get("id"),
                    "confirmed": True,
                })
                update_local_record(conn, "SalesOrder", order.get("id"), {"transaction_id": transaction["id"], "payment_status": "pago"})
                fixed.append({"code": finding["code"], "entity_id": order.get("id"), "created_id": transaction["id"]})
            if finding["code"] == "QUOTE_NO_ITEMS":
                quote = fetch_one_by_id(conn, "ProductQuote", finding.get("entity_id") or "")
                if not quote:
                    continue
                item = insert_local_record(conn, "QuotationItem", {
                    "quotation_id": quote.get("id"),
                    "product_id": quote.get("product_id") or "",
                    "product_variant_id": quote.get("product_id") or "",
                    "product_name": quote.get("product_name") or quote.get("description") or "Item do orcamento",
                    "pricing_mode": quote.get("pricing_mode") or "manual",
                    "description": quote.get("description") or quote.get("product_name") or "Item recuperado do resumo do orcamento.",
                    "quantity": money_value(quote.get("quantity")) or 1,
                    "unit": "un",
                    "base_price": money_value(quote.get("unit_price") or quote.get("total_price") or quote.get("final_price")),
                    "unit_price": money_value(quote.get("unit_price") or quote.get("final_price")),
                    "base_subtotal": money_value(quote.get("total_price") or quote.get("final_price")),
                    "services_total": money_value(quote.get("subtotal_services")),
                    "material_cost": money_value(quote.get("material_cost") or quote.get("subtotal_products")),
                    "labor_hours": money_value(quote.get("labor_hours")),
                    "labor_cost_hour": money_value(quote.get("labor_cost_hour")),
                    "labor_cost_total": money_value(quote.get("labor_cost_total")),
                    "machine_time_min": money_value(quote.get("cut_time_min")),
                    "machine_cost_per_min": money_value(quote.get("machine_cost_per_min")),
                    "machine_cost_total": money_value(quote.get("machine_cost_total")),
                    "art_type": "recuperado",
                    "art_cost": money_value(quote.get("general_art_cost")),
                    "art_description": "Item criado automaticamente para restaurar detalhamento minimo do orcamento.",
                    "discount_pct": money_value(quote.get("discount_pct")),
                    "total_cost": money_value(quote.get("total_cost")),
                    "total": money_value(quote.get("final_price") or quote.get("total_price")),
                })
                update_local_record(conn, "ProductQuote", quote.get("id"), {"line_items_count": 1})
                fixed.append({"code": finding["code"], "entity_id": quote.get("id"), "created_id": item["id"]})
            if finding["code"] == "QUOTE_NEGATIVE_MARGIN":
                quote = fetch_one_by_id(conn, "ProductQuote", finding.get("entity_id") or "")
                if not quote or quote.get("status") not in {"enviado", "aprovado"}:
                    continue
                current_notes = quote.get("internal_notes") or ""
                warning = f"[REVISAO DE MARGEM {datetime.now().strftime('%Y-%m-%d %H:%M')}] Orcamento voltou para rascunho porque preco final ({money_value(quote.get('final_price'))}) esta abaixo do custo ({money_value(quote.get('total_cost'))})."
                update_local_record(conn, "ProductQuote", quote.get("id"), {
                    "status": "rascunho",
                    "internal_notes": f"{current_notes}\n{warning}".strip(),
                })
                fixed.append({"code": finding["code"], "entity_id": quote.get("id"), "created_id": ""})
        conn.commit()
    after = run_system_integrity_audit()
    audit_system_event("integrity_repair", "SystemIntegrity", "local-sqlite", {"before": before["summary"], "fixed": fixed, "after": after["summary"]})
    return {"before": before, "after": after, "fixed": fixed}


def validate_business_payload(entity_name: str, payload: dict[str, Any]) -> None:
    if entity_name == "ProductQuote":
        status = payload.get("status")
        if status in {"enviado", "aprovado"} and money_value(payload.get("final_price")) < money_value(payload.get("total_cost")):
            raise ValueError("Orcamento ativo nao pode ficar abaixo do custo. Revise preco, desconto ou custo antes de enviar/aprovar.")
    if entity_name == "SalesOrder" and money_value(payload.get("total")) < 0:
        raise ValueError("Venda nao pode ter total negativo.")


def find_existing_business_record(conn: sqlite3.Connection, entity_name: str, payload: dict[str, Any]) -> dict[str, Any] | None:
    if entity_name == "ServiceOrder" and payload.get("sales_order_id"):
        ensure_entity_table(conn, "ServiceOrder")
        row = conn.execute(f"SELECT * FROM {q(entity_name)} WHERE sales_order_id=? LIMIT 1", (payload.get("sales_order_id"),)).fetchone()
        if row:
            return row_to_dict(row, load_column_map(conn, entity_name))
    if entity_name == "Transaction" and payload.get("order_id") and payload.get("type") == "entrada":
        ensure_entity_table(conn, "Transaction")
        row = conn.execute(f"SELECT * FROM {q(entity_name)} WHERE order_id=? AND type='entrada' LIMIT 1", (payload.get("order_id"),)).fetchone()
        if row:
            return row_to_dict(row, load_column_map(conn, entity_name))
    return None


def _filter_column(field: str, column_map: dict[str, dict[str, str]]) -> str | None:
    """Nome de coluna SQL (citado) para um campo de filtro, ou None se a
    coluna nunca foi criada (nenhum registro jamais teve esse campo)."""
    info = column_map.get(field)
    return q(info["column"]) if info else None


def _where_for_operator(column: str, operator: str, value: Any) -> tuple[str, list[Any]] | None:
    """Traduz um operador de filtro (`$ne`, `$in`, ...) para SQL parametrizado.
    Retorna None quando o operador nao restringe nada (equivalente a sempre-verdadeiro)."""
    if operator == "$ne":
        return f"{column} IS NOT ?", [to_db_value(value)]
    if operator == "$in":
        values = value if isinstance(value, list) else []
        if not values:
            return "0", []
        return f"{column} IN ({', '.join('?' for _ in values)})", [to_db_value(v) for v in values]
    if operator == "$nin":
        values = value if isinstance(value, list) else []
        if not values:
            return None
        return f"({column} IS NULL OR {column} NOT IN ({', '.join('?' for _ in values)}))", [to_db_value(v) for v in values]
    if operator == "$gt":
        return f"{column} > ?", [to_db_value(value)]
    if operator == "$gte":
        return f"{column} >= ?", [to_db_value(value)]
    if operator == "$lt":
        return f"{column} < ?", [to_db_value(value)]
    if operator == "$lte":
        return f"{column} <= ?", [to_db_value(value)]
    if operator == "$contains":
        return f"contains_ci({column}, ?) = 1", [str(value or "")]
    return None


def build_where_clause(filters: dict[str, Any], column_map: dict[str, dict[str, str]]) -> tuple[str, list[Any]]:
    """Monta a clausula WHERE parametrizada equivalente ao antigo `matches_filter`
    (rodava em Python, sobre a tabela inteira ja carregada em memoria)."""
    clauses: list[str] = []
    params: list[Any] = []
    for field, expected in filters.items():
        column = _filter_column(field, column_map)
        if isinstance(expected, dict):
            for operator, value in expected.items():
                if column is None:
                    # Campo nunca existiu em nenhum registro: $ne/$nin sempre passam
                    # (nada e igual a "nunca setado"); os demais nunca combinam.
                    if operator in {"$ne", "$nin"}:
                        continue
                    clauses.append("0")
                    continue
                result = _where_for_operator(column, operator, value)
                if result is not None:
                    clause_sql, clause_params = result
                    clauses.append(clause_sql)
                    params.extend(clause_params)
            continue
        if column is None:
            clauses.append("0")
            continue
        if isinstance(expected, list):
            if not expected:
                clauses.append("0")
            else:
                clauses.append(f"{column} IN ({', '.join('?' for _ in expected)})")
                params.extend(to_db_value(v) for v in expected)
            continue
        clauses.append(f"{column} = ?")
        params.append(to_db_value(expected))
    return " AND ".join(clauses), params


def build_order_by(sort: str | None, column_map: dict[str, dict[str, str]]) -> str:
    if not sort:
        return ""
    descending = sort.startswith("-")
    field = sort[1:] if descending else sort
    column = _filter_column(field, column_map) or q(safe_name(field))
    return f"ORDER BY {column} {'DESC' if descending else 'ASC'}"


def parse_json_body(handler: BaseHTTPRequestHandler) -> Any:
    length = int(handler.headers.get("Content-Length") or 0)
    if length <= 0:
        return {}
    raw = handler.rfile.read(length)
    return json.loads(raw.decode("utf-8") or "{}")


def assert_public_host(url: str) -> None:
    """Bloqueia SSRF: recusa URLs que resolvem para IP privado/loopback/link-local.
    Usado antes de qualquer requisicao de saida com host vindo do cliente
    (ex.: apiUrl da Evolution API, testado pelo usuario antes de salvar)."""
    parsed = urllib.parse.urlparse(url)
    if parsed.scheme not in {"http", "https"}:
        raise ValueError("URL da API precisa comecar com http:// ou https://.")
    hostname = parsed.hostname
    if not hostname:
        raise ValueError("URL da API invalida.")
    try:
        resolved = socket.getaddrinfo(hostname, None)
    except socket.gaierror as error:
        raise ValueError(f"Nao foi possivel resolver o host da API: {hostname}") from error
    for _family, _kind, _proto, _canon, sockaddr in resolved:
        ip = ipaddress.ip_address(sockaddr[0])
        if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved or ip.is_multicast or ip.is_unspecified:
            raise ValueError(f"Host da API nao permitido (endereco de rede interna): {hostname}")


def call_json_api(url: str, api_key: str, method: str = "GET", body: Any = None) -> dict[str, Any]:
    assert_public_host(url)
    headers = {"Content-Type": "application/json"}
    if api_key:
        headers["apikey"] = api_key
    request = urllib.request.Request(
        url,
        data=json.dumps(body).encode("utf-8") if body is not None else None,
        headers=headers,
        method=method,
    )
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            text = response.read().decode("utf-8", errors="replace")
            return {"ok": response.status < 400, "status": response.status, "data": json.loads(text) if text else None}
    except urllib.error.HTTPError as error:
        text = error.read().decode("utf-8", errors="replace")
        try:
            data = json.loads(text) if text else None
        except json.JSONDecodeError:
            data = {"raw": text}
        return {"ok": False, "status": error.code, "data": data}


def evolution_send_text(payload: dict[str, Any]) -> dict[str, Any]:
    api_url = str(payload.get("apiUrl") or "").rstrip("/")
    api_key = str(payload.get("apiKey") or "")
    instance_name = str(payload.get("instanceName") or "")
    phone = re.sub(r"\D+", "", str(payload.get("phone") or ""))
    message = str(payload.get("message") or "").strip()
    if not api_url or not api_key or not instance_name:
        raise ValueError("apiUrl, apiKey e instanceName sao obrigatorios")
    if not phone or not message:
        raise ValueError("phone e message sao obrigatorios")

    encoded = urllib.parse.quote(instance_name)
    attempts = [
        {"number": phone, "text": message},
        {"number": phone, "textMessage": {"text": message}},
        {"number": phone, "options": {"delay": 1200, "presence": "composing"}, "textMessage": {"text": message}},
    ]
    last_result: dict[str, Any] | None = None
    for body in attempts:
        result = call_json_api(f"{api_url}/message/sendText/{encoded}", api_key, "POST", body)
        last_result = result
        if result["ok"]:
            return {"success": True, "sent": True, "status": result["status"], "data": result.get("data")}
    raise RuntimeError(json.dumps(last_result or {"error": "Evolution API indisponivel"}, ensure_ascii=False))


def purge_whatsapp_message_logs(payload: dict[str, Any]) -> dict[str, Any]:
    password = str(payload.get("password") or "")
    if not auth.constant_time_eq(password, ADMIN_PASSWORD):
        raise PermissionError("Senha invalida para limpar historico de mensagens.")
    with db_connection() as conn:
        ensure_entity_table(conn, "WhatsAppMessageLog")
        deleted = conn.execute('DELETE FROM "WhatsAppMessageLog"').rowcount
        conn.commit()
    return {"success": True, "deleted": deleted}


def first_instance(payload: Any) -> Any:
    if isinstance(payload, list):
        item = payload[0] if payload else None
        if not isinstance(item, dict):
            return None
        return item.get("instance") or item
    if isinstance(payload, dict):
        if payload.get("error") or (isinstance(payload.get("status"), int) and payload.get("status") >= 400):
            return None
        value = payload.get("value")
        if isinstance(value, list) and value:
            item = value[0]
            if isinstance(item, dict):
                return item.get("instance") or item
        response = payload.get("response")
        if isinstance(response, list) and response:
            item = response[0]
            return item.get("instance") or item if isinstance(item, dict) else None
        instance = payload.get("instance")
        if instance:
            return instance
        if payload.get("name") or payload.get("instanceName") or payload.get("connectionStatus"):
            return payload
    return None


def instance_state(instance: Any, fallback: str = "close") -> str:
    if not isinstance(instance, dict):
        return fallback
    return instance.get("state") or instance.get("status") or instance.get("connectionStatus") or fallback


def evolution_qr_connection(payload: dict[str, Any]) -> dict[str, Any]:
    action = payload.get("action")
    api_url = str(payload.get("apiUrl") or "").rstrip("/")
    api_key = str(payload.get("apiKey") or "")
    instance_name = str(payload.get("instanceName") or "")
    if not action or not api_url or not instance_name:
        raise ValueError("action, apiUrl e instanceName sao obrigatorios")
    encoded = urllib.parse.quote(instance_name)

    if action == "status":
        instance_res = call_json_api(f"{api_url}/instance/fetchInstances?instanceName={encoded}", api_key)
        state_res = call_json_api(f"{api_url}/instance/connectionState/{encoded}", api_key)
        instance = first_instance(instance_res.get("data"))
        state_data = state_res.get("data") or {}
        state = (state_data.get("instance") or {}).get("state") if isinstance(state_data, dict) else None
        return {"success": True, "instance": instance, "state": state or instance_state(instance)}

    if action == "logout":
        logout_res = call_json_api(f"{api_url}/instance/logout/{encoded}", api_key, "DELETE")
        return {"success": logout_res["ok"], "state": "close", "details": logout_res.get("data"), "status": logout_res["status"]}

    if action == "restart":
        restart_res = call_json_api(f"{api_url}/instance/restart/{encoded}", api_key, "PUT")
        return {"success": restart_res["ok"], "details": restart_res.get("data"), "status": restart_res["status"]}

    if action == "delete":
        delete_res = call_json_api(f"{api_url}/instance/delete/{encoded}", api_key, "DELETE")
        return {"success": delete_res["ok"], "state": "deleted", "details": delete_res.get("data"), "status": delete_res["status"]}

    if action in {"setup", "refreshQr"}:
        instance_res = call_json_api(f"{api_url}/instance/fetchInstances?instanceName={encoded}", api_key)
        instance = first_instance(instance_res.get("data"))
        if not instance:
            create_res = call_json_api(
                f"{api_url}/instance/create",
                api_key,
                "POST",
                {
                    "instanceName": instance_name,
                    "integration": "WHATSAPP-BAILEYS",
                    "qrcode": True,
                    "rejectCall": True,
                    "groupsIgnore": False,
                    "alwaysOnline": True,
                    "readMessages": False,
                    "readStatus": False,
                    "syncFullHistory": False,
                },
            )
            if not create_res["ok"]:
                raise RuntimeError(json.dumps(create_res.get("data"), ensure_ascii=False))
            instance = (create_res.get("data") or {}).get("instance")
        connect_res = call_json_api(f"{api_url}/instance/connect/{encoded}", api_key)
        if not connect_res["ok"]:
            raise RuntimeError(json.dumps(connect_res.get("data"), ensure_ascii=False))
        state_res = call_json_api(f"{api_url}/instance/connectionState/{encoded}", api_key)
        state_data = state_res.get("data") or {}
        state = (state_data.get("instance") or {}).get("state") if isinstance(state_data, dict) else None
        return {"success": True, "instance": instance, "qr": connect_res.get("data"), "state": state or instance_state(instance)}

    raise ValueError("Acao invalida")


EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


def auth_status() -> dict[str, Any]:
    with db_connection() as conn:
        ensure_entity_table(conn, "User")
        total = conn.execute('SELECT COUNT(*) AS total FROM "User"').fetchone()["total"]
    return {"hasUsers": bool(total)}


def auth_bootstrap(payload: dict[str, Any]) -> dict[str, Any]:
    name = str(payload.get("name") or "").strip()
    email = str(payload.get("email") or "").strip().lower()
    password = str(payload.get("password") or "")
    if not name:
        raise ValueError("Informe o nome.")
    if not EMAIL_RE.match(email):
        raise ValueError("E-mail invalido.")
    if len(password) < 6:
        raise ValueError("A senha precisa ter ao menos 6 caracteres.")
    with db_connection() as conn:
        ensure_entity_table(conn, "User")
        existing = conn.execute('SELECT COUNT(*) AS total FROM "User"').fetchone()["total"]
        if existing:
            raise ForbiddenError("Ja existe um usuario cadastrado.")
        timestamp = now_iso()
        user = {
            "id": f"User_{int(time.time() * 1000)}_{os.urandom(3).hex()}",
            "created_date": timestamp,
            "updated_date": timestamp,
            "name": name,
            "email": email,
            "password_hash": auth.hash_password(password),
            "role": "admin",
            "active": True,
            "must_change_password": False,
            "last_login": timestamp,
        }
        column_map = ensure_payload_columns(conn, "User", user)
        fields = [field for field in user if field in column_map]
        columns = [column_map[field]["column"] for field in fields]
        placeholders = ", ".join("?" for _ in columns)
        conn.execute(
            f'INSERT INTO {q("User")} ({", ".join(q(column) for column in columns)}) VALUES ({placeholders})',
            [to_db_value(user[field]) for field in fields],
        )
        session = create_session(conn, user["id"])
    return {"token": session["token"], "user": sanitize_user(user)}


def auth_login(payload: dict[str, Any]) -> dict[str, Any]:
    email = str(payload.get("email") or "").strip().lower()
    password = str(payload.get("password") or "")
    if not email or not password:
        raise ValueError("Informe e-mail e senha.")
    with db_connection() as conn:
        ensure_entity_table(conn, "User")
        existing_columns = {row["name"] for row in conn.execute('PRAGMA table_info("User")').fetchall()}
        user = None
        if "email" in existing_columns:
            column_map = load_column_map(conn, "User")
            row = conn.execute(f'SELECT * FROM {q("User")} WHERE "email"=?', (email,)).fetchone()
            user = row_to_dict(row, column_map) if row else None
        if not user or not auth.verify_password(password, user.get("password_hash")):
            raise PermissionError("E-mail ou senha incorretos.")
        if user.get("active") is False:
            raise PermissionError("Usuario desativado. Procure um administrador.")
        timestamp = now_iso()
        conn.execute(f'UPDATE {q("User")} SET "updated_date"=?, "last_login"=? WHERE "id"=?', (timestamp, timestamp, user["id"]))
        session = create_session(conn, user["id"])
        user["last_login"] = timestamp
    return {"token": session["token"], "user": sanitize_user(user)}


def auth_change_password(session_user: dict[str, Any], payload: dict[str, Any]) -> dict[str, Any]:
    current_password = str(payload.get("currentPassword") or "")
    new_password = str(payload.get("newPassword") or "")
    if len(new_password) < 6:
        raise ValueError("A nova senha precisa ter ao menos 6 caracteres.")
    with db_connection() as conn:
        row = conn.execute(f'SELECT * FROM {q("User")} WHERE "id"=?', (session_user["id"],)).fetchone()
        user = row_to_dict(row, load_column_map(conn, "User")) if row else None
        if not user or not auth.verify_password(current_password, user.get("password_hash")):
            raise PermissionError("Senha atual incorreta.")
        new_hash = auth.hash_password(new_password)
        timestamp = now_iso()
        conn.execute(
            f'UPDATE {q("User")} SET "password_hash"=?, "must_change_password"=?, "updated_date"=? WHERE "id"=?',
            (new_hash, 0, timestamp, session_user["id"]),
        )
    return {"success": True}


class LocalHandler(BaseHTTPRequestHandler):
    server_version = "PincelLuzLocalSQLite/1.0"

    def is_allowed_origin(self) -> bool:
        origin = self.headers.get("Origin", "")
        if not origin:
            return True
        return "*" in ALLOWED_ORIGINS or origin in ALLOWED_ORIGINS

    def is_authorized(self) -> bool:
        """Camada opcional adicional (defesa em profundidade): so importa
        se PINCEL_LUZ_API_TOKEN estiver configurado. A autenticacao real
        e a sessao validada em `guard_request`."""
        if not API_TOKEN:
            return True
        return self.headers.get("X-Pincel-Luz-Api-Key", "") == API_TOKEN

    def session_token_from_headers(self) -> str:
        auth_header = self.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            return auth_header[7:].strip()
        return ""

    def guard_request(self, parsed: urllib.parse.ParseResult) -> bool:
        self.session_user = None
        if not self.is_allowed_origin():
            self.send_error_json("Origem nao autorizada para acessar a API local.", 403)
            return False
        if parsed.path in AUTH_EXEMPT_PATHS or parsed.path == "/api/local/auth/logout" or parsed.path.startswith("/uploads/"):
            return True
        if not parsed.path.startswith("/api/local/"):
            return True
        if not self.is_authorized():
            self.send_error_json("Chave da API local ausente ou invalida.", 401)
            return False
        token = self.session_token_from_headers()
        with db_connection() as conn:
            self.session_user = validate_session(conn, token)
        if not self.session_user:
            self.send_error_json("Sessao invalida ou expirada. Faca login novamente.", 401)
            return False
        return True

    def log_message(self, format: str, *args: Any) -> None:
        sys.stdout.write("%s - %s\n" % (self.address_string(), format % args))

    def end_headers(self) -> None:
        origin = self.headers.get("Origin", "")
        if "*" in ALLOWED_ORIGINS:
            self.send_header("Access-Control-Allow-Origin", "*")
        elif origin and origin in ALLOWED_ORIGINS:
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Vary", "Origin")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Pincel-Luz-Api-Key, Authorization")
        self.send_header("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "same-origin")
        super().end_headers()

    def send_json(self, data: Any, status: int = 200) -> None:
        encoded = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)

    def send_error_json(self, message: str, status: int = 500) -> None:
        self.send_json({"error": message}, status)

    def do_OPTIONS(self) -> None:
        self.send_response(204 if self.is_allowed_origin() else 403)
        self.end_headers()

    def do_GET(self) -> None:
        parsed = urllib.parse.urlparse(self.path)
        parts = [urllib.parse.unquote(part) for part in parsed.path.strip("/").split("/") if part]
        try:
            if not self.guard_request(parsed):
                return
            if parsed.path == "/api/local/health":
                with db_connection() as conn:
                    count = conn.execute("SELECT COUNT(*) AS total FROM _meta_tables").fetchone()["total"]
                self.send_json({"ok": True, "db": str(DB_PATH), "tables": count})
                return

            if parsed.path.startswith("/uploads/"):
                return self.serve_upload(parsed.path.removeprefix("/uploads/"))

            if parsed.path.startswith("/backups/"):
                self.send_error_json("Backups sao protegidos. Use a area Dados locais com senha administrativa.", 403)
                return

            if parsed.path == "/api/local/auth/status":
                self.send_json({"data": auth_status()})
                return

            if parsed.path == "/api/local/auth/me":
                if not self.session_user:
                    self.send_error_json("Sessao invalida ou expirada.", 401)
                    return
                self.send_json({"data": sanitize_user(self.session_user)})
                return

            if len(parts) == 4 and parts[:3] == ["api", "local", "entities"]:
                self.handle_list(parts[3], urllib.parse.parse_qs(parsed.query))
                return

            self.send_error_json("Rota nao encontrada", 404)
        except Exception as error:
            status = status_for_error(error)
            if status == 500:
                traceback.print_exc()
                self.send_error_json("Erro interno no servidor.", 500)
            else:
                self.send_error_json(str(error), status)

    def do_POST(self) -> None:
        parsed = urllib.parse.urlparse(self.path)
        parts = [urllib.parse.unquote(part) for part in parsed.path.strip("/").split("/") if part]
        try:
            if not self.guard_request(parsed):
                return
            if parsed.path == "/api/local/uploads":
                self.handle_upload()
                return

            if parsed.path == "/api/local/auth/bootstrap":
                self.send_json({"data": auth_bootstrap(parse_json_body(self))}, 201)
                return

            if parsed.path == "/api/local/auth/login":
                self.send_json({"data": auth_login(parse_json_body(self))})
                return

            if parsed.path == "/api/local/auth/logout":
                payload = parse_json_body(self)
                token = str(payload.get("token") or self.session_token_from_headers())
                if token:
                    with db_connection() as conn:
                        delete_session(conn, token)
                self.send_json({"data": {"success": True}})
                return

            if parsed.path == "/api/local/auth/change-password":
                if not self.session_user:
                    self.send_error_json("Sessao invalida ou expirada.", 401)
                    return
                self.send_json({"data": auth_change_password(self.session_user, parse_json_body(self))})
                return

            if len(parts) == 3 and parts == ["api", "local", "functions"]:
                payload = parse_json_body(self)
                self.handle_function(payload.get("name"), payload.get("payload") or {})
                return

            if len(parts) == 5 and parts[:3] == ["api", "local", "entities"] and parts[4] == "bulk":
                self.handle_bulk_create(parts[3])
                return

            if len(parts) == 4 and parts[:3] == ["api", "local", "entities"]:
                self.handle_create(parts[3])
                return

            self.send_error_json("Rota nao encontrada", 404)
        except Exception as error:
            status = status_for_error(error)
            if status == 500:
                traceback.print_exc()
                self.send_error_json("Erro interno no servidor.", 500)
            else:
                self.send_error_json(str(error), status)

    def do_PATCH(self) -> None:
        parsed = urllib.parse.urlparse(self.path)
        parts = [urllib.parse.unquote(part) for part in parsed.path.strip("/").split("/") if part]
        try:
            if not self.guard_request(parsed):
                return
            if len(parts) == 5 and parts[:3] == ["api", "local", "entities"]:
                self.handle_update(parts[3], parts[4])
                return
            self.send_error_json("Rota nao encontrada", 404)
        except Exception as error:
            status = status_for_error(error)
            if status == 500:
                traceback.print_exc()
                self.send_error_json("Erro interno no servidor.", 500)
            else:
                self.send_error_json(str(error), status)

    def do_DELETE(self) -> None:
        parsed = urllib.parse.urlparse(self.path)
        parts = [urllib.parse.unquote(part) for part in parsed.path.strip("/").split("/") if part]
        try:
            if not self.guard_request(parsed):
                return
            if len(parts) == 5 and parts[:3] == ["api", "local", "entities"]:
                self.handle_delete(parts[3], parts[4])
                return
            self.send_error_json("Rota nao encontrada", 404)
        except Exception as error:
            status = status_for_error(error)
            if status == 500:
                traceback.print_exc()
                self.send_error_json("Erro interno no servidor.", 500)
            else:
                self.send_error_json(str(error), status)

    def handle_list(self, entity_name: str, query: dict[str, list[str]]) -> None:
        assert_known_entity(entity_name)
        filters = json.loads(query.get("filter", ["{}"])[0] or "{}")
        sort = query.get("sort", [None])[0]
        limit = int(query.get("limit", ["0"])[0] or 0)
        skip = int(query.get("skip", ["0"])[0] or 0)
        with db_connection() as conn:
            ensure_entity_table(conn, entity_name)
            column_map = load_column_map(conn, entity_name)
            where_sql, where_params = build_where_clause(filters, column_map)
            select_sql = f"SELECT * FROM {q(entity_name)}"
            count_sql = f"SELECT COUNT(*) FROM {q(entity_name)}"
            if where_sql:
                select_sql += f" WHERE {where_sql}"
                count_sql += f" WHERE {where_sql}"
            total = conn.execute(count_sql, where_params).fetchone()[0]
            order_sql = build_order_by(sort, column_map)
            if order_sql:
                select_sql += f" {order_sql}"
            params = list(where_params)
            if limit or skip:
                select_sql += " LIMIT ? OFFSET ?"
                params.append(limit if limit else -1)
                params.append(skip or 0)
            rows = [row_to_dict(row, column_map) for row in conn.execute(select_sql, params).fetchall()]
        if entity_name == "User":
            rows = [sanitize_user(row) for row in rows]
        self.send_json({"data": rows, "total": total})

    def handle_create(self, entity_name: str) -> None:
        assert_known_entity(entity_name)
        if entity_name == "User" and not (self.session_user and self.session_user.get("role") == "admin"):
            self.send_error_json("Apenas administradores podem criar usuarios.", 403)
            return
        payload = parse_json_body(self)
        if not isinstance(payload, dict):
            self.send_error_json("Payload precisa ser objeto JSON", 400)
            return
        timestamp = now_iso()
        payload = dict(payload)
        if entity_name == "User":
            payload = prepare_user_payload(payload, require_password=True)
        payload.setdefault("id", f"{entity_name}_{int(time.time() * 1000)}_{os.urandom(3).hex()}")
        payload.setdefault("created_date", timestamp)
        payload["updated_date"] = timestamp
        validate_business_payload(entity_name, payload)
        with db_connection() as conn:
            if entity_name == "User" and payload.get("email"):
                ensure_entity_table(conn, "User")
                duplicate = conn.execute('SELECT "id" FROM "User" WHERE "email"=?', (payload["email"],)).fetchone()
                if duplicate:
                    raise ValueError("Ja existe um usuario com este e-mail.")
            existing = find_existing_business_record(conn, entity_name, payload)
            if existing:
                self.send_json({"data": sanitize_user(existing) if entity_name == "User" else existing}, 200)
                return
            column_map = ensure_payload_columns(conn, entity_name, payload)
            fields = [field for field in payload if field in column_map]
            columns = [column_map[field]["column"] for field in fields]
            placeholders = ", ".join("?" for _ in columns)
            conn.execute(
                f"INSERT OR REPLACE INTO {q(entity_name)} ({', '.join(q(column) for column in columns)}) VALUES ({placeholders})",
                [to_db_value(payload[field]) for field in fields],
            )
            conn.commit()
        self.send_json({"data": sanitize_user(payload) if entity_name == "User" else payload}, 201)

    def handle_bulk_create(self, entity_name: str) -> None:
        assert_known_entity(entity_name)
        if entity_name == "User":
            self.send_error_json("Criacao em lote nao e permitida para usuarios.", 403)
            return
        payload = parse_json_body(self)
        items = payload if isinstance(payload, list) else payload.get("items", [])
        if not isinstance(items, list):
            self.send_error_json("Bulk create precisa de lista", 400)
            return
        created = []
        for item in items:
            if isinstance(item, dict):
                created.append(self.create_record(entity_name, item))
        self.send_json({"data": created}, 201)

    def create_record(self, entity_name: str, payload: dict[str, Any]) -> dict[str, Any]:
        timestamp = now_iso()
        record = dict(payload)
        record.setdefault("id", f"{entity_name}_{int(time.time() * 1000)}_{os.urandom(3).hex()}")
        record.setdefault("created_date", timestamp)
        record["updated_date"] = timestamp
        validate_business_payload(entity_name, record)
        with db_connection() as conn:
            existing = find_existing_business_record(conn, entity_name, record)
            if existing:
                return existing
            column_map = ensure_payload_columns(conn, entity_name, record)
            fields = [field for field in record if field in column_map]
            columns = [column_map[field]["column"] for field in fields]
            placeholders = ", ".join("?" for _ in columns)
            conn.execute(
                f"INSERT OR REPLACE INTO {q(entity_name)} ({', '.join(q(column) for column in columns)}) VALUES ({placeholders})",
                [to_db_value(record[field]) for field in fields],
            )
            conn.commit()
        return record

    def handle_update(self, entity_name: str, record_id: str) -> None:
        assert_known_entity(entity_name)
        payload = parse_json_body(self)
        if not isinstance(payload, dict):
            self.send_error_json("Payload precisa ser objeto JSON", 400)
            return
        payload = dict(payload)
        if entity_name == "User":
            is_admin = bool(self.session_user and self.session_user.get("role") == "admin")
            is_self = bool(self.session_user and self.session_user.get("id") == record_id)
            if not is_admin and not is_self:
                self.send_error_json("Sem permissao para alterar este usuario.", 403)
                return
            payload = prepare_user_payload(payload, require_password=False)
            if not is_admin:
                payload = {key: value for key, value in payload.items() if key in {"name", "email", "password_hash"}}
        payload["id"] = record_id
        payload["updated_date"] = now_iso()
        with db_connection() as conn:
            current_row = None
            if table_exists(conn, entity_name):
                current_row = conn.execute(f"SELECT * FROM {q(entity_name)} WHERE id=?", (record_id,)).fetchone()
            current = row_to_dict(current_row, load_column_map(conn, entity_name)) if current_row else {}
            validate_business_payload(entity_name, {**current, **payload})
            column_map = ensure_payload_columns(conn, entity_name, payload)
            fields = [field for field in payload if field != "id" and field in column_map]
            assignments = ", ".join(f"{q(column_map[field]['column'])}=?" for field in fields)
            values = [to_db_value(payload[field]) for field in fields]
            values.append(record_id)
            cur = conn.execute(f"UPDATE {q(entity_name)} SET {assignments} WHERE id=?", values)
            conn.commit()
            if cur.rowcount == 0:
                self.send_error_json(f"{entity_name} nao encontrado: {record_id}", 404)
                return
            row = conn.execute(f"SELECT * FROM {q(entity_name)} WHERE id=?", (record_id,)).fetchone()
            result = row_to_dict(row, load_column_map(conn, entity_name))
            self.send_json({"data": sanitize_user(result) if entity_name == "User" else result})

    def handle_delete(self, entity_name: str, record_id: str) -> None:
        assert_known_entity(entity_name)
        if entity_name == "WhatsAppMessageLog":
            self.send_error_json("Historico de mensagens protegido. Use a funcao protegida por senha.", 403)
            return
        if entity_name == "User":
            if not (self.session_user and self.session_user.get("role") == "admin"):
                self.send_error_json("Apenas administradores podem excluir usuarios.", 403)
                return
            if self.session_user.get("id") == record_id:
                self.send_error_json("Voce nao pode excluir o proprio usuario.", 400)
                return
            with db_connection() as conn:
                ensure_entity_table(conn, "User")
                column_map = load_column_map(conn, "User")
                rows = [row_to_dict(row, column_map) for row in conn.execute(f'SELECT * FROM {q("User")}').fetchall()]
            admins = [row for row in rows if row.get("role") == "admin" and row.get("active") is not False]
            target = next((row for row in rows if row.get("id") == record_id), None)
            if target and target.get("role") == "admin" and len(admins) <= 1:
                self.send_error_json("Nao e possivel excluir o ultimo administrador ativo.", 400)
                return
        with db_connection() as conn:
            ensure_entity_table(conn, entity_name)
            conn.execute(f"DELETE FROM {q(entity_name)} WHERE id=?", (record_id,))
            conn.commit()
        self.send_json({"success": True})

    def handle_upload(self) -> None:
        payload = parse_json_body(self)
        name = safe_name(Path(str(payload.get("name") or "arquivo.bin")).name)
        extension = (Path(name).suffix or mimetypes.guess_extension(str(payload.get("type") or "")) or ".bin").lower()
        if extension not in ALLOWED_UPLOAD_EXTENSIONS:
            allowed = ", ".join(sorted(ALLOWED_UPLOAD_EXTENSIONS))
            raise ValueError(f"Tipo de arquivo nao permitido ({extension}). Permitidos: {allowed}.")
        base64_str = str(payload.get("base64") or "")
        if len(base64_str) > (MAX_UPLOAD_BYTES * 4 // 3) + 8:
            raise ValueError(f"Arquivo maior que o limite de {MAX_UPLOAD_BYTES // (1024 * 1024)}MB.")
        raw = base64.b64decode(base64_str)
        if len(raw) > MAX_UPLOAD_BYTES:
            raise ValueError(f"Arquivo maior que o limite de {MAX_UPLOAD_BYTES // (1024 * 1024)}MB.")
        stem = Path(name).stem or "arquivo"
        file_name = f"{int(time.time() * 1000)}-{stem}{extension}"
        UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        target = UPLOAD_DIR / file_name
        target.write_bytes(raw)
        self.send_json({"file_url": f"/uploads/{urllib.parse.quote(file_name)}"})

    def serve_upload(self, file_name: str) -> None:
        target = (UPLOAD_DIR / Path(file_name).name).resolve()
        if not str(target).startswith(str(UPLOAD_DIR.resolve())) or not target.exists():
            self.send_error_json("Arquivo nao encontrado", 404)
            return
        content = target.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", mimetypes.guess_type(str(target))[0] or "application/octet-stream")
        self.send_header("Content-Length", str(len(content)))
        self.send_header("Content-Disposition", f'attachment; filename="{target.name}"')
        self.end_headers()
        self.wfile.write(content)

    def serve_backup(self, file_name: str) -> None:
        target = resolve_backup_file(file_name)
        content = target.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", "application/x-sqlite3")
        self.send_header("Content-Disposition", f'attachment; filename="{target.name}"')
        self.send_header("Content-Length", str(len(content)))
        self.end_headers()
        self.wfile.write(content)

    def handle_function(self, name: str, payload: dict[str, Any]) -> None:
        if name == "listSqliteBackups":
            self.send_json({"data": {"backups": list_sqlite_backups(), "database": str(DB_PATH)}})
            return
        if name == "createSqliteBackup":
            self.send_json({"data": create_sqlite_backup(str(payload.get("reason") or "manual"))}, 201)
            return
        if name == "verifySqliteBackup":
            backup = backup_manifest(resolve_backup_file(str(payload.get("file_name") or "")))
            audit_system_event("backup_verify", "SQLiteBackup", backup["file_name"], backup)
            self.send_json({"data": backup})
            return
        if name == "restoreSqliteBackup":
            self.send_json({"data": restore_sqlite_backup(str(payload.get("file_name") or ""), str(payload.get("password") or ""))})
            return
        if name == "downloadSqliteBackup":
            self.send_json({"data": download_sqlite_backup(str(payload.get("file_name") or ""), str(payload.get("password") or ""))})
            return
        if name == "runSystemIntegrityAudit":
            self.send_json({"data": run_system_integrity_audit()})
            return
        if name == "repairSystemIntegrity":
            self.send_json({"data": repair_system_integrity()})
            return
        if name == "evolutionQrConnection":
            self.send_json({"data": evolution_qr_connection(payload)})
            return
        if name == "sendWhatsAppMessage":
            self.send_json({"data": evolution_send_text(payload)})
            return
        if name == "purgeWhatsAppMessageLogs":
            self.send_json({"data": purge_whatsapp_message_logs(payload)})
            return
        if name == "adjustStock":
            self.send_json({"data": adjust_stock(payload)})
            return
        if name == "adjustStockBulk":
            self.send_json({"data": adjust_stock_bulk(payload)})
            return
        if name == "sendQuotePdfEmail":
            raise RuntimeError("Envio automatico de e-mail local ainda nao configurado. Usando fallback mailto/download.")
        if name in {"emitirNota", "consultarNota"}:
            raise RuntimeError("Integracao fiscal externa nao configurada no modo local.")
        raise RuntimeError(f"Funcao local nao implementada: {name}")


def main() -> None:
    if not DB_PATH.exists():
        print(f"Banco nao encontrado em {DB_PATH}. Execute: npm run db:sqlite", file=sys.stderr)
    if ADMIN_PASSWORD == "troque-esta-senha":
        print("AVISO: PINCEL_LUZ_ADMIN_PASSWORD nao foi definida; usando senha padrao insegura.", file=sys.stderr)
    print(f"Pincel Luz API local em http://{HOST}:{PORT}")
    print(f"SQLite: {DB_PATH}")
    threading.Thread(target=run_backup_scheduler, daemon=True).start()
    try:
        ThreadingHTTPServer((HOST, PORT), LocalHandler).serve_forever()
    except Exception:
        print("Falha fatal na API Python:", file=sys.stderr)
        traceback.print_exc()
        raise


if __name__ == "__main__":
    main()
