"""Smaller copies of photos for galleries, so pages load quickly (US-08)."""

import io
from pathlib import PurePosixPath

from django.core.files.base import ContentFile
from PIL import Image, ImageOps

# The longest side of a thumbnail: sharp in a five-per-row grid on a wide screen.
THUMBNAIL_SIZE = 480


def make_thumbnail(image_file) -> ContentFile:
    """A JPEG of at most THUMBNAIL_SIZE pixels on its longest side, turned upright from the
    camera's orientation tag, named after the original."""
    with Image.open(image_file) as image:
        thumbnail = ImageOps.exif_transpose(image).convert("RGB")
    image_file.seek(0)
    thumbnail.thumbnail((THUMBNAIL_SIZE, THUMBNAIL_SIZE))
    buffer = io.BytesIO()
    thumbnail.save(buffer, format="JPEG", quality=85)
    return ContentFile(buffer.getvalue(), name=PurePosixPath(image_file.name).name)
