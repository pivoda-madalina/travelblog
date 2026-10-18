import pytest
from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile

from core.tests.images import image_upload
from core.validators import validate_jpeg


def test_jpeg_is_accepted_and_left_ready_to_save():
    upload = image_upload()

    validate_jpeg(upload)

    assert upload.tell() == 0


def test_png_is_refused_even_with_a_jpg_name():
    with pytest.raises(ValidationError, match="must be a JPEG"):
        validate_jpeg(image_upload(name="cover.jpg", image_format="PNG"))


def test_file_that_is_not_an_image_is_refused():
    with pytest.raises(ValidationError, match="must be a JPEG"):
        validate_jpeg(SimpleUploadedFile("cover.jpg", b"not an image"))


def test_photo_over_10_mb_is_refused(monkeypatch):
    monkeypatch.setattr("core.validators.MAX_PHOTO_BYTES", 100)

    with pytest.raises(ValidationError, match="larger than 10 MB"):
        validate_jpeg(image_upload())
