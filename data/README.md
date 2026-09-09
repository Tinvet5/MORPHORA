# MORPHORA atlas data — V4.7

MORPHORA keeps application code, navigation metadata, image metadata, and anatomical labels separate.

## Hierarchy

```text
Catalog → Species → System → Collection manifest → View JSON → Image + labels
```

- `catalog.json` registers species.
- `species/*.json` groups collections by anatomical system.
- `collections/*.json` registers the available views in one collection.
- `views/*.json` defines one photograph, its image sources, and its labels.

## One view per photograph

Each photograph has one view JSON file. A V4.7 Deep Zoom view uses this image schema:

```json
{
  "image": {
    "type": "dzi",
    "src": "tiles/dog-skull-lateral/dog-skull-lateral.dzi",
    "fallback": "images/lateral.jpg",
    "thumbnail": "images/thumbnails/views/dog-skull-lateral.webp",
    "width": 6000,
    "height": 4000,
    "alt": "Lateral view of a canine skull"
  }
}
```

Fields:

- `type`: `dzi` for a Deep Zoom pyramid or `image` for a normal JPG/PNG/WebP.
- `src`: primary image or DZI descriptor path.
- `fallback`: optional standard image used if a tiled source fails.
- `thumbnail`: optional optimized navigation/prefetch image.
- `width` and `height`: original source dimensions.
- `alt`: meaningful accessible description.

The old schema remains supported. When `type` is omitted, MORPHORA infers `dzi` from a `.dzi` path and otherwise treats the source as a normal image.

## Labels

```json
{
  "id": "example-structure",
  "name": "Example structure",
  "description": "Anatomical description.",
  "position": {
    "x": 0.5,
    "y": 0.5
  },
  "labelPosition": {
    "x": 0.42,
    "y": 0.44
  },
  "category": "bone-landmark",
  "status": "published"
}
```

`position` is the anatomical anchor. `labelPosition` is the optional text-box center. Both use normalized coordinates from `0` to `1`, so they remain aligned when a normal photograph is converted to Deep Zoom.

## Add a new photograph

1. Preserve the untouched master outside the public repository.
2. Place a working copy in `source-images/`.
3. Run `tools/build_deepzoom.py` or `tools/import_batch.py`.
4. Register the new view in its collection manifest.
5. Open the view in `studio.html` and author labels visually.
6. Export and replace the corresponding file in `data/views/`.
7. Run `python tools/validate_atlas.py`.
8. Test locally before pushing.

## Local development

JSON and DZI descriptors are loaded with `fetch()`. Do not open `index.html` with a `file:///` URL.

```bash
python -m http.server 5500
```

Open `http://localhost:5500`.
