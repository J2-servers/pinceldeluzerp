"""Smoke tests da API local. Sobe server/local_api.py como subprocesso
num banco e porta temporarios, sem tocar no banco real do projeto.

Rodar: pytest server/test_local_api.py -v
"""
from __future__ import annotations

import base64
import contextlib
import json
import os
import socket
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
ADMIN_PASSWORD = "test-admin-password"
BOOTSTRAP_EMAIL = "admin@teste.local"
BOOTSTRAP_PASSWORD = "senha-do-admin"


def free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]


@contextlib.contextmanager
def running_api_server(db_path, extra_env=None):
    port = free_port()
    env = dict(os.environ)
    env.update({
        "PINCEL_LUZ_DB": str(db_path),
        "PINCEL_LUZ_API_HOST": "127.0.0.1",
        "PINCEL_LUZ_API_PORT": str(port),
        "PINCEL_LUZ_ADMIN_PASSWORD": ADMIN_PASSWORD,
        "PINCEL_LUZ_API_TOKEN": "",
        "PINCEL_LUZ_ALLOWED_ORIGINS": "*",
    })
    env.update(extra_env or {})
    proc = subprocess.Popen(
        [sys.executable, str(ROOT / "server" / "local_api.py")],
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )
    base_url = f"http://127.0.0.1:{port}"
    deadline = time.time() + 10
    last_error: Exception | None = None
    try:
        while time.time() < deadline:
            if proc.poll() is not None:
                output = proc.stdout.read() if proc.stdout else ""
                raise RuntimeError(f"API encerrou antes de ficar saudavel:\n{output}")
            try:
                urllib.request.urlopen(f"{base_url}/api/local/health", timeout=1)
                break
            except Exception as error:  # noqa: BLE001 - so estamos esperando o servidor subir
                last_error = error
                time.sleep(0.2)
        else:
            raise RuntimeError(f"API nao ficou saudavel em 10s: {last_error}")
        yield base_url
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            proc.kill()
            proc.wait(timeout=5)


@pytest.fixture(scope="session")
def api_server(tmp_path_factory):
    work_dir = tmp_path_factory.mktemp("db")
    db_path = work_dir / "test.sqlite"
    extra_env = {
        "PINCEL_LUZ_UPLOAD_DIR": str(work_dir / "uploads"),
        "PINCEL_LUZ_BACKUP_DIR": str(work_dir / "backups"),
    }
    with running_api_server(db_path, extra_env) as base_url:
        yield base_url


def call(base_url, method, path, body=None, headers=None, token=None, expect_status=None):
    url = f"{base_url}{path}"
    data = json.dumps(body).encode("utf-8") if body is not None else None
    request_headers = {"Content-Type": "application/json", **(headers or {})}
    if token:
        request_headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, data=data, method=method, headers=request_headers)
    try:
        with urllib.request.urlopen(req, timeout=5) as response:
            status = response.status
            raw = response.read().decode("utf-8")
    except urllib.error.HTTPError as error:
        status = error.code
        raw = error.read().decode("utf-8")
    payload = json.loads(raw) if raw else None
    if expect_status is not None:
        assert status == expect_status, f"{method} {path} -> {status} (esperado {expect_status}): {payload}"
    return status, payload


@pytest.fixture(scope="session")
def admin_session(api_server):
    """Faz o bootstrap do primeiro admin uma unica vez para a sessao de testes."""
    _, payload = call(
        api_server, "POST", "/api/local/auth/bootstrap",
        {"name": "Admin de Teste", "email": BOOTSTRAP_EMAIL, "password": BOOTSTRAP_PASSWORD},
        expect_status=201,
    )
    return payload["data"]


def test_health(api_server):
    _, payload = call(api_server, "GET", "/api/local/health", expect_status=200)
    assert payload["ok"] is True
    assert "tables" in payload


def test_entities_require_session(api_server):
    call(api_server, "GET", "/api/local/entities/Client", expect_status=401)
    call(api_server, "POST", "/api/local/entities/Client", {"name": "x"}, expect_status=401)


def test_unknown_route_is_404_when_authenticated(api_server, admin_session):
    call(api_server, "GET", "/api/local/not-a-real-route", token=admin_session["token"], expect_status=404)


