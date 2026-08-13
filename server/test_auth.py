from server.auth import constant_time_eq, generate_session_token, hash_password, verify_password


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
