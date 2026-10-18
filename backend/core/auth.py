"""Sign-in, sign-out and current-user endpoints for the single author (ADR 0002)."""

from django.contrib.auth import authenticate, login, logout
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework import serializers, status
from rest_framework.authentication import SessionAuthentication
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response

WRONG_CREDENTIALS = "Wrong username or password."


class SignInSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(trim_whitespace=False)

    def validate(self, attrs):
        user = authenticate(
            self.context["request"], username=attrs["username"], password=attrs["password"]
        )
        if user is None:
            raise serializers.ValidationError(WRONG_CREDENTIALS)
        attrs["user"] = user
        return attrs


def current_user(request: Request) -> dict:
    """Anyone who is signed in is the author; everyone else is a visitor."""
    user = request.user
    if not user.is_authenticated:
        return {"is_author": False, "username": None}
    return {"is_author": True, "username": user.get_username()}


@api_view(["GET"])
@permission_classes([AllowAny])
@ensure_csrf_cookie
def csrf(request: Request) -> Response:
    """Sets the `csrftoken` cookie, so the frontend can send it with the sign-in request."""
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["POST"])
@permission_classes([AllowAny])
def sign_in(request: Request) -> Response:
    # DRF only checks CSRF for signed-in users; checking it here as well stops login CSRF.
    SessionAuthentication().enforce_csrf(request)
    serializer = SignInSerializer(data=request.data, context={"request": request})
    serializer.is_valid(raise_exception=True)
    login(request, serializer.validated_data["user"])
    return Response(current_user(request))


@api_view(["POST"])
@permission_classes([AllowAny])
def sign_out(request: Request) -> Response:
    logout(request)
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["GET"])
@permission_classes([AllowAny])
def me(request: Request) -> Response:
    return Response(current_user(request))