def test_unknown_route_is_401_when_not_authenticated(api_server):
    call(api_server, "GET", "/api/local/not-a-real-route", expect_status=401)


def test_entity_crud_roundtrip(api_server, admin_session):
    token = admin_session["token"]
    _, created = call(
        api_server, "POST", "/api/local/entities/Client",
        {"name": "Cliente Teste", "email": "cliente@teste.local"},
        token=token, expect_status=201,
    )
    client_id = created["data"]["id"]
    assert created["data"]["name"] == "Cliente Teste"
    assert created["data"]["created_date"]

    _, listed = call(api_server, "GET", "/api/local/entities/Client", token=token, expect_status=200)
    assert any(item["id"] == client_id for item in listed["data"])

    _, updated = call(
        api_server, "PATCH", f"/api/local/entities/Client/{client_id}",
        {"name": "Cliente Renomeado"},
        token=token, expect_status=200,
    )
    assert updated["data"]["name"] == "Cliente Renomeado"

    call(api_server, "DELETE", f"/api/local/entities/Client/{client_id}", token=token, expect_status=200)
    _, listed_after = call(api_server, "GET", "/api/local/entities/Client", token=token, expect_status=200)
    assert not any(item["id"] == client_id for item in listed_after["data"])


def test_update_missing_record_is_404(api_server, admin_session):
    call(
        api_server, "PATCH", "/api/local/entities/Client/does-not-exist",
        {"name": "x"},
        token=admin_session["token"], expect_status=404,
    )


def test_filter_sort_limit(api_server, admin_session):
    token = admin_session["token"]
    for i in range(5):
        call(
            api_server, "POST", "/api/local/entities/Goal",
            {"title": f"Meta {i}", "target_value": i * 10, "rank_marker": "smoke-test"},
            token=token, expect_status=201,
        )

    _, sorted_desc = call(api_server, "GET", "/api/local/entities/Goal?sort=-target_value&limit=2", token=token, expect_status=200)
    assert len(sorted_desc["data"]) == 2
    values = [item["target_value"] for item in sorted_desc["data"]]
    assert values == sorted(values, reverse=True)

    query = urllib.parse.urlencode({"filter": json.dumps({"target_value": 20})})
    _, filtered = call(api_server, "GET", f"/api/local/entities/Goal?{query}", token=token, expect_status=200)
    assert all(item["target_value"] == 20 for item in filtered["data"])


def test_filter_operators_and_total_count(api_server, admin_session):
    token = admin_session["token"]
    marker = "filter-ops-test"
    for i in range(5):
        call(
            api_server, "POST", "/api/local/entities/Goal",
            {"title": f"Meta Numero {i} com Acentuação", "target_value": i * 10, "rank_marker": marker},
            token=token, expect_status=201,
        )
    base_filter = {"rank_marker": marker}

    def query_goals(extra_filter):
        q = urllib.parse.urlencode({"filter": json.dumps({**base_filter, **extra_filter})})
        return call(api_server, "GET", f"/api/local/entities/Goal?{q}", token=token, expect_status=200)[1]

    gt = query_goals({"target_value": {"$gt": 20}})
    assert sorted(item["target_value"] for item in gt["data"]) == [30, 40]

    gte = query_goals({"target_value": {"$gte": 20}})
    assert sorted(item["target_value"] for item in gte["data"]) == [20, 30, 40]

    lt = query_goals({"target_value": {"$lt": 20}})
    assert sorted(item["target_value"] for item in lt["data"]) == [0, 10]

    ne = query_goals({"target_value": {"$ne": 20}})
    assert 20 not in [item["target_value"] for item in ne["data"]]
    assert len(ne["data"]) == 4

    in_filter = query_goals({"target_value": {"$in": [0, 40]}})
    assert sorted(item["target_value"] for item in in_filter["data"]) == [0, 40]

    nin_filter = query_goals({"target_value": {"$nin": [0, 40]}})
    assert sorted(item["target_value"] for item in nin_filter["data"]) == [10, 20, 30]

    contains_accented = query_goals({"title": {"$contains": "ACENTUAÇÃO"}})
    assert len(contains_accented["data"]) == 5

    contains_partial = query_goals({"title": {"$contains": "numero 3"}})
    assert len(contains_partial["data"]) == 1

    nonexistent_field = query_goals({"campo_que_nunca_existiu_xyz": "qualquer"})
    assert nonexistent_field["data"] == []

    _, totaled = call(
        api_server, "GET",
        f"/api/local/entities/Goal?{urllib.parse.urlencode({'filter': json.dumps(base_filter)})}&limit=2",
        token=token, expect_status=200,
    )
    assert len(totaled["data"]) == 2
    assert totaled["total"] == 5


