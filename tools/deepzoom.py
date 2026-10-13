#!/usr/bin/env python3
"""Shared Deep Zoom generation helpers for MORPHORA.

The implementation intentionally uses Pillow instead of external native tools so
contributors can run it on Windows, macOS, or Linux with one Python dependency.
"""

from __future__ import annotations

import math
import shutil
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable
from xml.etree import ElementTree as ET

from PIL import Image, ImageOps


SUPPORTED_OUTPUT_FORMATS = {"jpg", "jpeg", "png", "webp"}


@dataclass(frozen=True)
class DeepZoomResult:
    image_id: str
    source_path: Path
    descriptor_path: Path
    tile_directory: Path
    thumbnail_path: Path | None
    fallback_path: Path | None
    width: int
    height: int
    max_level: int
    tile_count: int
    total_bytes: int


def sanitize_id(value: str) -> str:
    cleaned = "-".join(value.strip().lower().replace("_", "-").split())
    allowed = "abcdefghijklmnopqrstuvwxyz0123456789-"
    cleaned = "".join(char for char in cleaned if char in allowed)
    while "--" in cleaned:
        cleaned = cleaned.replace("--", "-")
    return cleaned.strip("-")


def _load_source(path: Path) -> Image.Image:
    if not path.exists() or not path.is_file():
        raise FileNotFoundError(f"Source image not found: {path}")

    with Image.open(path) as source:
        image = ImageOps.exif_transpose(source)
        if image.mode not in {"RGB", "RGBA"}:
            image = image.convert("RGB")
        else:
            image = image.copy()

    return image


def _prepare_for_format(image: Image.Image, output_format: str) -> Image.Image:
    if output_format in {"jpg", "jpeg"} and image.mode != "RGB":
        background = Image.new("RGB", image.size, "white")
        if "A" in image.getbands():
            background.paste(image, mask=image.getchannel("A"))
        else:
            background.paste(image)
        return background
    return image


def _save_image(image: Image.Image, destination: Path, output_format: str, quality: int) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    prepared = _prepare_for_format(image, output_format)
    format_name = "JPEG" if output_format in {"jpg", "jpeg"} else output_format.upper()
    options: dict[str, object] = {"format": format_name}

    if output_format in {"jpg", "jpeg", "webp"}:
        options["quality"] = quality
    if output_format in {"jpg", "jpeg"}:
        options.update({"optimize": True, "progressive": True, "subsampling": "4:2:0"})
    elif output_format == "png":
        options["optimize"] = True
    elif output_format == "webp":
        options["method"] = 6

    prepared.save(destination, **options)


def level_dimensions(width: int, height: int, level: int, max_level: int) -> tuple[int, int]:
    divisor = 2 ** (max_level - level)
    return max(1, math.ceil(width / divisor)), max(1, math.ceil(height / divisor))


def _tile_boxes(level_width: int, level_height: int, tile_size: int, overlap: int) -> Iterable[tuple[int, int, tuple[int, int, int, int]]]:
    columns = math.ceil(level_width / tile_size)
    rows = math.ceil(level_height / tile_size)

    for row in range(rows):
        for column in range(columns):
            left = column * tile_size
            top = row * tile_size
            right = min(left + tile_size, level_width)
            bottom = min(top + tile_size, level_height)

            if column > 0:
                left -= overlap
            if row > 0:
                top -= overlap
            if column < columns - 1:
                right += overlap
            if row < rows - 1:
                bottom += overlap

            yield column, row, (left, top, right, bottom)


def write_descriptor(path: Path, width: int, height: int, tile_size: int, overlap: int, output_format: str) -> None:
    image_element = ET.Element(
        "Image",
        {
            "TileSize": str(tile_size),
            "Overlap": str(overlap),
            "Format": "jpg" if output_format == "jpeg" else output_format,
            "xmlns": "http://schemas.microsoft.com/deepzoom/2008",
        },
    )
    ET.SubElement(image_element, "Size", {"Width": str(width), "Height": str(height)})
    path.parent.mkdir(parents=True, exist_ok=True)
    tree = ET.ElementTree(image_element)
    ET.indent(tree, space="  ")
    tree.write(path, encoding="utf-8", xml_declaration=True)


