from django.core.exceptions import ValidationError
from PIL import Image, UnidentifiedImageError

# The proposed answer to #26, used until the owner decides otherwise.
MAX_PHOTO_BYTES = 10 * 1024 * 1024
MAX_PHOTOS_PER_TRIP = 50


def validate_jpeg(file) -> None:
    """Photos are JPEGs of at most 10 MB. The file content is checked, not just its name."""
    if file.size > MAX_PHOTO_BYTES:
        raise ValidationError("The photo is larger than 10 MB.")
    try:
        with Image.open(file) as image:
            image_format = image.format
    except (UnidentifiedImageError, OSError):
        image_format = None
    finally:
        file.seek(0)
    if image_format != "JPEG":
        raise ValidationError("The photo must be a JPEG.")