def test_sort_is_numeric_not_lexicographic(api_server, admin_session):
    token = admin_session["token"]
    marker = "sort-numeric-test"
    for value in [9, 10, 2, 100]:
        call(
            api_server, "POST", "/api/local/entities/Goal",
            {"title": f"Sort {value}", "target_value": value, "rank_marker": marker},
            token=token, expect_status=201,
        )
    q = urllib.parse.urlencode({"filter": json.dumps({"rank_marker": marker})})
    _, result = call(api_server, "GET", f"/api/local/entities/Goal?{q}&sort=target_value", token=token, expect_status=200)
    values = [item["target_value"] for item in result["data"]]
    assert values == [2, 9, 10, 100]  # numerico: se fosse string, seria [10, 100, 2, 9]


# ── Autenticacao ─────────────────────────────────────────────────


def test_bootstrap_admin_created_first_user(admin_session):
    assert admin_session["user"]["email"] == BOOTSTRAP_EMAIL
    assert admin_session["user"]["role"] == "admin"
    assert "password_hash" not in admin_session["user"]
    assert admin_session["token"]


def test_bootstrap_fails_once_a_user_exists(api_server, admin_session):
    call(
        api_server, "POST", "/api/local/auth/bootstrap",
        {"name": "Outro", "email": "outro@teste.local", "password": "qualquer1"},
        expect_status=403,
    )


def test_login_success(api_server, admin_session):
    _, payload = call(
        api_server, "POST", "/api/local/auth/login",
        {"email": BOOTSTRAP_EMAIL, "password": BOOTSTRAP_PASSWORD},
        expect_status=200,
    )
    assert payload["data"]["token"]
    assert payload["data"]["user"]["email"] == BOOTSTRAP_EMAIL
    assert "password_hash" not in payload["data"]["user"]


def test_login_wrong_password_fails(api_server, admin_session):
    call(
        api_server, "POST", "/api/local/auth/login",
        {"email": BOOTSTRAP_EMAIL, "password": "senha-errada"},
        expect_status=401,
    )


def test_me_reflects_logged_in_user(api_server, admin_session):
    _, payload = call(api_server, "GET", "/api/local/auth/me", token=admin_session["token"], expect_status=200)
    assert payload["data"]["email"] == BOOTSTRAP_EMAIL
    assert "password_hash" not in payload["data"]


def test_me_without_token_is_401(api_server):
    call(api_server, "GET", "/api/local/auth/me", expect_status=401)


def test_logout_invalidates_token(api_server):
    _, login_payload = call(
        api_server, "POST", "/api/local/auth/login",
        {"email": BOOTSTRAP_EMAIL, "password": BOOTSTRAP_PASSWORD},
        expect_status=200,
    )
    token = login_payload["data"]["token"]
    call(api_server, "GET", "/api/local/auth/me", token=token, expect_status=200)
    call(api_server, "POST", "/api/local/auth/logout", {"token": token}, expect_status=200)
    call(api_server, "GET", "/api/local/auth/me", token=token, expect_status=401)


def test_user_list_never_leaks_password_hash(api_server, admin_session):
    _, listed = call(api_server, "GET", "/api/local/entities/User", token=admin_session["token"], expect_status=200)
    assert listed["data"]
    assert all("password_hash" not in row for row in listed["data"])


def test_non_admin_cannot_create_user(api_server, admin_session):
    token = admin_session["token"]
    _, created = call(
        api_server, "POST", "/api/local/entities/User",
        {"name": "Leitor", "email": "leitor@teste.local", "password": "senha123", "role": "leitura"},
        token=token, expect_status=201,
    )
    reader_id = created["data"]["id"]
    assert "password_hash" not in created["data"]

    _, reader_login = call(
        api_server, "POST", "/api/local/auth/login",
        {"email": "leitor@teste.local", "password": "senha123"},
        expect_status=200,
    )
    reader_token = reader_login["data"]["token"]

    call(
        api_server, "POST", "/api/local/entities/User",
        {"name": "Outro", "email": "outro2@teste.local", "password": "senha123", "role": "leitura"},
        token=reader_token, expect_status=403,
    )
    call(api_server, "DELETE", f"/api/local/entities/User/{reader_id}", token=token, expect_status=200)


