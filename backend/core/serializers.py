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
