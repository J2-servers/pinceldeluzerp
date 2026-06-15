from __future__ import annotations

import argparse
import json
import re
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT = ROOT / "database" / "pincel-luz-erp.sqlite"
DEFAULT_SCHEMA_SQL = ROOT / "database" / "schema.sql"
DEFAULT_MANIFEST = ROOT / "database" / "sqlite-manifest.json"

SYSTEM_FIELDS: dict[str, dict[str, Any]] = {
    "id": {"type": "string", "description": "ID do registro"},
    "created_date": {"type": "string", "format": "date-time"},
    "updated_date": {"type": "string", "format": "date-time"},
    "created_by_id": {"type": "string"},
    "created_by": {"type": "string"},
    "updated_by": {"type": "string"},
    "is_sample": {"type": "boolean"},
}


def strip_json_comments(text: str) -> str:
    """Remove comentarios JSONC sem mexer em strings."""
    result: list[str] = []
    i = 0
    in_string = False
    escape = False
    while i < len(text):
        char = text[i]
        next_char = text[i + 1] if i + 1 < len(text) else ""

        if in_string:
            result.append(char)
            if escape:
                escape = False
            elif char == "\\":
                escape = True
            elif char == '"':
                in_string = False
            i += 1
            continue

        if char == '"':
            in_string = True
            result.append(char)
            i += 1
            continue

        if char == "/" and next_char == "/":
            i += 2
            while i < len(text) and text[i] not in "\r\n":
                i += 1
            continue

        if char == "/" and next_char == "*":
            i += 2
            while i + 1 < len(text) and not (text[i] == "*" and text[i + 1] == "/"):
                i += 1
            i += 2
            continue

        result.append(char)
        i += 1

    return "".join(result)


def load_json(path: Path) -> Any:
    if path.suffix.lower() == ".jsonc":
        return json.loads(strip_json_comments(path.read_text(encoding="utf-8-sig")))
    return json.loads(path.read_text(encoding="utf-8-sig"))


def q(identifier: str) -> str:
    return '"' + identifier.replace('"', '""') + '"'


def safe_name(name: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9_]", "_", name)
    if not cleaned or cleaned[0].isdigit():
        cleaned = f"_{cleaned}"
    return cleaned


def json_type_to_sql(field_schema: dict[str, Any]) -> str:
    field_type = field_schema.get("type", "string")
    if isinstance(field_type, list):
        field_type = next((item for item in field_type if item != "null"), "string")
    if field_type in {"integer"}:
        return "INTEGER"
    if field_type in {"number"}:
        return "REAL"
    if field_type in {"boolean"}:
        return "INTEGER"
    if field_type in {"array", "object"}:
        return "TEXT"
    return "TEXT"


def infer_schema_from_value(value: Any) -> dict[str, Any]:
    if isinstance(value, bool):
        return {"type": "boolean"}
    if isinstance(value, int) and not isinstance(value, bool):
        return {"type": "integer"}
    if isinstance(value, float):
        return {"type": "number"}
    if isinstance(value, list):
        return {"type": "array"}
    if isinstance(value, dict):
        return {"type": "object"}
    return {"type": "string"}


