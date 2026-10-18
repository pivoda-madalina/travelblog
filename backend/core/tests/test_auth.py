import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from core.tests.factories import UserFactory

pytestmark = pytest.mark.django_db

ANONYMOUS = {"is_author": False, "username": None}


@pytest.fixture
def client():
    # Real browsers are held to the CSRF check, so the tests are too.
    return APIClient(enforce_csrf_checks=True)


def csrf_token(client: APIClient) -> str:
    response = client.get(reverse("auth-csrf"))
    assert response.status_code == 204
    return response.cookies["csrftoken"].value


def sign_in(client: APIClient, username: str, password: str):
    return client.post(
        reverse("auth-login"),
        {"username": username, "password": password},
        format="json",
        headers={"X-CSRFToken": csrf_token(client)},
    )


def test_csrf_endpoint_sets_the_cookie(client):
    assert csrf_token(client)


def test_me_for_anonymous_visitor(client):
    response = client.get(reverse("auth-me"))

    assert response.status_code == 200
    assert response.json() == ANONYMOUS


def test_me_for_signed_in_author(client):
    client.force_login(UserFactory(username="madalina"))

    response = client.get(reverse("auth-me"))

    assert response.json() == {"is_author": True, "username": "madalina"}


def test_sign_in_with_correct_credentials_starts_a_session(client):
    UserFactory(username="madalina")

    response = sign_in(client, "madalina", "password")

    assert response.status_code == 200
    assert response.json() == {"is_author": True, "username": "madalina"}
    assert client.get(reverse("auth-me")).json()["is_author"] is True


def test_sign_in_with_wrong_password_is_refused(client):
    UserFactory(username="madalina")

    response = sign_in(client, "madalina", "wrong")

    assert response.status_code == 400
    assert response.json() == {"non_field_errors": ["Wrong username or password."]}
    assert client.get(reverse("auth-me")).json() == ANONYMOUS


def test_sign_in_with_unknown_user_gives_the_same_message(client):
    response = sign_in(client, "nobody", "password")

    assert response.status_code == 400
    assert response.json() == {"non_field_errors": ["Wrong username or password."]}


def test_sign_in_with_inactive_user_is_refused(client):
    UserFactory(username="madalina", is_active=False)

    assert sign_in(client, "madalina", "password").status_code == 400


def test_sign_in_requires_both_fields(client):
    response = client.post(
        reverse("auth-login"), {}, format="json", headers={"X-CSRFToken": csrf_token(client)}
    )

    assert response.status_code == 400
    assert set(response.json()) == {"username", "password"}


def test_sign_in_without_csrf_token_is_refused(client):
    UserFactory(username="madalina")

    response = client.post(
        reverse("auth-login"), {"username": "madalina", "password": "password"}, format="json"
    )

    assert response.status_code == 403
    assert client.get(reverse("auth-me")).json() == ANONYMOUS


def test_sign_out_ends_the_session(client):
    UserFactory(username="madalina")
    sign_in(client, "madalina", "password")

    response = client.post(
        reverse("auth-logout"), headers={"X-CSRFToken": client.cookies["csrftoken"].value}
    )

    assert response.status_code == 204
    assert client.get(reverse("auth-me")).json() == ANONYMOUS


def test_sign_out_without_csrf_token_is_refused(client):
    client.force_login(UserFactory())

    assert client.post(reverse("auth-logout")).status_code == 403
    assert client.get(reverse("auth-me")).json()["is_author"] is True


def test_basic_authentication_is_not_accepted(client):
    UserFactory(username="madalina")
    client.credentials(HTTP_AUTHORIZATION="Basic bWFkYWxpbmE6cGFzc3dvcmQ=")

    assert client.get(reverse("auth-me")).json() == ANONYMOUS
