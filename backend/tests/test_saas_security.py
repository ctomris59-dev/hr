from core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)


def test_password_is_hashed_and_verifiable():
    raw = "StrongDemoPassword!42"
    encoded = hash_password(raw)
    assert encoded != raw
    assert verify_password(raw, encoded) is True
    assert verify_password("wrong-password", encoded) is False


def test_access_token_contains_tenant_identity():
    token = create_access_token(
        user_id="user-1",
        tenant_id="tenant-1",
        role="CEO",
        token_version=1,
    )
    payload = decode_token(token, expected_type="access")
    assert payload["sub"] == "user-1"
    assert payload["tenant_id"] == "tenant-1"
    assert payload["role"] == "CEO"


def test_refresh_token_is_separate_type():
    token = create_refresh_token(
        user_id="user-1",
        tenant_id="tenant-1",
        role="IK",
        token_version=2,
    )
    payload = decode_token(token, expected_type="refresh")
    assert payload["type"] == "refresh"
    assert payload["token_version"] == 2