def merge_properties(entity_schema: dict[str, Any], rows: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    properties: dict[str, dict[str, Any]] = {}
    properties.update(SYSTEM_FIELDS)
    properties.update(entity_schema.get("properties", {}))

    for row in rows:
        if not isinstance(row, dict):
            continue
        for key, value in row.items():
            if key not in properties:
                properties[key] = infer_schema_from_value(value)

    return properties


def to_db_value(value: Any) -> Any:
    if isinstance(value, bool):
        return 1 if value else 0
    if isinstance(value, (dict, list)):
        return json.dumps(value, ensure_ascii=False)
    return value


def read_entities() -> list[str]:
    entity_dir = ROOT / "erp-schema" / "entities"
    return sorted(path.stem for path in entity_dir.glob("*.jsonc"))


def read_rows(entity_name: str) -> list[dict[str, Any]]:
    data_path = ROOT / "dados-json" / f"{entity_name}.data.json"
    if not data_path.exists():
        return []
    data = load_json(data_path)
    if not isinstance(data, list):
        raise ValueError(f"{data_path} precisa conter uma lista JSON.")
    return [row for row in data if isinstance(row, dict)]


def read_entity_schema(entity_name: str) -> dict[str, Any]:
    schema_path = ROOT / "erp-schema" / "entities" / f"{entity_name}.jsonc"
    if not schema_path.exists():
        return {"name": entity_name, "type": "object", "properties": {}}
    schema = load_json(schema_path)
    if not isinstance(schema, dict):
        return {"name": entity_name, "type": "object", "properties": {}}
    return schema


def create_table_sql(table_name: str, properties: dict[str, dict[str, Any]]) -> str:
    columns = []
    for field_name, field_schema in properties.items():
        column_name = safe_name(field_name)
        sql_type = json_type_to_sql(field_schema)
        if field_name == "id":
            columns.append(f"{q(column_name)} TEXT PRIMARY KEY")
        else:
            columns.append(f"{q(column_name)} {sql_type}")
    return f"CREATE TABLE IF NOT EXISTS {q(table_name)} (\n  " + ",\n  ".join(columns) + "\n);"


def create_indexes_sql(table_name: str, properties: dict[str, dict[str, Any]]) -> list[str]:
    indexes: list[str] = []
    for field_name in properties:
        if field_name in {"created_date", "updated_date"} or field_name.endswith("_id") or field_name.endswith("_number"):
            index_name = safe_name(f"idx_{table_name}_{field_name}")
            indexes.append(
                f"CREATE INDEX IF NOT EXISTS {q(index_name)} ON {q(table_name)} ({q(safe_name(field_name))});"
            )
    return indexes


def insert_rows(conn: sqlite3.Connection, table_name: str, properties: dict[str, dict[str, Any]], rows: list[dict[str, Any]]) -> int:
    if not rows:
        return 0

    field_names = list(properties.keys())
    column_names = [safe_name(field) for field in field_names]
    placeholders = ", ".join("?" for _ in column_names)
    sql = f"INSERT OR REPLACE INTO {q(table_name)} ({', '.join(q(column) for column in column_names)}) VALUES ({placeholders})"

    values = []
    for row in rows:
        values.append([to_db_value(row.get(field)) for field in field_names])

    conn.executemany(sql, values)
    return len(values)


def write_schema_metadata(conn: sqlite3.Connection, manifest_rows: list[dict[str, Any]]) -> None:
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
    conn.executemany(
        """
        INSERT OR REPLACE INTO _meta_tables
        (table_name, source_schema, source_data, records_count, imported_count, generated_at)
        VALUES (:table_name, :source_schema, :source_data, :records_count, :imported_count, :generated_at)
        """,
        manifest_rows,
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Cria um banco SQLite a partir do backup local legado.")
    parser.add_argument("--output", default=str(DEFAULT_OUTPUT), help="Arquivo .sqlite de saida.")
    parser.add_argument("--schema-sql", default=str(DEFAULT_SCHEMA_SQL), help="Arquivo SQL do schema gerado.")
    parser.add_argument("--manifest", default=str(DEFAULT_MANIFEST), help="Manifesto JSON da geracao SQLite.")
    parser.add_argument("--keep-existing", action="store_true", help="Nao apagar o banco existente antes de recriar.")
    args = parser.parse_args()

    output = Path(args.output)
    schema_sql_path = Path(args.schema_sql)
    manifest_path = Path(args.manifest)
    generated_at = datetime.now(timezone.utc).isoformat()

    output.parent.mkdir(parents=True, exist_ok=True)
    schema_sql_path.parent.mkdir(parents=True, exist_ok=True)
    manifest_path.parent.mkdir(parents=True, exist_ok=True)

    if output.exists() and not args.keep_existing:
        output.unlink()

    conn = sqlite3.connect(output)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")

    schema_statements: list[str] = [
        "PRAGMA foreign_keys=ON;",
        "PRAGMA journal_mode=WAL;",
    ]
    manifest_tables: list[dict[str, Any]] = []
    schema_columns: list[dict[str, Any]] = []

    try:
        for entity_name in read_entities():
            table_name = safe_name(entity_name)
            entity_schema = read_entity_schema(entity_name)
            rows = read_rows(entity_name)
            properties = merge_properties(entity_schema, rows)

            create_sql = create_table_sql(table_name, properties)
            conn.execute(create_sql)
            schema_statements.append(create_sql)

            for index_sql in create_indexes_sql(table_name, properties):
                conn.execute(index_sql)
                schema_statements.append(index_sql)

            imported_count = insert_rows(conn, table_name, properties, rows)
            manifest_tables.append(
                {
                    "table_name": table_name,
                    "source_schema": f"erp-schema/entities/{entity_name}.jsonc",
                    "source_data": f"dados-json/{entity_name}.data.json",
                    "records_count": len(rows),
                    "imported_count": imported_count,
                    "generated_at": generated_at,
                }
            )

            for field_name, field_schema in properties.items():
                json_type = field_schema.get("type", "string")
                if isinstance(json_type, list):
                    json_type = ",".join(str(item) for item in json_type)
                schema_columns.append(
                    {
                        "table_name": table_name,
                        "column_name": safe_name(field_name),
                        "original_name": field_name,
                        "json_type": str(json_type),
                        "sqlite_type": json_type_to_sql(field_schema),
                        "description": field_schema.get("description", ""),
                    }
                )

        write_schema_metadata(conn, manifest_tables)
        conn.executemany(
            """
            INSERT OR REPLACE INTO _schema_columns
            (table_name, column_name, original_name, json_type, sqlite_type, description)
            VALUES (:table_name, :column_name, :original_name, :json_type, :sqlite_type, :description)
            """,
            schema_columns,
        )
        conn.commit()

        schema_sql_path.write_text("\n\n".join(schema_statements) + "\n", encoding="utf-8")
        manifest_path.write_text(
            json.dumps(
                {
                    "generated_at": generated_at,
                    "database_file": str(output.relative_to(ROOT)),
                    "schema_sql_file": str(schema_sql_path.relative_to(ROOT)),
                    "source": {
                        "entity_schemas": "erp-schema/entities/*.jsonc",
                        "data": "dados-json/*.data.json",
                        "backup_manifest": "manifesto-backup.json",
                    },
                    "tables_count": len(manifest_tables),
                    "records_count": sum(item["imported_count"] for item in manifest_tables),
                    "tables": manifest_tables,
                },
                ensure_ascii=False,
                indent=2,
            )
            + "\n",
            encoding="utf-8",
        )

        print(f"SQLite criado em: {output}")
        print(f"Schema SQL salvo em: {schema_sql_path}")
        print(f"Manifesto salvo em: {manifest_path}")
        print(f"Tabelas: {len(manifest_tables)}")
        print(f"Registros importados: {sum(item['imported_count'] for item in manifest_tables)}")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
