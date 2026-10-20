"""Seed photos: a real JPEG from `photos/` when there is one, otherwise a drawn placeholder, so
the seed needs no image files and no network."""

import io
import random
from pathlib import Path

from django.core.files.base import ContentFile
from PIL import Image, ImageDraw

PHOTOS = Path(__file__).parent / "photos"
SIZE = (1200, 800)

# Sky top, sky bottom, sun, land, from the colours of each kind of scene.
PALETTES = {
    "sunset": ("#2e3a87", "#f59f6b", "#ffd27a", "#3b2f4a"),
    "dusk": ("#1d2b53", "#c06c84", "#f8b195", "#2d2238"),
    "noon": ("#3a8fd9", "#bfe3ff", "#fff6c9", "#7a9a4b"),
    "green": ("#6fb1d9", "#e2f1e0", "#fff3c4", "#3f7d4e"),
    "warm": ("#e6865c", "#f8d9a0", "#fff1c1", "#a3543a"),
    "sea": ("#4aa3df", "#d8f0fb", "#fff7d6", "#1f6f8b"),
    "night": ("#0b1026", "#2c3e70", "#f2f2d0", "#141a33"),
}


def photo_file(name: str, palette: str) -> ContentFile:
    path = PHOTOS / name
    if path.exists():
        return ContentFile(path.read_bytes(), name=name)
    return ContentFile(placeholder(name, palette), name=name)


def placeholder(name: str, palette: str) -> bytes:
    """A simple landscape: a sky gradient, a sun and a line of hills. Seeded by the file name,
    so each photo looks different and the same on every run."""
    sky_top, sky_bottom, sun, land = (_rgb(colour) for colour in PALETTES[palette])
    width, height = SIZE
    image = Image.new("RGB", SIZE)
    draw = ImageDraw.Draw(image)
    for y in range(height):
        t = y / height
        draw.line([(0, y), (width, y)], fill=_mix(sky_top, sky_bottom, t))
    shapes = random.Random(name)  # noqa: S311 - pictures, not secrets
    sun_x, sun_y, radius = shapes.randint(200, 1000), shapes.randint(150, 380), 70
    draw.ellipse([sun_x - radius, sun_y - radius, sun_x + radius, sun_y + radius], fill=sun)
    for layer in range(3):
        base = int(height * (0.6 + layer * 0.12))
        points = [(0, height)]
        for x in range(0, width + 100, 100):
            points.append((x, base - shapes.randint(0, 120 - layer * 30)))
        points.append((width, height))
        draw.polygon(points, fill=_mix(land, sky_bottom, 0.4 - layer * 0.18))
    buffer = io.BytesIO()
    image.save(buffer, format="JPEG", quality=80)
    return buffer.getvalue()


def _rgb(colour: str) -> tuple[int, int, int]:
    return int(colour[1:3], 16), int(colour[3:5], 16), int(colour[5:7], 16)


def _mix(a: tuple[int, ...], b: tuple[int, ...], t: float) -> tuple[int, int, int]:
    r, g, bl = (round(x + (y - x) * t) for x, y in zip(a, b, strict=True))
    return r, g, bl