def test_admin_cannot_delete_last_admin(api_server, admin_session):
    call(
        api_server, "DELETE", f"/api/local/entities/User/{admin_session['user']['id']}",
        token=admin_session["token"], expect_status=400,
    )


def test_change_password_flow(api_server):
    _, login_payload = call(
        api_server, "POST", "/api/local/auth/login",
        {"email": BOOTSTRAP_EMAIL, "password": BOOTSTRAP_PASSWORD},
        expect_status=200,
    )
    token = login_payload["data"]["token"]

    call(
        api_server, "POST", "/api/local/auth/change-password",
        {"currentPassword": "senha-errada", "newPassword": "nova-senha-1"},
        token=token, expect_status=401,
    )
    call(
        api_server, "POST", "/api/local/auth/change-password",
        {"currentPassword": BOOTSTRAP_PASSWORD, "newPassword": "nova-senha-1"},
        token=token, expect_status=200,
    )
    call(
        api_server, "POST", "/api/local/auth/login",
        {"email": BOOTSTRAP_EMAIL, "password": "nova-senha-1"},
        expect_status=200,
    )
    # devolve a senha original para nao afetar outros testes que dependem dela
    _, relogin = call(
        api_server, "POST", "/api/local/auth/login",
        {"email": BOOTSTRAP_EMAIL, "password": "nova-senha-1"},
        expect_status=200,
    )
    call(
        api_server, "POST", "/api/local/auth/change-password",
        {"currentPassword": "nova-senha-1", "newPassword": BOOTSTRAP_PASSWORD},
        token=relogin["data"]["token"], expect_status=200,
    )


# ── SSRF (funcoes que fazem requisicoes de saida com host vindo do cliente) ──


@pytest.mark.parametrize("private_url", [
    "http://127.0.0.1:9999",
    "http://169.254.169.254/latest/meta-data",
    "http://192.168.1.1",
    "http://10.0.0.5",
    "http://0.0.0.0",
])
def test_whatsapp_function_rejects_private_host(api_server, admin_session, private_url):
    _, payload = call(
        api_server, "POST", "/api/local/functions",
        {"name": "sendWhatsAppMessage", "payload": {
            "apiUrl": private_url, "apiKey": "x", "instanceName": "x",
            "phone": "5511999999999", "message": "teste",
        }},
        token=admin_session["token"], expect_status=400,
    )
    assert "interna" in payload["error"].lower() or "invalid" in payload["error"].lower()


def test_whatsapp_qr_connection_rejects_private_host(api_server, admin_session):
    call(
        api_server, "POST", "/api/local/functions",
        {"name": "evolutionQrConnection", "payload": {
            "action": "status", "apiUrl": "http://localhost:9999", "apiKey": "x", "instanceName": "x",
        }},
        token=admin_session["token"], expect_status=400,
    )


# ── Upload (extensao permitida, tamanho, disposicao de download) ──


def test_upload_rejects_disallowed_extension(api_server, admin_session):
    _, payload = call(
        api_server, "POST", "/api/local/uploads",
        {"name": "malicioso.html", "type": "text/html", "base64": base64.b64encode(b"<script>alert(1)</script>").decode()},
        token=admin_session["token"], expect_status=400,
    )
    assert "nao permitido" in payload["error"].lower()


def test_upload_rejects_oversized_file(api_server, admin_session):
    huge = base64.b64encode(b"a" * (16 * 1024 * 1024)).decode()
    call(
        api_server, "POST", "/api/local/uploads",
        {"name": "grande.png", "type": "image/png", "base64": huge},
        token=admin_session["token"], expect_status=400,
    )


def test_upload_accepted_file_is_served_as_attachment(api_server, admin_session):
    content = base64.b64encode(b"fake-png-bytes").decode()
    _, created = call(
        api_server, "POST", "/api/local/uploads",
        {"name": "logo.png", "type": "image/png", "base64": content},
        token=admin_session["token"], expect_status=200,
    )
    file_url = created["file_url"]
    req = urllib.request.Request(f"{api_server}{file_url}")
    with urllib.request.urlopen(req, timeout=5) as response:
        disposition = response.headers.get("Content-Disposition", "")
    assert "attachment" in disposition.lower()


