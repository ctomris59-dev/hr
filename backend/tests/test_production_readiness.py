from core.config import Settings, get_settings


def test_production_config_fails_closed_with_demo_defaults():
    settings = Settings(ENVIRONMENT="production", APP_ENV="production")
    issues = settings.production_issues
    assert "DATA_MODE must be database" in issues
    assert "SAAS_AUTH_ENABLED must be true" in issues
    assert "DATABASE_URL is required" in issues
    assert any("SECRET_KEY" in issue for issue in issues)
    assert any("ALLOWED_HOSTS" in issue for issue in issues)


def test_production_config_accepts_explicit_secure_saas_values():
    settings = Settings(
        ENVIRONMENT="production",
        APP_ENV="production",
        DEBUG=False,
        DATA_MODE="database",
        SAAS_AUTH_ENABLED=True,
        DATABASE_URL="postgresql://futurehr:secret@db.example.internal:5432/futurehr",
        SECRET_KEY="x" * 64,
        ALLOWED_HOSTS=["api.futurehr.example"],
        CORS_ORIGINS=["https://app.futurehr.example"],
        ALLOW_LEGACY_API_IN_SAAS=False,
    )
    assert settings.production_issues == []
    assert settings.secure_auth_ready is True


def test_legacy_api_is_blocked_when_saas_auth_is_enabled(client):
    settings = get_settings()
    previous = settings.SAAS_AUTH_ENABLED
    previous_allow = settings.ALLOW_LEGACY_API_IN_SAAS
    try:
        settings.SAAS_AUTH_ENABLED = True
        settings.ALLOW_LEGACY_API_IN_SAAS = False
        response = client.get("/api/org-chart")
        assert response.status_code == 410
        payload = response.json()
        assert "legacy" in payload["detail"].lower()
    finally:
        settings.SAAS_AUTH_ENABLED = previous
        settings.ALLOW_LEGACY_API_IN_SAAS = previous_allow
