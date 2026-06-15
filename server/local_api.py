from __future__ import annotations

import base64
import hashlib
import json
import mimetypes
import os
import re
import shutil
import sqlite3
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
DB_PATH = Path(os.environ.get("PINCEL_LUZ_DB", ROOT / "database" / "pincel-luz-erp.sqlite"))
UPLOAD_DIR = ROOT / "storage" / "uploads"
BACKUP_DIR = ROOT / "storage" / "backups"
HOST = os.environ.get("PINCEL_LUZ_API_HOST", "127.0.0.1")
PORT = int(os.environ.get("PINCEL_LUZ_API_PORT", "8787"))
ADMIN_PASSWORD = os.environ.get("PINCEL_LUZ_ADMIN_PASSWORD", "troque-esta-senha")
API_TOKEN = os.environ.get("PINCEL_LUZ_API_TOKEN", "")
DEFAULT_ALLOWED_ORIGINS = "http://127.0.0.1:5173,http://localhost:5173,http://127.0.0.1:8080,http://localhost:8080"
ALLOWED_ORIGINS_RAW = os.environ.get("PINCEL_LUZ_ALLOWED_ORIGINS", "").strip() or DEFAULT_ALLOWED_ORIGINS
ALLOWED_ORIGINS = {
    origin.strip()
    for origin in ALLOWED_ORIGINS_RAW.split(",")
    if origin.strip()
}

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


def connect() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys=ON")
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=5000")
    ensure_metadata(conn)
    return conn


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
        with sqlite3.connect(path) as conn:
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
        with connect() as conn:
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
    with sqlite3.connect(DB_PATH) as source:
        source.execute("PRAGMA wal_checkpoint(FULL)")
        with sqlite3.connect(target) as destination:
            source.backup(destination)
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


def resolve_backup_file(file_name: str) -> Path:
    candidate = (BACKUP_DIR / Path(file_name).name).resolve()
    root = BACKUP_DIR.resolve()
    if not str(candidate).startswith(str(root)) or candidate.suffix != ".sqlite" or not candidate.exists():
        raise RuntimeError("Backup nao encontrado ou invalido")
    return candidate


def restore_sqlite_backup(file_name: str, password: str) -> dict[str, Any]:
    if password != ADMIN_PASSWORD:
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
    if password != ADMIN_PASSWORD:
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


def run_system_integrity_audit() -> dict[str, Any]:
    with connect() as conn:
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
    with connect() as conn:
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


def compare_value(actual: Any, expected: Any) -> bool:
    if isinstance(expected, dict):
        for operator, value in expected.items():
            if operator == "$ne" and actual == value:
                return False
            if operator == "$in" and (not isinstance(value, list) or actual not in value):
                return False
            if operator == "$nin" and isinstance(value, list) and actual in value:
                return False
            if operator == "$gt" and not (actual is not None and actual > value):
                return False
            if operator == "$gte" and not (actual is not None and actual >= value):
                return False
            if operator == "$lt" and not (actual is not None and actual < value):
                return False
            if operator == "$lte" and not (actual is not None and actual <= value):
                return False
            if operator == "$contains" and str(value or "").lower() not in str(actual or "").lower():
                return False
        return True
    if isinstance(expected, list):
        return actual in expected
    return actual == expected


def matches_filter(row: dict[str, Any], filters: dict[str, Any]) -> bool:
    return all(compare_value(row.get(key), expected) for key, expected in filters.items())


def sort_rows(rows: list[dict[str, Any]], sort: str | None) -> list[dict[str, Any]]:
    if not sort:
        return rows
    descending = sort.startswith("-")
    field = sort[1:] if descending else sort
    return sorted(rows, key=lambda item: str(item.get(field) or ""), reverse=descending)


def parse_json_body(handler: BaseHTTPRequestHandler) -> Any:
    length = int(handler.headers.get("Content-Length") or 0)
    if length <= 0:
        return {}
    raw = handler.rfile.read(length)
    return json.loads(raw.decode("utf-8") or "{}")


def call_json_api(url: str, api_key: str, method: str = "GET", body: Any = None) -> dict[str, Any]:
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
    if password != ADMIN_PASSWORD:
        raise PermissionError("Senha invalida para limpar historico de mensagens.")
    with connect() as conn:
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