# ── Unicidade de e-mail de usuario ──


def test_create_user_with_duplicate_email_is_rejected(api_server, admin_session):
    token = admin_session["token"]
    call(
        api_server, "POST", "/api/local/entities/User",
        {"name": "Duplicado 1", "email": "duplicado@teste.local", "password": "senha123", "role": "leitura"},
        token=token, expect_status=201,
    )
    _, payload = call(
        api_server, "POST", "/api/local/entities/User",
        {"name": "Duplicado 2", "email": "duplicado@teste.local", "password": "outrasenha", "role": "leitura"},
        token=token, expect_status=400,
    )
    assert "ja existe" in payload["error"].lower()


# ── Allowlist de entidades ──


def test_unknown_entity_is_rejected_on_list_and_create(api_server, admin_session):
    token = admin_session["token"]
    _, list_payload = call(
        api_server, "GET", "/api/local/entities/EntidadeInventadaXYZ",
        token=token, expect_status=400,
    )
    assert "desconhecida" in list_payload["error"].lower()

    _, create_payload = call(
        api_server, "POST", "/api/local/entities/EntidadeInventadaXYZ",
        {"foo": "bar"}, token=token, expect_status=400,
    )
    assert "desconhecida" in create_payload["error"].lower()


def test_known_entities_without_schema_file_are_allowed(api_server, admin_session):
    call(
        api_server, "POST", "/api/local/entities/PricingSettings",
        {"note": "smoke"}, token=admin_session["token"], expect_status=201,
    )


# ── Backup automatico agendado ──


def test_backup_scheduler_creates_and_prunes_backups(tmp_path):
    db_path = tmp_path / "scheduler-test.sqlite"
    extra_env = {
        "PINCEL_LUZ_BACKUP_DIR": str(tmp_path / "backups"),
        "PINCEL_LUZ_BACKUP_INTERVAL_SECONDS": "1",
        "PINCEL_LUZ_BACKUP_CHECK_SECONDS": "1",
        "PINCEL_LUZ_BACKUP_RETENTION_COUNT": "2",
    }
    with running_api_server(db_path, extra_env) as base_url:
        _, bootstrap = call(
            base_url, "POST", "/api/local/auth/bootstrap",
            {"name": "Admin", "email": "admin@scheduler.local", "password": "senha-scheduler"},
            expect_status=201,
        )
        token = bootstrap["data"]["token"]

        # A poda roda no mesmo ciclo da criacao (nunca deixa passar de "retencao"
        # backups simultaneos), entao o teste nao pode esperar "ver 3 depois cair
        # pra 2" - isso e uma corrida que quase nunca e observavel via polling.
        # Em vez disso: confirma que backups distintos continuam sendo criados
        # ao longo do tempo (nomes unicos por timestamp) E que a contagem
        # observada nunca passa do limite de retencao configurado.
        seen_filenames = set()
        max_observed = 0
        deadline = time.time() + 40
        while time.time() < deadline and len(seen_filenames) < 4:
            _, listed = call(
                base_url, "POST", "/api/local/functions",
                {"name": "listSqliteBackups", "payload": {}},
                token=token, expect_status=200,
            )
            scheduled = [b for b in listed["data"]["backups"] if b["reason"] == "scheduled-daily"]
            max_observed = max(max_observed, len(scheduled))
            seen_filenames.update(b["file_name"] for b in scheduled)
            time.sleep(1)

        assert len(seen_filenames) >= 4, f"esperava pelo menos 4 backups agendados distintos ao longo do tempo, vieram {len(seen_filenames)}"
        assert max_observed <= 2, f"retencao deveria manter no maximo 2 backups agendados simultaneos, chegou a {max_observed}"


# ── Estoque: adjustStock / adjustStockBulk ──


def create_product(api_server, token, name, quantity=0, cost_price=0, **extra):
    body = {"name": name, "category": "insumos", "quantity": quantity, "cost_price": cost_price, **extra}
    _, created = call(api_server, "POST", "/api/local/entities/Product", body, token=token, expect_status=201)
    return created["data"]


