"""Teste unitario direto do mapeamento de excecao -> status HTTP
(local_api.status_for_error). Nao sobe servidor nem toca no banco real.

Isto cobre a garantia de que erros inesperados (nao ValueError/PermissionError/
ForbiddenError) caem no branch 500 generico em do_GET/do_POST/do_PATCH/do_DELETE,
que manda o traceback para stderr e devolve so uma mensagem generica pro
cliente -- nunca o texto real da excecao. Ver server/local_api.py."""
from __future__ import annotations

import sys
from pathlib import Path

SERVER_DIR = Path(__file__).resolve().parent
if str(SERVER_DIR) not in sys.path:
    sys.path.insert(0, str(SERVER_DIR))

import local_api  # noqa: E402 - precisa vir depois do sys.path.insert


def test_forbidden_error_maps_to_403():
    assert local_api.status_for_error(local_api.ForbiddenError("nao permitido")) == 403


def test_permission_error_maps_to_401():
    assert local_api.status_for_error(PermissionError("sem permissao")) == 401


def test_value_error_maps_to_400():
    assert local_api.status_for_error(ValueError("entrada invalida")) == 400


def test_value_error_subclasses_also_map_to_400():
    # json.JSONDecodeError e uma subclasse de ValueError; corpo/filtro JSON
    # malformado deve virar 400, nao 500.
    import json
    try:
        json.loads("not-json")
    except json.JSONDecodeError as error:
        assert local_api.status_for_error(error) == 400
    else:
        raise AssertionError("json.loads deveria ter levantado JSONDecodeError")


def test_unexpected_exception_types_map_to_generic_500():
    # Qualquer excecao que nao seja um dos tipos conhecidos (erro de
    # programacao, KeyError, TypeError, RuntimeError...) precisa cair no
    # fallback 500 -- e do_GET/do_POST/do_PATCH/do_DELETE so mandam uma
    # mensagem generica pro cliente nesse caso (o texto real vai so pro
    # traceback em stderr).
    for error in (KeyError("campo"), TypeError("tipo errado"), RuntimeError("bug interno")):
        assert local_api.status_for_error(error) == 500
