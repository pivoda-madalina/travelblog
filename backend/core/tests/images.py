import io

from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image


def image_upload(name: str = "cover.jpg", image_format: str = "JPEG") -> SimpleUploadedFile:
    """A small real image, as the browser would upload it."""
    buffer = io.BytesIO()
    Image.new("RGB", (40, 30), "teal").save(buffer, format=image_format)
    content_type = f"image/{image_format.lower()}"
    return SimpleUploadedFile(name, buffer.getvalue(), content_type=content_type)