def call_function(api_server, token, name, payload, expect_status=200):
    return call(
        api_server, "POST", "/api/local/functions",
        {"name": name, "payload": payload},
        token=token, expect_status=expect_status,
    )


def fetch_product(api_server, token, product_id):
    query = urllib.parse.urlencode({"filter": json.dumps({"id": product_id})})
    _, listed = call(api_server, "GET", f"/api/local/entities/Product?{query}", token=token, expect_status=200)
    assert len(listed["data"]) == 1, f"produto {product_id} nao encontrado na listagem"
    return listed["data"][0]


def list_movements(api_server, token, product_id):
    query = urllib.parse.urlencode({"filter": json.dumps({"product_id": product_id})})
    _, listed = call(api_server, "GET", f"/api/local/entities/StockMovement?{query}", token=token, expect_status=200)
    return listed["data"]


def test_stock_functions_require_session(api_server):
    call(api_server, "POST", "/api/local/functions", {"name": "adjustStock", "payload": {}}, expect_status=401)
    call(api_server, "POST", "/api/local/functions", {"name": "adjustStockBulk", "payload": {}}, expect_status=401)


def test_adjust_stock_entrada_updates_weighted_average_cost(api_server, admin_session):
    token = admin_session["token"]
    product = create_product(api_server, token, "Chapa PS Cristal", quantity=10, cost_price=10)
    _, payload = call_function(api_server, token, "adjustStock", {
        "product_id": product["id"], "delta": 10, "movement_type": "entrada", "unit_cost": 20,
        "reference_id": "Compra_teste_1",
    })
    data = payload["data"]
    assert data["product"]["quantity"] == 20
    assert data["product"]["cost_price"] == 15  # (10*10 + 10*20) / 20
    movement = data["movement"]
    assert movement["type"] == "entrada"
    assert movement["quantity"] == 10
    assert movement["unit_cost"] == 20
    assert movement["previous_cost"] == 10
    assert movement["new_cost"] == 15
    assert movement["reference_id"] == "Compra_teste_1"
    stored = fetch_product(api_server, token, product["id"])
    assert stored["quantity"] == 20
    assert stored["cost_price"] == 15


def test_adjust_stock_saida_beyond_available_is_rejected(api_server, admin_session):
    token = admin_session["token"]
    product = create_product(api_server, token, "Vinil Recorte Preto", quantity=5, cost_price=8)
    _, payload = call_function(api_server, token, "adjustStock", {
        "product_id": product["id"], "delta": -8, "movement_type": "saida",
    }, expect_status=400)
    assert "insuficiente" in payload["error"].lower()
    assert fetch_product(api_server, token, product["id"])["quantity"] == 5  # nada aplicado
    assert list_movements(api_server, token, product["id"]) == []


@pytest.mark.parametrize("movement_type", ["ajuste", "devolucao"])
def test_adjust_stock_reason_required_for_ajuste_and_devolucao(api_server, admin_session, movement_type):
    token = admin_session["token"]
    product = create_product(api_server, token, f"Produto Reason {movement_type}", quantity=10)
    _, payload = call_function(api_server, token, "adjustStock", {
        "product_id": product["id"], "delta": 1, "movement_type": movement_type,
    }, expect_status=400)
    assert "motivo" in payload["error"].lower()
    call_function(api_server, token, "adjustStock", {
        "product_id": product["id"], "delta": 1, "movement_type": movement_type, "reason": "contagem fisica",
    }, expect_status=200)


def test_adjust_stock_movement_records_previous_and_new_values(api_server, admin_session):
    token = admin_session["token"]
    product = create_product(api_server, token, "Fita Dupla Face", quantity=7, cost_price=3)
    _, payload = call_function(api_server, token, "adjustStock", {
        "product_id": product["id"], "delta": -2, "movement_type": "saida",
        "reference_id": "SalesOrder_teste_123", "user_name": "Operador Teste",
    })
    movement = payload["data"]["movement"]
    assert movement["previous_quantity"] == 7
    assert movement["new_quantity"] == 5
    assert movement["previous_cost"] == 3
    assert "new_cost" not in movement  # saida nao mexe no custo medio
    assert movement["reference_id"] == "SalesOrder_teste_123"
    assert movement["user_name"] == "Operador Teste"

    stored_movements = list_movements(api_server, token, product["id"])
    assert len(stored_movements) == 1
    stored = stored_movements[0]
    assert stored["id"] == movement["id"]
    assert stored["type"] == "saida"
    assert stored["quantity"] == 2
    assert stored["previous_quantity"] == 7
    assert stored["new_quantity"] == 5


