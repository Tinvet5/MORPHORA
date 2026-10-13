from __future__ import annotations

import math
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class DziInfo:
    width: int
    height: int
    tile_size: int
    overlap: int
    format: str
    max_level: int


def parse_dzi(path: str | Path) -> DziInfo:
    path = Path(path)
    root = ET.parse(path).getroot()
    tag = root.tag.split('}')[-1]
    if tag != 'Image':
        raise ValueError(f"Expected DZI <Image> root, got <{tag}>.")
    attrs = {k.lower(): v for k, v in root.attrib.items()}
    size = next((child for child in root if child.tag.split('}')[-1] == 'Size'), None)
    if size is None:
        raise ValueError('DZI descriptor has no <Size> element.')
    size_attrs = {k.lower(): v for k, v in size.attrib.items()}
    width = int(size_attrs['width'])
    height = int(size_attrs['height'])
    tile_size = int(attrs['tilesize'])
    overlap = int(attrs.get('overlap', '0'))
    fmt = attrs.get('format', 'jpg').lower()
    if width < 1 or height < 1 or tile_size < 1:
        raise ValueError('DZI dimensions and TileSize must be positive.')
    return DziInfo(width, height, tile_size, overlap, fmt, math.ceil(math.log2(max(width, height))))


def expected_tile_root(descriptor: str | Path) -> Path:
    p = Path(descriptor)
    return p.with_name(f"{p.stem}_files")
