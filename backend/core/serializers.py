import copy

from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers


class AuthorOnlyFieldsMixin(serializers.Serializer):
    """Leaves the fields in `Meta.author_only_fields` out of responses for visitors, for
    example a trip's planned budget (BR-14)."""

    def get_fields(self):
        fields = super().get_fields()
        request = self.context.get("request")
        if request is None or not request.user.is_authenticated:
            for name in getattr(self.Meta, "author_only_fields", ()):
                fields.pop(name, None)
        return fields


class ModelCleanMixin(serializers.ModelSerializer):
    """Runs the model's `clean()`, where business rules live, and returns its errors in the
    standard DRF format (architecture, Backend conventions)."""

    def validate(self, attrs):
        attrs = super().validate(attrs)
        # A copy, so a failed edit leaves the saved instance untouched.
        instance = copy.copy(self.instance) if self.instance else self.Meta.model()
        for field, value in attrs.items():
            setattr(instance, field, value)
        try:
            instance.clean()
        except DjangoValidationError as error:
            raise serializers.ValidationError(serializers.as_serializer_error(error)) from error
        return attrs
