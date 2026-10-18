import runpy
from pathlib import Path

import pytest
from django.core.exceptions import ImproperlyConfigured

SETTINGS_FILE = Path(__file__).resolve().parents[2] / "config" / "settings.py"


def load_settings() -> dict:
    """Runs settings.py afresh, without touching the settings Django already loaded."""
    return runpy.run_path(str(SETTINGS_FILE))


def test_secret_key_is_required_when_debug_is_off(monkeypatch):
    monkeypatch.setenv("DJANGO_DEBUG", "false")
    monkeypatch.delenv("DJANGO_SECRET_KEY", raising=False)

    with pytest.raises(ImproperlyConfigured):
        load_settings()


def test_secret_key_from_environment_is_used(monkeypatch):
    monkeypatch.setenv("DJANGO_DEBUG", "false")
    monkeypatch.setenv("DJANGO_SECRET_KEY", "a-real-secret")

    assert load_settings()["SECRET_KEY"] == "a-real-secret"


def test_debug_mode_falls_back_to_development_key(monkeypatch):
    monkeypatch.setenv("DJANGO_DEBUG", "true")
    monkeypatch.delenv("DJANGO_SECRET_KEY", raising=False)

    assert load_settings()["SECRET_KEY"].startswith("django-insecure-")