def generate_deepzoom(
    source_path: Path,
    project_root: Path,
    image_id: str,
    *,
    tile_size: int = 256,
    overlap: int = 1,
    output_format: str = "jpg",
    quality: int = 86,
    thumbnail_width: int = 640,
    thumbnail_format: str = "webp",
    thumbnail_quality: int = 82,
    create_thumbnail: bool = True,
    create_fallback: bool = True,
    fallback_quality: int = 90,
    overwrite: bool = False,
) -> DeepZoomResult:
    """Generate one Deep Zoom pyramid and optional web assets."""

    output_format = output_format.lower()
    thumbnail_format = thumbnail_format.lower()
    if output_format not in SUPPORTED_OUTPUT_FORMATS:
        raise ValueError(f"Unsupported tile format: {output_format}")
    if thumbnail_format not in SUPPORTED_OUTPUT_FORMATS:
        raise ValueError(f"Unsupported thumbnail format: {thumbnail_format}")
    if tile_size < 64:
        raise ValueError("tile_size must be at least 64 pixels")
    if overlap < 0:
        raise ValueError("overlap cannot be negative")

    normalized_id = sanitize_id(image_id)
    if not normalized_id:
        raise ValueError("The image id must contain letters or numbers")

    source_path = source_path.resolve()
    project_root = project_root.resolve()
    output_root = project_root / "tiles" / normalized_id
    descriptor_path = output_root / f"{normalized_id}.dzi"
    tile_directory = output_root / f"{normalized_id}_files"
    thumbnail_path = project_root / "images" / "thumbnails" / "views" / f"{normalized_id}.{thumbnail_format}" if create_thumbnail else None
    fallback_path = project_root / "images" / "views" / f"{normalized_id}.jpg" if create_fallback else None

    if output_root.exists():
        if not overwrite:
            raise FileExistsError(f"Deep Zoom output already exists: {output_root}. Use --overwrite to replace it.")
        shutil.rmtree(output_root)

    image = _load_source(source_path)
    width, height = image.size
    max_level = math.ceil(math.log2(max(width, height)))
    tile_count = 0

    for level in range(max_level + 1):
        level_width, level_height = level_dimensions(width, height, level, max_level)
        if (level_width, level_height) == image.size:
            level_image = image
        else:
            level_image = image.resize((level_width, level_height), Image.Resampling.LANCZOS)

        level_directory = tile_directory / str(level)
        level_directory.mkdir(parents=True, exist_ok=True)

        for column, row, box in _tile_boxes(level_width, level_height, tile_size, overlap):
            tile = level_image.crop(box)
            destination = level_directory / f"{column}_{row}.{output_format}"
            _save_image(tile, destination, output_format, quality)
            tile_count += 1

        if level_image is not image:
            level_image.close()

    write_descriptor(descriptor_path, width, height, tile_size, overlap, output_format)

    if thumbnail_path is not None:
        thumbnail = image.copy()
        thumbnail.thumbnail((thumbnail_width, max(1, round(thumbnail_width * height / width))), Image.Resampling.LANCZOS)
        _save_image(thumbnail, thumbnail_path, thumbnail_format, thumbnail_quality)
        thumbnail.close()

    if fallback_path is not None:
        _save_image(image, fallback_path, "jpg", fallback_quality)

    image.close()

    total_bytes = sum(path.stat().st_size for path in output_root.rglob("*") if path.is_file())
    if thumbnail_path and thumbnail_path.exists():
        total_bytes += thumbnail_path.stat().st_size
    if fallback_path and fallback_path.exists():
        total_bytes += fallback_path.stat().st_size

    return DeepZoomResult(
        image_id=normalized_id,
        source_path=source_path,
        descriptor_path=descriptor_path,
        tile_directory=tile_directory,
        thumbnail_path=thumbnail_path,
        fallback_path=fallback_path,
        width=width,
        height=height,
        max_level=max_level,
        tile_count=tile_count,
        total_bytes=total_bytes,
    )