class LocalHandler(BaseHTTPRequestHandler):
    server_version = "PincelLuzLocalSQLite/1.0"

    def is_allowed_origin(self) -> bool:
        origin = self.headers.get("Origin", "")
        if not origin:
            return True
        return "*" in ALLOWED_ORIGINS or origin in ALLOWED_ORIGINS

    def is_authorized(self) -> bool:
        if not API_TOKEN:
            return True
        return self.headers.get("X-Pincel-Luz-Api-Key", "") == API_TOKEN

    def guard_request(self, parsed: urllib.parse.ParseResult) -> bool:
        if not self.is_allowed_origin():
            self.send_error_json("Origem nao autorizada para acessar a API local.", 403)
            return False
        if parsed.path == "/api/local/health" or parsed.path.startswith("/uploads/"):
            return True
        if parsed.path.startswith("/api/local/") and not self.is_authorized():
            self.send_error_json("Chave da API local ausente ou invalida.", 401)
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
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Pincel-Luz-Api-Key")
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
                with connect() as conn:
                    count = conn.execute("SELECT COUNT(*) AS total FROM _meta_tables").fetchone()["total"]
                self.send_json({"ok": True, "db": str(DB_PATH), "tables": count})
                return

            if parsed.path.startswith("/uploads/"):
                return self.serve_upload(parsed.path.removeprefix("/uploads/"))

            if parsed.path.startswith("/backups/"):
                self.send_error_json("Backups sao protegidos. Use a area Dados locais com senha administrativa.", 403)
                return

            if len(parts) == 4 and parts[:3] == ["api", "local", "entities"]:
                self.handle_list(parts[3], urllib.parse.parse_qs(parsed.query))
                return

            self.send_error_json("Rota nao encontrada", 404)
        except Exception as error:
            self.send_error_json(str(error), 500)

    def do_POST(self) -> None:
        parsed = urllib.parse.urlparse(self.path)
        parts = [urllib.parse.unquote(part) for part in parsed.path.strip("/").split("/") if part]
        try:
            if not self.guard_request(parsed):
                return
            if parsed.path == "/api/local/uploads":
                self.handle_upload()
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
            self.send_error_json(str(error), 500)

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
            self.send_error_json(str(error), 500)

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
            self.send_error_json(str(error), 500)

    def handle_list(self, entity_name: str, query: dict[str, list[str]]) -> None:
        filters = json.loads(query.get("filter", ["{}"])[0] or "{}")
        sort = query.get("sort", [None])[0]
        limit = int(query.get("limit", ["0"])[0] or 0)
        skip = int(query.get("skip", ["0"])[0] or 0)
        with connect() as conn:
            ensure_entity_table(conn, entity_name)
            column_map = load_column_map(conn, entity_name)
            rows = [
                row_to_dict(row, column_map)
                for row in conn.execute(f"SELECT * FROM {q(entity_name)}").fetchall()
            ]
        rows = [row for row in rows if matches_filter(row, filters)]
        rows = sort_rows(rows, sort)
        if skip:
            rows = rows[skip:]
        if limit:
            rows = rows[:limit]
        self.send_json({"data": rows})

    def handle_create(self, entity_name: str) -> None:
        payload = parse_json_body(self)
        if not isinstance(payload, dict):
            self.send_error_json("Payload precisa ser objeto JSON", 400)
            return
        timestamp = now_iso()
        payload = dict(payload)
        payload.setdefault("id", f"{entity_name}_{int(time.time() * 1000)}_{os.urandom(3).hex()}")
        payload.setdefault("created_date", timestamp)
        payload["updated_date"] = timestamp
        validate_business_payload(entity_name, payload)
        with connect() as conn:
            existing = find_existing_business_record(conn, entity_name, payload)
            if existing:
                self.send_json({"data": existing}, 200)
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
        self.send_json({"data": payload}, 201)

    def handle_bulk_create(self, entity_name: str) -> None:
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
        with connect() as conn:
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
        payload = parse_json_body(self)
        if not isinstance(payload, dict):
            self.send_error_json("Payload precisa ser objeto JSON", 400)
            return
        payload = dict(payload)
        payload["id"] = record_id
        payload["updated_date"] = now_iso()
        with connect() as conn:
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
            self.send_json({"data": row_to_dict(row, load_column_map(conn, entity_name))})

    def handle_delete(self, entity_name: str, record_id: str) -> None:
        if entity_name == "WhatsAppMessageLog":
            self.send_error_json("Historico de mensagens protegido. Use a funcao protegida por senha.", 403)
            return
        with connect() as conn:
            ensure_entity_table(conn, entity_name)
            conn.execute(f"DELETE FROM {q(entity_name)} WHERE id=?", (record_id,))
            conn.commit()
        self.send_json({"success": True})

    def handle_upload(self) -> None:
        payload = parse_json_body(self)
        name = safe_name(Path(str(payload.get("name") or "arquivo.bin")).name)
        extension = Path(name).suffix or mimetypes.guess_extension(str(payload.get("type") or "")) or ".bin"
        stem = Path(name).stem or "arquivo"
        file_name = f"{int(time.time() * 1000)}-{stem}{extension}"
        UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        raw = base64.b64decode(str(payload.get("base64") or ""))
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
        if name == "sendQuotePdfEmail":
            raise RuntimeError("Envio automatico de e-mail local ainda nao configurado. Usando fallback mailto/download.")
        if name in {"emitirNota", "consultarNota"}:
            raise RuntimeError("Integracao fiscal externa nao configurada no modo local.")
        raise RuntimeError(f"Funcao local nao implementada: {name}")


def main() -> None:
    if not DB_PATH.exists():
        print(f"Banco nao encontrado em {DB_PATH}. Execute: npm run db:sqlite", file=sys.stderr)
    print(f"Pincel Luz API local em http://{HOST}:{PORT}")
    print(f"SQLite: {DB_PATH}")
    ThreadingHTTPServer((HOST, PORT), LocalHandler).serve_forever()


if __name__ == "__main__":
    main()