def test_adjust_stock_unknown_product_is_rejected(api_server, admin_session):
    _, payload = call_function(api_server, admin_session["token"], "adjustStock", {
        "product_id": "Product_inexistente_xyz", "delta": 1, "movement_type": "entrada",
    }, expect_status=400)
    assert "nao encontrado" in payload["error"].lower()


def test_adjust_stock_bulk_applies_nothing_when_one_item_fails(api_server, admin_session):
    token = admin_session["token"]
    ok_product = create_product(api_server, token, "Bulk OK Lona", quantity=10, cost_price=5)
    poor_product = create_product(api_server, token, "Bulk Sem Saldo Ima", quantity=4, cost_price=2)

    # item com saldo insuficiente no meio da lista: nada e aplicado
    _, payload = call_function(api_server, token, "adjustStockBulk", {
        "movement_type": "saida",
        "items": [
            {"product_id": ok_product["id"], "delta": -2},
            {"product_id": poor_product["id"], "delta": -10},
        ],
    }, expect_status=400)
    assert "insuficiente" in payload["error"].lower()
    assert "Bulk Sem Saldo Ima" in payload["error"]  # nome do produto no erro

    # item com produto inexistente no meio da lista: idem
    _, payload = call_function(api_server, token, "adjustStockBulk", {
        "movement_type": "saida",
        "items": [
            {"product_id": ok_product["id"], "delta": -2},
            {"product_id": "Product_que_nao_existe", "delta": -1},
            {"product_id": poor_product["id"], "delta": -1},
        ],
    }, expect_status=400)
    assert "nao encontrado" in payload["error"].lower()

    assert fetch_product(api_server, token, ok_product["id"])["quantity"] == 10
    assert fetch_product(api_server, token, poor_product["id"])["quantity"] == 4
    assert list_movements(api_server, token, ok_product["id"]) == []
    assert list_movements(api_server, token, poor_product["id"]) == []


def test_adjust_stock_bulk_merges_repeated_product(api_server, admin_session):
    token = admin_session["token"]
    product = create_product(api_server, token, "Bulk Repetido Acrilico", quantity=2, cost_price=10)
    _, payload = call_function(api_server, token, "adjustStockBulk", {
        "movement_type": "entrada",
        "items": [
            {"product_id": product["id"], "delta": 3, "unit_cost": 20},
            {"product_id": product["id"], "delta": 5, "unit_cost": 20},
        ],
    })
    data = payload["data"]
    assert len(data["products"]) == 1
    assert len(data["movements"]) == 1
    assert data["products"][0]["quantity"] == 10  # 2 + (3+5)
    assert data["products"][0]["cost_price"] == 18  # (2*10 + 8*20) / 10
    movement = data["movements"][0]
    assert movement["quantity"] == 8
    assert movement["previous_quantity"] == 2
    assert movement["new_quantity"] == 10
    stored = fetch_product(api_server, token, product["id"])
    assert stored["quantity"] == 10
    assert stored["cost_price"] == 18
    assert len(list_movements(api_server, token, product["id"])) == 1


@pytest.mark.parametrize("initial_quantity", [0, -4])
def test_adjust_stock_entrada_on_non_positive_stock_assumes_unit_cost(api_server, admin_session, initial_quantity):
    token = admin_session["token"]
    product = create_product(
        api_server, token, f"Produto Custo Base {initial_quantity}",
        quantity=initial_quantity, cost_price=7,
    )
    _, payload = call_function(api_server, token, "adjustStock", {
        "product_id": product["id"], "delta": 10, "movement_type": "entrada", "unit_cost": 12.5,
    })
    data = payload["data"]
    assert data["product"]["quantity"] == initial_quantity + 10
    assert data["product"]["cost_price"] == 12.5  # ignora o custo antigo de estoque zerado/negativo
    stored = fetch_product(api_server, token, product["id"])
    assert stored["cost_price"] == 12.5
